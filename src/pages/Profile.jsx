import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Star, Lock, Save, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()

  const [username,    setUsername]    = useState(profile?.Username ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword && newPassword !== confirmPass) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)

    /* Update public Users table */
    const { error: profileErr } = await supabase
      .from('Users')
      .update({ Username: username.trim() })
      .eq('UserID', user.id)

    if (profileErr) { setError(profileErr.message); setSaving(false); return }

    /* Update password if entered */
    if (newPassword) {
      const { error: passErr } = await supabase.auth.updateUser({ password: newPassword })
      if (passErr) { setError(passErr.message); setSaving(false); return }
    }

    await refreshProfile()
    setNewPassword('')
    setConfirmPass('')
    setSuccess('Profile updated successfully!')
    setSaving(false)
  }

  const rating = Number(profile?.OverallRating ?? 0)

  return (
    <div className="page-container max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-navy mb-8">Profile Settings</h1>

      {/* ── Stats card ── */}
      <div className="card p-6 mb-6 flex items-center gap-5">
        <span className="avatar w-16 h-16 text-2xl shrink-0">
          {profile?.Username?.slice(0, 2).toUpperCase() ?? '??'}
        </span>
        <div>
          <p className="text-lg font-bold text-gray-900">{profile?.Username ?? 'Loading…'}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-1 mt-1.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
            ))}
            <span className="ml-1 text-sm text-gray-600 font-medium">{rating.toFixed(1)} overall rating</span>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="card p-6">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5 text-sm animate-slide-up">
            <CheckCircle className="w-4 h-4 shrink-0" />{success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Email (read-only) */}
          <div className="form-group">
            <label className="label">KU Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input value={user?.email ?? ''} readOnly className="input pl-10 bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="profile-username" className="label">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="divider" />
          <p className="text-sm font-semibold text-gray-700">Change Password <span className="font-normal text-gray-400">(optional)</span></p>

          {/* New password */}
          <div className="form-group">
            <label htmlFor="new-password" className="label">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="new-password"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input pl-10 pr-10"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label htmlFor="confirm-password" className="label">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="confirm-password"
                type={showPass ? 'text' : 'password'}
                placeholder="Repeat password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <button id="save-profile-btn" type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
