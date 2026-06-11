import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  Flame, LayoutGrid, Trophy, Star, MessageSquare,
  Loader2, Eye, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react'

// SQL imports — raw function definitions for documentation / console visibility
import SQL_TRENDING   from '../sql/advanced_get_trending_products.sql?raw'
import SQL_CATEGORIES from '../sql/advanced_get_popular_categories.sql?raw'
import SQL_OFFERERS   from '../sql/advanced_get_top_offerers.sql?raw'
import SQL_TRUSTED    from '../sql/advanced_get_trusted_users.sql?raw'
import SQL_NO_OFFERS  from '../sql/advanced_get_products_without_offers.sql?raw'

const TABS = [
  { key: 'trending',   label: 'Trending',        icon: Flame,         color: 'text-orange-500' },
  { key: 'categories', label: 'Hot Categories',  icon: LayoutGrid,    color: 'text-blue-600'   },
  { key: 'offerers',   label: 'Top Swappers',    icon: Trophy,        color: 'text-amber-500'  },
  { key: 'trusted',    label: 'Trusted Sellers', icon: Star,          color: 'text-green-600'  },
  { key: 'noOffers',   label: 'Be First to Bid', icon: MessageSquare, color: 'text-purple-600' },
]

export default function HomeInsights() {
  const navigate    = useNavigate()
  const [activeTab, setActiveTab] = useState('trending')
  const [loading,   setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState({
    trending:   [],
    categories: [],
    offerers:   [],
    trusted:    [],
    noOffers:   [],
  })

  useEffect(() => {
    const load = async () => {
      console.log('[SQL Advanced] get_trending_products():\n',        SQL_TRENDING)
      console.log('[SQL Advanced] get_popular_categories():\n',       SQL_CATEGORIES)
      console.log('[SQL Advanced] get_top_offerers():\n',             SQL_OFFERERS)
      console.log('[SQL Advanced] get_trusted_users():\n',            SQL_TRUSTED)
      console.log('[SQL Advanced] get_products_without_offers():\n',  SQL_NO_OFFERS)

      const [t, c, o, tr, n] = await Promise.all([
        supabase.rpc('get_trending_products'),
        supabase.rpc('get_popular_categories'),
        supabase.rpc('get_top_offerers'),
        supabase.rpc('get_trusted_users'),
        supabase.rpc('get_products_without_offers'),
      ])

      setData({
        trending:   t.data  ?? [],
        categories: c.data  ?? [],
        offerers:   o.data  ?? [],
        trusted:    tr.data ?? [],
        noOffers:   n.data  ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  /* ── Per-tab content ── */
  const renderContent = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading insights…</span>
      </div>
    )

    /* 1 ── Trending products */
    if (activeTab === 'trending') {
      if (!data.trending.length) return <Empty text="No trending products yet." />
      return (
        <div className="divide-y divide-gray-100">
          {data.trending.map((r, i) => (
            <button
              key={i}
              onClick={() => navigate(`/?q=${encodeURIComponent(r.title)}`)}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-brand-light rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-orange-400 w-5 shrink-0">#{i + 1}</span>
                <span className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-navy transition-colors">
                  {r.title}
                </span>
                <span className="badge badge-blue text-[10px] shrink-0">{r.category_name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 ml-2">
                <Eye className="w-3.5 h-3.5" />{r.view_count}
              </div>
            </button>
          ))}
        </div>
      )
    }

    /* 2 ── Popular categories (progress bars) */
    if (activeTab === 'categories') {
      if (!data.categories.length) return <Empty text="No categories with active listings." />
      const max = Number(data.categories[0]?.active_product_count ?? 1)
      return (
        <div className="space-y-3">
          {data.categories.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 shrink-0 font-medium truncate">{r.category_name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-brand-navy to-brand-crimson transition-all duration-700"
                  style={{ width: `${(Number(r.active_product_count) / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right shrink-0">
                {r.active_product_count}
              </span>
            </div>
          ))}
        </div>
      )
    }

    /* 3 ── Top offerers leaderboard */
    if (activeTab === 'offerers') {
      if (!data.offerers.length) return <Empty text="No swap offers made yet." />
      return (
        <div className="divide-y divide-gray-100">
          {data.offerers.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-1">
              <div className="flex items-center gap-3">
                <span className="text-sm w-6 shrink-0 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                    <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                  )}
                </span>
                <span className="avatar w-7 h-7 text-xs shrink-0">
                  {r.user_name?.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-800">{r.user_name}</span>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {r.total_offers_made} offer{r.total_offers_made !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )
    }

    /* 4 ── Trusted sellers */
    if (activeTab === 'trusted') {
      if (!data.trusted.length) return <Empty text="No trusted sellers yet — complete swaps to get rated!" />
      return (
        <div className="divide-y divide-gray-100">
          {data.trusted.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-1">
              <div className="flex items-center gap-3">
                <span className="avatar w-7 h-7 text-xs shrink-0">
                  {r.user_name?.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.user_name}</p>
                  <p className="text-[10px] text-gray-400">
                    {Number(r.total_reviews)} review{Number(r.total_reviews) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(Number(r.average_rating))
                        ? 'text-amber-400 fill-current'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs font-semibold text-gray-600 ml-1.5">
                  {Number(r.average_rating).toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )
    }

    /* 5 ── Products without offers */
    if (activeTab === 'noOffers') {
      if (!data.noOffers.length) return <Empty text="Every listing already has an offer — check back soon!" />
      return (
        <div className="divide-y divide-gray-100">
          {data.noOffers.slice(0, 8).map((r) => (
            <Link
              key={r.product_id}
              to={`/product/${r.product_id}`}
              className="flex items-center justify-between py-2.5 px-1 hover:bg-brand-light rounded-lg transition-colors group"
            >
              <span className="text-sm text-gray-800 truncate flex-1 group-hover:text-brand-navy transition-colors">
                {r.title}
              </span>
              <span className="ml-3 text-xs font-semibold text-brand-crimson shrink-0 group-hover:underline">
                Be first →
              </span>
            </Link>
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="card overflow-hidden mb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-brand-navy to-brand-navy/80 text-white">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-bold tracking-wide">Campus Insights</span>
          <span className="text-[10px] text-white/50 font-normal ml-1">advanced SQL queries</span>
        </div>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="text-white/70 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-surface-border bg-white">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all shrink-0
                    ${isActive
                      ? `border-brand-navy text-brand-navy bg-brand-light`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ''}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="p-4 min-h-[120px] bg-white">
            {renderContent()}
          </div>
        </>
      )}
    </div>
  )
}

function Empty({ text }) {
  return <p className="text-sm text-gray-400 text-center py-6">{text}</p>
}
