import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import SQL_SIGN_IN from '../sql/login_sign_in.sql?raw'

const KU_DOMAIN = '@ku.edu.tr'

export default function Login() {
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  const validateEmail = (val) => {
    if (!val.toLowerCase().endsWith(KU_DOMAIN)) {
      setError(`Only Koç University emails (ending in ${KU_DOMAIN}) are allowed.`)
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateEmail(email)) return

    setLoading(true)
    console.log('[SQL] login_sign_in.sql:\n', SQL_SIGN_IN)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-navy p-12 text-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight">Campus<span className="text-brand-crimson">Swap</span></span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-balance mb-4">
            The marketplace<br />built for KU students.
          </h1>
          <p className="text-brand-muted text-lg">
            Swap, sell, and discover items with your fellow Koç University community.
          </p>
        </div>
        <p className="text-brand-muted text-xs">© {new Date().getFullYear()} Campus-Swap · Koç University</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface animate-fade-in">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="text-3xl font-black text-brand-navy">Campus<span className="text-brand-crimson">Swap</span></span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in with your KU email to continue.</p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 animate-slide-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="login-email" className="label">KU Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@ku.edu.tr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => email && validateEmail(email)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full btn-lg"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-navy hover:text-brand-crimson transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
