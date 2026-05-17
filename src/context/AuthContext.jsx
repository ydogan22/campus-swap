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

  /* ── Fetch public Users row ───────────────── */
  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return }
    try {
      // Column names are lowercase in PostgreSQL (unquoted DDL identifiers)
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('UserID', authUser.id)
        .single()
      if (error) console.warn('[Auth] fetchProfile error:', error.message)
      setProfile(data ?? null)
    } catch (err) {
      console.error('[Auth] fetchProfile unexpected error:', err)
      setProfile(null)
    }
  }

  /* ── Auth state listener ──────────────────── */
  useEffect(() => {
    // getSession handles the initial page-load / refresh case
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u).finally(finishLoading)
    }).catch((err) => {
      console.error('[Auth] getSession error:', err)
      finishLoading()
    })

    // onAuthStateChange handles login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        try {
          await fetchProfile(u)
        } catch (err) {
          console.error('[Auth] onAuthStateChange fetchProfile error:', err)
        } finally {
          finishLoading()   // guaranteed to run — no more stuck authLoading
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  /* ── Sign out ─────────────────────────────── */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.warn('[Auth] Server sign-out failed, forcing local cleanup:', error.message)
      // If Supabase API fails (e.g. invalid token), it might not clean up localStorage.
      // Force sweep all Supabase auth keys so the user isn't stuck.
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
    }

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

