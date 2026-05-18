import React, { useState } from 'react'
import { X, Star, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function ReviewModal({ isOpen, onClose, revieweeId, revieweeName, offerId, reviewerId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: dbErr } = await supabase.from('review').insert({
        reviewerid: reviewerId,
        revieweeid: revieweeId,
        offerid: offerId,
        rating: rating,
        comment: comment.trim() || null
      })

      if (dbErr) throw dbErr
      
      onReviewSubmitted()
      onClose()
    } catch (err) {
      console.error('Submit review error:', err)
      setError('Failed to submit review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-brand-navy">Rate your experience</h2>
            <p className="text-sm text-gray-500 mt-0.5">Leave a review for <span className="font-semibold text-gray-700">{revieweeName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      (hoverRating || rating) >= star 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'fill-transparent text-gray-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <span className="text-sm font-medium text-gray-400">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
              {rating === 0 && "Select a rating"}
            </span>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Write a comment (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="How was the communication? Was the item as described?"
              className="input resize-none bg-gray-50 focus:bg-white text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="btn-primary w-full py-2.5 rounded-xl disabled:opacity-50 font-semibold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  )
}
