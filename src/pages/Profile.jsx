import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Star, Lock, Save, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import SQL_UPDATE_USERNAME       from '../sql/profile_update_username.sql?raw'
import SQL_GET_REVIEWS           from '../sql/profile_get_reviews.sql?raw'
import SQL_GET_REVIEWER_NAMES    from '../sql/profile_get_reviewer_usernames.sql?raw'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()

  const [username,    setUsername]    = useState(profile?.username ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  // Reviews collapsible state
  const [reviews,        setReviews]        = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviews,    setShowReviews]    = useState(false)

  // Sync local state when profile is loaded asynchronously
  React.useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username)
    }
  }, [profile?.username])

  const fetchReviews = async () => {
    if (!user) return
    setReviewsLoading(true)
    try {
      console.log('[SQL] profile_get_reviews.sql:\n', SQL_GET_REVIEWS)
      const { data: revs, error: revErr } = await supabase
        .from('review')
        .select('*')
        .eq('revieweeid', user.id)
        .order('reviewdate', { ascending: false })

      if (revErr) throw revErr

      if (revs && revs.length > 0) {
        // Fetch usernames of reviewers in a single query
        const reviewerIds = [...new Set(revs.map(r => r.reviewerid))]
        console.log('[SQL] profile_get_reviewer_usernames.sql:\n', SQL_GET_REVIEWER_NAMES)
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('userid, username')
          .in('userid', reviewerIds)

        if (usersErr) throw usersErr

        const usersMap = {}
        ;(usersData ?? []).forEach(u => {
          usersMap[u.userid] = u.username
        })

        const mappedReviews = revs.map(r => ({
          ...r,
          reviewerUsername: usersMap[r.reviewerid] || 'Unknown User'
        }))
        setReviews(mappedReviews)
      } else {
        setReviews([])
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  React.useEffect(() => {
    if (showReviews && reviews.length === 0) {
      fetchReviews()
    }
  }, [showReviews])

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
    try {
      console.log('[SQL] profile_update_username.sql:\n', SQL_UPDATE_USERNAME)
      const { error: profileErr } = await Promise.race([
        supabase.from('users').update({ username: username.trim() }).eq('userid', user.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database update timed out (8s).')), 8000))
      ])

      if (profileErr) { setError(profileErr.message); setSaving(false); return }
    } catch (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    /* Update password if entered */
    if (newPassword) {
      try {
        const { error: passErr } = await Promise.race([
          supabase.auth.updateUser({ password: newPassword }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth update timed out (8s).')), 8000))
        ])
        if (passErr) { setError(passErr.message); setSaving(false); return }
        
        // Changing the password triggers a session refresh in supabase-js which deadlocks
        // any subsequent queries (like refreshProfile). To bypass this bug, we just reload.
        setNewPassword('')
        setConfirmPass('')
        setSuccess('Password updated successfully! Refreshing session...')
        setTimeout(() => window.location.reload(), 1500)
        return
      } catch (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    }

    await refreshProfile()
    setNewPassword('')
    setConfirmPass('')
    setSuccess('Profile updated successfully!')
    setSaving(false)
  }

  const rating = Number(profile?.overallrating ?? 0)

  return (
    <div className="page-container max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-navy mb-8">Profile Settings</h1>

      {/* ── Stats card ── */}
      <div className="card p-6 mb-4 flex items-center gap-5">
        <span className="avatar w-16 h-16 text-2xl shrink-0">
          {profile?.username?.slice(0, 2).toUpperCase() ?? '??'}
        </span>
        <div>
          <p className="text-lg font-bold text-gray-900">{profile?.username ?? 'Loading…'}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-1 mt-1.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
            ))}
            <span className="ml-1 text-sm text-gray-600 font-medium">{rating.toFixed(1)} overall rating</span>
          </div>
        </div>
      </div>

      {/* ── Reviews Dropdown / Collapsible ── */}
      <div className="card p-0 overflow-hidden mb-6 transition-all duration-300 border border-gray-100 shadow-sm">
        <button
          type="button"
          onClick={() => setShowReviews(!showReviews)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-current" />
            <span className="font-bold text-brand-navy text-sm">
              Reviews Left for You ({reviews.length > 0 ? reviews.length : rating > 0 ? '…' : 0})
            </span>
          </div>
          <span className="text-brand-navy text-xs font-bold hover:underline">
            {showReviews ? 'Hide Reviews ▴' : 'Show Reviews ▾'}
          </span>
        </button>

        {showReviews && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-4 max-h-[300px] overflow-y-auto bg-white animate-fade-in">
            {reviewsLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-brand-navy" />
                Loading reviews…
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                You haven't received any reviews yet. Complete swaps to get rated!
              </div>
            ) : (
              reviews.map(rev => (
                <div key={rev.reviewid} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-800">{rev.reviewerUsername}</span>
                    <span className="text-[10px] text-gray-400">{new Date(rev.reviewdate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating ? 'text-amber-400 fill-current' : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-gray-600 mt-1.5 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
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
