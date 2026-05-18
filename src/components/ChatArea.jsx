import React, { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import SwapModal from './SwapModal'
import {
  Send, Paperclip, X, Image as ImageIcon, Loader2,
  Lock, MapPin, CheckCheck, AlertCircle, Star
} from 'lucide-react'
import ReviewModal from './ReviewModal'

const BUCKET = 'product-photos'

export default function ChatArea({ conversation }) {
  /* conversation = { productId, sellerId, sellerUsername, productTitle, buyerId } */
  const { user } = useAuth()

  const [messages,       setMessages]       = useState([])
  const [swapOffer,      setSwapOffer]      = useState(null)
  const [productStatus,  setProductStatus]  = useState('Available')
  const [hasReviewed,    setHasReviewed]    = useState(false)
  const [reviewModal,    setReviewModal]    = useState(false)
  const [text,           setText]           = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [sending,        setSending]        = useState(false)
  const [imageFile,      setImageFile]      = useState(null)
  const [imagePreview,   setImagePreview]   = useState(null)
  const [restricted,     setRestricted]     = useState(false)  // one-time message lock
  const [swapModal,      setSwapModal]      = useState(false)
  const [error,          setError]          = useState('')

  const bottomRef  = useRef(null)
  const fileRef    = useRef(null)
  const channelRef = useRef(null)

  const isSeller = user?.id === conversation?.sellerId

  /* ── Load message history & Swap offer ── */
  const loadData = useCallback(async () => {
    if (!conversation) return
    const { productId, sellerId, buyerId } = conversation

    const [msgsRes, offerRes, prodRes] = await Promise.all([
      supabase
        .from('message')
        .select('messageid, senderid, receiverid, content, photourl, sentat, isread')
        .eq('productid', productId)
        .or(`and(senderid.eq.${sellerId},receiverid.eq.${buyerId}),and(senderid.eq.${buyerId},receiverid.eq.${sellerId})`)
        .order('sentat', { ascending: true }),
      
      supabase
        .from('swapoffer')
        .select('*')
        .eq('targetproductid', productId)
        .order('offerid', { ascending: false }),

      supabase
        .from('product')
        .select('status')
        .eq('productid', productId)
        .single()
    ])

    setMessages(msgsRes.data ?? [])
    setProductStatus(prodRes.data?.status || 'Available')

    // Filter the offer in JS to be bulletproof against null receiverid
    const offers = offerRes.data ?? []
    const relevantOffer = offers.find(o => 
      (o.offererid === sellerId && o.receiverid === buyerId) || 
      (o.offererid === buyerId && o.receiverid === sellerId) ||
      (o.offererid === buyerId && !o.receiverid) // Fallback if receiverid is null in DB
    )
    setSwapOffer(relevantOffer || null)

    // Check if user has already reviewed this specific swap offer
    if (relevantOffer) {
      const { data: revData } = await supabase
        .from('review')
        .select('reviewid')
        .eq('offerid', relevantOffer.offerid)
        .eq('reviewerid', user.id)
        .maybeSingle()
      setHasReviewed(!!revData)
    } else {
      setHasReviewed(false)
    }
    
    return msgsRes.data ?? []
  }, [conversation])

  /* ── Check one-time restriction ── */
  const checkRestriction = useCallback(async (msgs) => {
    if (!conversation || isSeller) { setRestricted(false); return }

    const { productId, sellerId, buyerId } = conversation

    // Has buyer sent any message?
    const buyerSent = msgs.some(m => m.senderid === buyerId)
    if (!buyerSent) { setRestricted(false); return }

    // Has seller replied?
    const sellerReplied = msgs.some(m => m.senderid === sellerId)
    setRestricted(!sellerReplied)
  }, [conversation, isSeller])

  /* ── Initial load + realtime subscription ── */
  useEffect(() => {
    if (!conversation) return

    loadData().then(msgs => {
      checkRestriction(msgs ?? [])
    })

    /* Unsubscribe from previous channels */
    if (channelRef.current) {
      channelRef.current.forEach(c => supabase.removeChannel(c))
    }

    /* Channel 1: Messages */
    const msgChannel = supabase
      .channel(`msg-room-${conversation.productId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message', filter: `productid=eq.${conversation.productId}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.messageid === payload.new.messageid)) return prev
            const next = [...prev, payload.new]
            checkRestriction(next)
            return next
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'message', filter: `productid=eq.${conversation.productId}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.messageid === payload.new.messageid ? payload.new : m))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('Message channel subscribed!')
      })

    /* Channel 2: Swap Offers */
    const offerChannel = supabase
      .channel(`offer-room-${conversation.productId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'swapoffer', filter: `targetproductid=eq.${conversation.productId}` },
        (payload) => {
          const { sellerId, buyerId } = conversation
          const o = payload.new
          if (
            (o.offererid === sellerId && o.receiverid === buyerId) || 
            (o.offererid === buyerId && o.receiverid === sellerId) ||
            (o.offererid === buyerId && !o.receiverid)
          ) {
            setSwapOffer(o)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'swapoffer', filter: `targetproductid=eq.${conversation.productId}` },
        (payload) => {
          const { sellerId, buyerId } = conversation
          const o = payload.new
          if (
            (o.offererid === sellerId && o.receiverid === buyerId) || 
            (o.offererid === buyerId && o.receiverid === sellerId) ||
            (o.offererid === buyerId && !o.receiverid)
          ) {
            setSwapOffer(o)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('Offer channel subscribed!')
      })

    /* Channel 3: Product updates */
    const prodChannel = supabase
      .channel(`prod-room-${conversation.productId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'product', filter: `productid=eq.${conversation.productId}` },
        (payload) => {
          setProductStatus(payload.new.status)
        }
      )
      .subscribe()

    channelRef.current = [msgChannel, offerChannel, prodChannel]
    
    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(offerChannel)
      supabase.removeChannel(prodChannel)
    }
  }, [conversation, loadData, checkRestriction])

  /* ── Auto mark as read ── */
  useEffect(() => {
    if (!user || messages.length === 0) return
    const unreadIds = messages.filter(m => m.isread === false && m.receiverid === user.id).map(m => m.messageid)
    
    if (unreadIds.length > 0) {
      supabase.from('message').update({ isread: true }).in('messageid', unreadIds).then(() => {
        setMessages(prev => prev.map(m => unreadIds.includes(m.messageid) ? { ...m, isread: true } : m))
      })
    }
  }, [messages, user])

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Image picker ── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  /* ── Send message ── */
  const handleSend = async (e) => {
    e.preventDefault()
    if ((!text.trim() && !imageFile) || restricted) return

    setSending(true)
    setError('')

    let photoUrl = null

    /* Upload image if attached */
    if (imageFile) {
      setUploading(true)
      const ext  = imageFile.name.split('.').pop()
      const path = `messages/${Date.now()}_${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, imageFile)
      if (upErr) { setError('Image upload failed: ' + upErr.message); setUploading(false); setSending(false); return }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      photoUrl = urlData.publicUrl
      setUploading(false)
    }

    const receiverId = isSeller ? conversation.buyerId : conversation.sellerId

    const { error: msgErr } = await supabase.from('message').insert({
      senderid:   user.id,
      receiverid: receiverId,
      productid:  conversation.productId,
      content:    text.trim() || null,
      photourl:   photoUrl,
      sentat:     new Date().toISOString(),
    })

    if (msgErr) { setError(msgErr.message) }
    else {
      setText('')
      clearImage()
    }
    setSending(false)
  }

  /* ── Swap Offer Actions ── */
  const handleOfferAction = async (offerId, newStatus) => {
    try {
      let newProductStatus = null
      let newOfferStatus = newStatus

      if (newStatus === 'Sold') {
        newProductStatus = 'Sold'
        newOfferStatus = 'Completed'
      } else if (newStatus === 'Accepted') {
        newProductStatus = 'Pending' // UI displays this as Proposed
      } else if (newStatus === 'Canceled' || newStatus === 'Declined') {
        newProductStatus = 'Available'
      }

      const { error: offerErr } = await supabase
        .from('swapoffer')
        .update({ offerstatus: newOfferStatus })
        .eq('offerid', offerId)
        
      if (offerErr) throw offerErr

      // Optimistically update the UI immediately
      setSwapOffer(prev => prev && prev.offerid === offerId ? { ...prev, offerstatus: newOfferStatus } : prev)

      // Only update product status if it's changing
      if (newProductStatus) {
        const { error: prodErr } = await supabase
          .from('product')
          .update({ status: newProductStatus })
          .eq('productid', conversation.productId)
          
        if (prodErr) throw prodErr
      }
    } catch (err) {
      alert('Failed to update offer: ' + err.message)
    }
  }

  /* ── Format time ── */
  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isSold = productStatus === 'Sold'
  const hasActiveOffer = swapOffer && ['Pending', 'Accepted', 'Completed'].includes(swapOffer.offerstatus)

  if (!conversation) return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto">
          <Send className="w-7 h-7 text-brand-muted" />
        </div>
        <p className="font-medium text-gray-600">Select a conversation</p>
        <p className="text-sm">Choose a chat from the list or start a new one from a product page.</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="shrink-0 px-5 py-4 border-b border-surface-border bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="avatar w-9 h-9 text-sm shrink-0">
            {conversation.sellerUsername?.slice(0, 2).toUpperCase() ?? '??'}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{conversation.sellerUsername}</p>
            <p className="text-xs text-gray-400 truncate">re: {conversation.productTitle}</p>
          </div>
        </div>
        <button
          id="propose-swap-btn"
          onClick={() => setSwapModal(true)}
          disabled={!user || hasActiveOffer || isSold}
          title={isSold ? "Product is already sold" : hasActiveOffer ? "An offer is already active or completed" : "Suggest a meeting point"}
          className="btn-outline btn-sm shrink-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:text-gray-400"
        >
          <MapPin className="w-3.5 h-3.5" />
          Propose Swap &amp; Meet
        </button>
      </div>

      {/* ── Swap Offer Banner ── */}
      {swapOffer && (
        <div className="shrink-0 bg-white border-b border-surface-border px-5 py-3 shadow-sm z-10 relative animate-fade-in">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-navy" />
              <h3 className="font-semibold text-gray-900 text-sm">
                Swap Offer: {swapOffer.meetingpoint}
              </h3>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ml-auto ${
                swapOffer.offerstatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                swapOffer.offerstatus === 'Accepted' ? 'bg-green-100 text-green-800' :
                swapOffer.offerstatus === 'Completed' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {swapOffer.offerstatus}
              </span>
            </div>
            
            <p className="text-xs text-gray-500">
              Proposed by <strong className="text-gray-700">{swapOffer.offererid === user?.id ? 'You' : conversation.otherUsername}</strong>
            </p>
            
            {swapOffer.offerstatus === 'Pending' && swapOffer.receiverid === user?.id && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleOfferAction(swapOffer.offerid, 'Accepted')} className="btn-primary btn-sm flex-1">Accept</button>
                <button onClick={() => handleOfferAction(swapOffer.offerid, 'Declined')} className="btn-outline btn-sm flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">Decline</button>
              </div>
            )}

            {swapOffer.offerstatus === 'Pending' && swapOffer.offererid === user?.id && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleOfferAction(swapOffer.offerid, 'Withdrawn')} className="btn-outline btn-sm flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">Cancel Request</button>
              </div>
            )}

            {swapOffer.offerstatus === 'Accepted' && (
              <div className="flex gap-2 mt-2">
                {isSeller && (
                  <button onClick={() => handleOfferAction(swapOffer.offerid, 'Sold')} className="btn-primary btn-sm flex-1 bg-green-600 hover:bg-green-700 border-none">Mark as Sold</button>
                )}
                <button onClick={() => handleOfferAction(swapOffer.offerid, 'Canceled')} className="btn-outline btn-sm flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">Cancel Offer</button>
              </div>
            )}

            {(swapOffer.offerstatus === 'Completed' || swapOffer.offerstatus === 'Canceled') && !hasReviewed && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                <button onClick={() => setReviewModal(true)} className="btn-primary btn-sm flex-1 bg-yellow-500 hover:bg-yellow-600 border-none text-white shadow-md flex items-center justify-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" /> Leave a Review
                </button>
              </div>
            )}

            {(swapOffer.offerstatus === 'Completed' || swapOffer.offerstatus === 'Canceled') && hasReviewed && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                <div className="text-xs text-green-700 font-medium bg-green-50 w-full text-center py-1.5 rounded-lg border border-green-200 flex items-center justify-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> You reviewed this swap
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-surface">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
            <p className="text-sm">No messages yet. Say hi! 👋</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderid === user?.id
          return (
            <div key={msg.messageid}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm
                ${isMe
                  ? 'bg-brand-navy text-white rounded-br-sm'
                  : 'bg-white text-gray-800 border border-surface-border rounded-bl-sm'
                }`}
              >
                {msg.photourl && (
                  <a href={msg.photourl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.photourl}
                      alt="attachment"
                      className="rounded-xl mb-2 max-w-full max-h-64 object-cover"
                    />
                  </a>
                )}
                {msg.content && (
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                    {fmt(msg.sentat)}
                  </span>
                  {isMe && (
                    msg.isread ? <CheckCheck className="w-3.5 h-3.5 text-blue-300" /> : <CheckCheck className="w-3 h-3 text-white/50" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Restriction notice ── */}
      {restricted && (
        <div className="shrink-0 mx-5 mb-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 animate-slide-up">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Waiting for the seller to reply before you can send more messages.</span>
        </div>
      )}

      {/* ── Image preview ── */}
      {imagePreview && (
        <div className="shrink-0 mx-5 mb-2 relative inline-block w-fit">
          <img src={imagePreview} alt="preview" className="h-20 rounded-xl object-cover border border-surface-border" />
          <button onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 mx-5 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Input bar ── */}
      <form
        onSubmit={handleSend}
        className="shrink-0 px-4 py-3 border-t border-surface-border bg-white flex items-end gap-2"
      >
        {/* Image attach */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={restricted || isSold}
          className="btn-ghost p-2 rounded-xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Attach image"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <textarea
          id="chat-input"
          rows={1}
          placeholder={isSold ? 'Product is sold. Chat is closed.' : restricted ? 'Waiting for seller to reply…' : 'Type a message…'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
          }}
          disabled={restricted || isSold}
          className="input flex-1 resize-none py-2.5 min-h-[42px] max-h-32 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
          style={{ overflowY: 'auto' }}
        />

        {/* Send */}
        <button
          id="send-message-btn"
          type="submit"
          disabled={restricted || sending || isSold || (!text.trim() && !imageFile)}
          className="btn-primary p-2.5 rounded-xl shrink-0 disabled:opacity-40"
        >
          {sending || uploading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </button>
      </form>

      {/* ── Swap Modal ── */}
      {swapModal && (
        <SwapModal
          productId={conversation.productId}
          receiverId={isSeller ? conversation.buyerId : conversation.sellerId}
          onClose={() => setSwapModal(false)}
          onSuccess={() => setSwapModal(false)}
        />
      )}

      {/* ── Review Modal ── */}
      {reviewModal && swapOffer && (
        <ReviewModal
          isOpen={reviewModal}
          onClose={() => setReviewModal(false)}
          revieweeId={isSeller ? conversation.buyerId : conversation.sellerId}
          revieweeName={conversation.otherUsername}
          offerId={swapOffer.offerid}
          reviewerId={user.id}
          onReviewSubmitted={() => {
            setHasReviewed(true)
          }}
        />
      )}
    </div>
  )
}
