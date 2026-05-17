import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  /* ── Fetch public Users row ───────────────── */
  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return }
    const { data } = await supabase
      .from('Users')
      .select('*')
      .eq('UserID', authUser.id)
      .single()
    setProfile(data ?? null)
  }

  /* ── Auth state listener ──────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        await fetchProfile(u)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  /* ── Sign out ─────────────────────────────── */
  const signOut = async () => {
    await supabase.auth.signOut()
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
