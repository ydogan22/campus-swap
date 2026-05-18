import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Guard so we only call setLoading(false) once (getSession and
  // onAuthStateChange can both fire on page load — first one wins).
  const loadingDone = useRef(false)
  const finishLoading = () => {
    if (!loadingDone.current) {
      loadingDone.current = true
      setLoading(false)
    }
  }

  const isFetchingRef = useRef(false)

  /* ── Fetch public Users row ───────────────── */
  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return }
    if (isFetchingRef.current) return // Prevent concurrent fetch deadlock
    
    isFetchingRef.current = true
    try {
      // Column names are lowercase in PostgreSQL (unquoted DDL identifiers)
      const { data, error } = await Promise.race([
        supabase.from('users').select('*').eq('userid', authUser.id).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('fetchProfile timed out')), 8000))
      ])
        
      if (error) {
        console.warn('[Auth] fetchProfile error:', error.message)
        // If PGRST116 (0 rows), user was deleted from DB but session remains. Force sign out.
        if (error.code === 'PGRST116') {
          console.error('[Auth] User not found in DB. Forcing sign out.')
          signOut()
          return
        }
      }
      setProfile(data ?? null)
    } catch (err) {
      console.error('[Auth] fetchProfile unexpected error:', err)
      setProfile(null)
    } finally {
      isFetchingRef.current = false
    }
  }

  /* ── Auth state listener ──────────────────── */
  useEffect(() => {
    // Failsafe: force finish loading after 5 seconds if Supabase hangs
    const timer = setTimeout(() => finishLoading(), 5000)

    // Helper to handle session
    const handleSession = async (session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await fetchProfile(u)
      } else {
        setProfile(null)
      }
      finishLoading()
    }

    // getSession handles the initial page-load / refresh case
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    }).catch((err) => {
      console.error('[Auth] getSession error:', err)
      finishLoading()
    })

    // onAuthStateChange handles login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session)
      }
    )
    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  /* ── Sign out ─────────────────────────────── */
  const signOut = async () => {
    // Fire network request but don't await it in case it hangs
    supabase.auth.signOut().catch(err => {
      console.warn('[Auth] Server sign-out failed:', err.message)
    })
    
    // Force local cleanup immediately so UI responds
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    })

    setUser(null)
    setProfile(null)
  }

  /* ── Refresh profile (call after edits) ───── */
  const refreshProfile = () => fetchProfile(user)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

