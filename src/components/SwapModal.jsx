import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { MapPin, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function SwapModal({ productId, onClose, onSuccess }) {
  const { user } = useAuth()

  const [meetingPoint, setMeetingPoint] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [done,         setDone]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!meetingPoint.trim()) { setError('Please enter a meeting point.'); return }
    setLoading(true)
    setError('')

    /* Insert SwapOffer */
    const { error: offerErr } = await supabase
      .from('SwapOffer')
      .insert({
        TargetProductID: productId,
        OffererID:       user.id,
        MeetingPoint:    meetingPoint.trim(),
        OfferStatus:     'Pending',
      })

    if (offerErr) { setError(offerErr.message); setLoading(false); return }

    /* Update Product Status → Pending */
    const { error: updateErr } = await supabase
      .from('Product')
      .update({ Status: 'Pending' })
      .eq('ProductID', productId)

    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    setLoading(false)
    setDone(true)
    if (onSuccess) setTimeout(onSuccess, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md card shadow-card-hover animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-navy flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Propose Swap & Meet</h2>
              <p className="text-xs text-gray-500">Suggest a meeting point on campus</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
              <CheckCircle className="w-14 h-14 text-green-500" />
              <p className="font-semibold text-gray-900 text-center">Swap offer sent!</p>
              <p className="text-sm text-gray-500 text-center">
                The seller has been notified. The product is now marked as <strong>Pending</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-brand-light border border-brand-navy/10 rounded-xl p-4 text-sm text-brand-navy">
                <strong>How it works:</strong> You propose a meeting point on campus. Once the seller accepts, 
                the swap is confirmed and the item is marked as Pending.
              </div>

              <div className="form-group">
                <label htmlFor="meeting-point" className="label">
                  Meeting Point <span className="text-brand-crimson">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="meeting-point"
                    type="text"
                    placeholder="e.g. Main Library Entrance, SCI Building Lobby…"
                    value={meetingPoint}
                    onChange={e => setMeetingPoint(e.target.value)}
                    className="input pl-10"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Choose a specific, easy-to-find campus location.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                <button
                  id="swap-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {loading ? 'Submitting…' : 'Send Offer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
