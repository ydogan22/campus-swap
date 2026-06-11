import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import SQL_SIGN_UP       from '../sql/register_sign_up.sql?raw'
import SQL_INSERT_USER   from '../sql/register_insert_user.sql?raw'

const KU_DOMAIN = '@ku.edu.tr'

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [showPass,  setShowPass]  = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [loading,   setLoading]   = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    if (!form.email.toLowerCase().endsWith(KU_DOMAIN))
      return `Only Koç University emails (ending in ${KU_DOMAIN}) are allowed.`
    if (!form.username.trim() || form.username.length < 3)
      return 'Username must be at least 3 characters.'
    if (form.password.length < 8)
      return 'Password must be at least 8 characters.'
    if (form.password !== form.confirm)
      return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)

    try {
      /* 1. Create Supabase Auth user */
      console.log('[SQL] register_sign_up.sql:\n', SQL_SIGN_UP)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      /* 2. Insert into public Users table */
      const userId = data.user?.id
      if (userId) {
        console.log('[SQL] register_insert_user.sql:\n', SQL_INSERT_USER)
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            userid:        userId,
            kumail:        form.email,
            username:      form.username.trim(),
            passwordhash:  'supabase-auth',
            overallrating: 0,
          }, { onConflict: 'userid' })
        if (insertError) {
          // If RLS blocks it, we might still have created the auth user.
          setError('Auth succeeded, but profile creation failed: ' + insertError.message)
          return
        }
      }

      setSuccess(true)
    } catch (err) {
      console.error('[Register] Unexpected exception:', err)
      setError('An unexpected error occurred: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8 animate-fade-in">
        <div className="card p-10 max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Check your inbox!</h2>
          <p className="text-gray-500 text-sm">
            We've sent a confirmation link to <strong>{form.email}</strong>.
            Please verify your email before signing in.
          </p>
          <Link to="/login" className="btn-primary btn-lg inline-flex mt-2">Go to Login</Link>
        </div>
      </div>
    )
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
            Join 10,000+<br />KU students.
          </h1>
          <p className="text-brand-muted text-lg">
            List your items, find great deals, and arrange campus meetups.
          </p>
          <ul className="mt-6 space-y-2 text-brand-muted text-sm">
            {['Free to use', 'KU-verified community', 'Real-time messaging', 'Swap or sell'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-brand-muted text-xs">© {new Date().getFullYear()} Campus-Swap · Koç University</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface animate-fade-in overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="text-3xl font-black text-brand-navy">Campus<span className="text-brand-crimson">Swap</span></span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-8">Use your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">@ku.edu.tr</code> email to join.</p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 animate-slide-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="reg-email" className="label">KU Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="reg-email" type="email" autoComplete="email"
                  placeholder="yourname@ku.edu.tr"
                  value={form.email} onChange={set('email')}
                  className="input pl-10" required
                />
              </div>
            </div>

            {/* Username */}
            <div className="form-group">
              <label htmlFor="reg-username" className="label">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="reg-username" type="text" autoComplete="username"
                  placeholder="e.g. john_koc"
                  value={form.username} onChange={set('username')}
                  className="input pl-10" required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="reg-password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="reg-password" type={showPass ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')}
                  className="input pl-10 pr-10" required
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div className="form-group">
              <label htmlFor="reg-confirm" className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="reg-confirm" type={showPass ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Repeat password"
                  value={form.confirm} onChange={set('confirm')}
                  className="input pl-10" required
                />
              </div>
            </div>

            <button id="register-submit" type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-navy hover:text-brand-crimson transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
