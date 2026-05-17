import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import ChatArea from '../components/ChatArea'
import { MessageSquare, Loader2, Search } from 'lucide-react'

export default function Messages() {
  const { user }         = useAuth()
  const [searchParams]   = useSearchParams()

  const initProductId = searchParams.get('productId')
  const initSellerId  = searchParams.get('sellerId')

  const [conversations, setConversations] = useState([])
  const [selected,      setSelected]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [convSearch,    setConvSearch]    = useState('')

  /* ── Build conversation list from messages ── */
  useEffect(() => {
    if (!user) return

    const load = async () => {
      setLoading(true)
      try {
        /* All messages where I am sender or receiver */
        const { data: msgs } = await supabase
          .from('Message')
          .select('MessageID, SenderID, ReceiverID, ProductID, Content, PhotoURL, SentAt')
          .or(`SenderID.eq.${user.id},ReceiverID.eq.${user.id}`)
          .order('SentAt', { ascending: false })

        /* Group by ProductID + other party */
        const convMap = new Map()
        for (const msg of msgs ?? []) {
          const otherId  = msg.SenderID === user.id ? msg.ReceiverID : msg.SenderID
          const key      = `${msg.ProductID}-${otherId}`
          if (!convMap.has(key)) convMap.set(key, { productId: msg.ProductID, otherId, lastMsg: msg })
        }

        /* Enrich with product + user info */
        const enriched = await Promise.all(
          [...convMap.values()].map(async (c) => {
            const [{ data: prod }, { data: other }] = await Promise.all([
              supabase.from('Product').select('Title, OwnerID').eq('ProductID', c.productId).single(),
              supabase.from('Users').select('Username').eq('UserID', c.otherId).single(),
            ])
            const sellerId = prod?.OwnerID
            const buyerId  = sellerId === user.id ? c.otherId : user.id
            return {
              ...c,
              productTitle:    prod?.Title ?? 'Unknown product',
              sellerId,
              buyerId,
              sellerUsername:  sellerId === user.id ? (await supabase.from('Users').select('Username').eq('UserID', buyerId).single()).data?.Username : other?.Username,
              otherUsername:   other?.Username ?? 'Unknown',
            }
          })
        )

        setConversations(enriched)

        /* Auto-select from URL params */
        if (initProductId && initSellerId) {
          const match = enriched.find(
            c => String(c.productId) === initProductId && c.sellerId === initSellerId
          )
          if (match) {
            setSelected(match)
          } else {
            /* New conversation — fetch product info */
            const [{ data: prod }, { data: seller }] = await Promise.all([
              supabase.from('Product').select('Title, OwnerID').eq('ProductID', initProductId).single(),
              supabase.from('Users').select('Username').eq('UserID', initSellerId).single(),
            ])
            setSelected({
              productId:      Number(initProductId),
              sellerId:       initSellerId,
              buyerId:        user.id,
              productTitle:   prod?.Title ?? 'Product',
              sellerUsername: seller?.Username ?? 'Seller',
              otherUsername:  seller?.Username ?? 'Seller',
            })
          }
        } else if (enriched.length > 0) {
          setSelected(enriched[0])
        }
      } catch (err) {
        console.error('Messages load error:', err)
      } finally {
        setLoading(false)  // always clears the spinner
      }
    }
    load()
  }, [user, initProductId, initSellerId])

  const filtered = conversations.filter(c =>
    c.otherUsername?.toLowerCase().includes(convSearch.toLowerCase()) ||
    c.productTitle?.toLowerCase().includes(convSearch.toLowerCase())
  )

  const fmt = (iso) => {
    if (!iso) return ''
    const d    = new Date(iso)
    const now  = new Date()
    const diff = now - d
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto">
      {/* ── Conversation list ── */}
      <aside className="w-80 shrink-0 border-r border-surface-border flex flex-col bg-white">
        <div className="p-4 border-b border-surface-border">
          <h1 className="section-title mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search conversations…"
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              className="input pl-9 py-2 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400 px-4 text-center">
              <MessageSquare className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs">Start one from a product page.</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = selected?.productId === c.productId && selected?.sellerId === c.sellerId
              return (
                <button
                  key={`${c.productId}-${c.sellerId}`}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3.5 border-b border-surface-border flex gap-3 items-start
                    transition-colors hover:bg-brand-light
                    ${isActive ? 'bg-brand-light border-l-4 border-l-brand-navy' : ''}`}
                >
                  <span className="avatar w-9 h-9 text-sm shrink-0">
                    {c.otherUsername?.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-gray-900 truncate">{c.otherUsername}</span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-1">{fmt(c.lastMsg?.SentAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.productTitle}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {c.lastMsg?.Content ?? (c.lastMsg?.PhotoURL ? '📷 Photo' : '')}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Chat panel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea conversation={selected} />
      </div>
    </div>
  )
}
