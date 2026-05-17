import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  Star, Eye, ArrowLeft, Tag, ChevronLeft, ChevronRight,
  MessageSquare, Loader2, AlertCircle, User2, ZoomIn,
} from 'lucide-react'

const CONDITION_STYLE = {
  New: 'badge-green', 'Like New': 'badge-blue',
  Good: 'badge-yellow', Fair: 'badge-gray', Poor: 'badge-red',
}
const STATUS_STYLE = {
  Available: 'badge-green', Pending: 'badge-yellow', Sold: 'badge-gray',
}
const PLACEHOLDER = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=60'

export default function ProductDetail() {
  const { productId } = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuth()

  const [product,   setProduct]   = useState(null)
  const [photos,    setPhotos]    = useState([])
  const [photoIdx,  setPhotoIdx]  = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [lightbox,  setLightbox]  = useState(false)

  /* ── Fetch ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data, error: err } = await supabase
        .from('Product')
        .select(`
          ProductID, Title, Description, ItemCondition, Status, ViewCount,
          CategoryID,
          Users!Product_OwnerID_fkey ( UserID, Username, OverallRating ),
          Category ( CategoryName ),
          ProductPhoto ( PhotoID, PhotoURL )
        `)
        .eq('ProductID', productId)
        .single()

      if (err || !data) { setError('Product not found.'); setLoading(false); return }

      setProduct(data)
      setPhotos(data.ProductPhoto ?? [])

      /* Increment view count */
      await supabase
        .from('Product')
        .update({ ViewCount: (data.ViewCount ?? 0) + 1 })
        .eq('ProductID', productId)

      setLoading(false)
    }
    load()
  }, [productId])

  /* ── Keyboard nav for lightbox ── */
  useEffect(() => {
    if (!lightbox) return
    const handler = (e) => {
      if (e.key === 'ArrowRight') setPhotoIdx(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft')  setPhotoIdx(i => (i - 1 + photos.length) % photos.length)
      if (e.key === 'Escape')     setLightbox(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, photos.length])

  const handleContact = () => {
    if (!user) { navigate('/login'); return }
    navigate(`/messages?productId=${productId}&sellerId=${product.Users?.UserID}`)
  }

  /* ── Stars render ── */
  const Stars = ({ rating }) => {
    const r = Number(rating) || 0
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star key={i}
            className={`w-4 h-4 ${i <= Math.round(r) ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1.5 text-sm font-medium text-gray-700">{r.toFixed(1)}</span>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-brand-navy" />
    </div>
  )

  if (error) return (
    <div className="page-container flex flex-col items-center gap-4 py-24 text-gray-500">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-base font-medium">{error}</p>
      <button onClick={() => navigate(-1)} className="btn-outline btn-sm">Go back</button>
    </div>
  )

  const currentPhoto = photos[photoIdx]?.PhotoURL ?? PLACEHOLDER
  const isSeller     = user?.id === product.Users?.UserID
  const isAvailable  = product.Status === 'Available'

  return (
    <div className="page-container animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="btn-ghost btn-sm mb-6 flex items-center gap-1.5 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* ── Photo carousel ── */}
        <div>
          <div
            className="relative aspect-[4/3] rounded-xl2 overflow-hidden bg-gray-100 cursor-zoom-in group"
            onClick={() => setLightbox(true)}
          >
            <img
              src={currentPhoto}
              alt={product.Title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={e => { e.target.src = PLACEHOLDER }}
            />
            <div className="absolute top-3 right-3 bg-black/40 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4" />
            </div>
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length) }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i + 1) % photos.length) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {/* Dot indicators */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setPhotoIdx(i) }}
                    className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {photos.map((ph, i) => (
                <button key={ph.PhotoID} onClick={() => setPhotoIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                    ${i === photoIdx ? 'border-brand-navy' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={ph.PhotoURL} alt="" className="w-full h-full object-cover"
                    onError={e => { e.target.src = PLACEHOLDER }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="flex flex-col gap-5">
          {/* Status + Category */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={STATUS_STYLE[product.Status] ?? 'badge-gray'}>{product.Status}</span>
            {product.Category?.CategoryName && (
              <span className="badge badge-blue">
                <Tag className="w-2.5 h-2.5" />{product.Category.CategoryName}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto text-xs text-gray-400">
              <Eye className="w-3.5 h-3.5" /> {product.ViewCount ?? 0} views
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{product.Title}</h1>

          {/* Condition */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Condition:</span>
            <span className={CONDITION_STYLE[product.ItemCondition] ?? 'badge-gray'}>
              {product.ItemCondition}
            </span>
          </div>

          {/* Description */}
          {product.Description && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-1.5">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.Description}
              </p>
            </div>
          )}

          {/* Seller card */}
          <div className="card p-4 flex items-center gap-4">
            <span className="avatar w-12 h-12 text-base shrink-0">
              {product.Users?.Username?.slice(0, 2).toUpperCase() ?? '??'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Listed by</p>
              <p className="font-semibold text-gray-900 truncate">{product.Users?.Username ?? 'Unknown'}</p>
              <Stars rating={product.Users?.OverallRating} />
            </div>
            <User2 className="w-5 h-5 text-gray-300 shrink-0" />
          </div>

          {/* CTA */}
          {!isSeller && (
            <button
              id="start-conversation-btn"
              onClick={handleContact}
              disabled={!isAvailable}
              className="btn-crimson btn-lg w-full mt-auto"
            >
              <MessageSquare className="w-5 h-5" />
              {isAvailable ? 'I\'m Interested — Start Conversation' : 'This item is no longer available'}
            </button>
          )}
          {isSeller && (
            <div className="p-4 bg-brand-light rounded-xl text-sm text-brand-navy font-medium text-center">
              This is your listing.
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          <img
            src={currentPhoto}
            alt={product.Title}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-3 transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i + 1) % photos.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-3 transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light">✕</button>
        </div>
      )}
    </div>
  )
}
