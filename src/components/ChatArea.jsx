import React, { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import SwapModal from './SwapModal'
import {
  Send, Paperclip, X, Image as ImageIcon, Loader2,
  Lock, MapPin, CheckCheck, AlertCircle,
} from 'lucide-react'

const BUCKET = 'product-photos'

export default function ChatArea({ conversation }) {
  /* conversation = { productId, sellerId, sellerUsername, productTitle, buyerId } */
  const { user } = useAuth()

  const [messages,       setMessages]       = useState([])
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

  /* ── Load message history ── */
  const loadMessages = useCallback(async () => {
    if (!conversation) return
    const { productId, sellerId, buyerId } = conversation

    const { data } = await supabase
      .from('Message')
      .select('MessageID, SenderID, Content, PhotoURL, SentAt')
      .eq('ProductID', productId)
      .or(`and(SenderID.eq.${sellerId},ReceiverID.eq.${buyerId}),and(SenderID.eq.${buyerId},ReceiverID.eq.${sellerId})`)
      .order('SentAt', { ascending: true })

    setMessages(data ?? [])
    return data ?? []
  }, [conversation])

  /* ── Check one-time restriction ── */
  const checkRestriction = useCallback(async (msgs) => {
    if (!conversation || isSeller) { setRestricted(false); return }

    const { productId, sellerId, buyerId } = conversation

    // Has buyer sent any message?
    const buyerSent = msgs.some(m => m.SenderID === buyerId)
    if (!buyerSent) { setRestricted(false); return }

    // Has seller replied?
    const sellerReplied = msgs.some(m => m.SenderID === sellerId)
    setRestricted(!sellerReplied)
  }, [conversation, isSeller])

  /* ── Initial load + realtime subscription ── */
  useEffect(() => {
    if (!conversation) return

    loadMessages().then(msgs => checkRestriction(msgs ?? []))

    /* Unsubscribe from previous channel */
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`messages-${conversation.productId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `ProductID=eq.${conversation.productId}`,
        },
        (payload) => {
          setMessages(prev => {
            const exists = prev.some(m => m.MessageID === payload.new.MessageID)
            if (exists) return prev
            const next = [...prev, payload.new]
            checkRestriction(next)
            return next
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [conversation])

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

    const { error: msgErr } = await supabase.from('Message').insert({
      SenderID:   user.id,
      ReceiverID: receiverId,
      ProductID:  conversation.productId,
      Content:    text.trim() || null,
      PhotoURL:   photoUrl,
      SentAt:     new Date().toISOString(),
    })

    if (msgErr) { setError(msgErr.message) }
    else {
      setText('')
      clearImage()
    }
    setSending(false)
  }

  /* ── Format time ── */
  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

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
          className="btn-outline btn-sm shrink-0 flex items-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5" />
          Propose Swap &amp; Meet
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-surface">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
            <p className="text-sm">No messages yet. Say hi! 👋</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.SenderID === user?.id
          return (
            <div key={msg.MessageID}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm
                ${isMe
                  ? 'bg-brand-navy text-white rounded-br-sm'
                  : 'bg-white text-gray-800 border border-surface-border rounded-bl-sm'
                }`}
              >
                {msg.PhotoURL && (
                  <a href={msg.PhotoURL} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.PhotoURL}
                      alt="attachment"
                      className="rounded-xl mb-2 max-w-full max-h-64 object-cover"
                    />
                  </a>
                )}
                {msg.Content && (
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.Content}</p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                    {fmt(msg.SentAt)}
                  </span>
                  {isMe && <CheckCheck className="w-3 h-3 text-white/60" />}
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
          disabled={restricted}
          className="btn-ghost p-2 rounded-xl shrink-0 disabled:opacity-40"
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
          placeholder={restricted ? 'Waiting for seller to reply…' : 'Type a message…'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
          }}
          disabled={restricted}
          className="input flex-1 resize-none py-2.5 min-h-[42px] max-h-32 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
          style={{ overflowY: 'auto' }}
        />

        {/* Send */}
        <button
          id="send-message-btn"
          type="submit"
          disabled={restricted || sending || (!text.trim() && !imageFile)}
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
          onClose={() => setSwapModal(false)}
          onSuccess={() => setSwapModal(false)}
        />
      )}
    </div>
  )
}
