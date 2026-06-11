import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SQL_GET_CATEGORIES from '../sql/home_get_categories.sql?raw'
import SQL_GET_PRODUCTS  from '../sql/home_get_products.sql?raw'
import ProductCard from '../components/ProductCard'
import HomeInsights from '../components/HomeInsights'
import {
  SlidersHorizontal, X, ChevronDown, ChevronUp,
  Loader2, SearchX, Tag,
} from 'lucide-react'

const STATUSES = ['Available', 'Sold']
const PAGE_SIZE = 12

export default function Home() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [categories,      setCategories]      = useState([])
  const [products,        setProducts]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [loadingMore,     setLoadingMore]     = useState(false)
  const [hasMore,         setHasMore]         = useState(false)
  const pageRef = useRef(0)          // tracks current page without being a dep

  const [selectedCats,   setSelectedCats]    = useState([])
  const [selectedStatus, setSelectedStatus]  = useState(['Available'])
  const [sidebarOpen,    setSidebarOpen]     = useState(false)
  const [catExpanded,    setCatExpanded]     = useState(true)
  const [statusExpanded, setStatusExpanded]  = useState(true)

  /* ── Load categories ── */
  useEffect(() => {
    console.log('[SQL] home_get_categories.sql:\n', SQL_GET_CATEGORIES)
    supabase.from('category').select('categoryid, categoryname').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [])

  /* ── Initial / filter-change fetch (runs once per filter change, never loops) ── */
  useEffect(() => {
    let cancelled = false

    const doFetch = async () => {
      console.log('[SQL] home_get_products.sql:\n', SQL_GET_PRODUCTS)
      setLoading(true)
      pageRef.current = 0

      let q = supabase
        .from('product')
        .select(`
          productid, title, itemcondition, status, viewcount,
          categoryid,
          users ( username, overallrating ),
          productphoto ( photourl )
        `)
        .range(0, PAGE_SIZE - 1)
        .order('productid', { ascending: false })

      if (query)                q = q.ilike('title', `%${query}%`)
      if (selectedCats.length)  q = q.in('categoryid', selectedCats)
      if (selectedStatus.length) q = q.in('status', selectedStatus)

      const { data, error } = await q
      if (cancelled) return

      if (error) {
        console.error('[Home] Initial fetch error:', error)
        setProducts([])
        setHasMore(false)
        setLoading(false)
        return
      }

      const mapped = (data ?? []).map(p => ({
        ...p,
        thumbnail:      p.productphoto?.[0]?.photourl ?? null,
        sellerUsername: p.users?.username ?? null,
        sellerRating:   p.users?.overallrating ?? null,
      }))

      setProducts(mapped)
      setHasMore((data ?? []).length === PAGE_SIZE)
      pageRef.current = 1
      setLoading(false)
    }

    doFetch()
    return () => { cancelled = true }
  }, [query, selectedCats, selectedStatus])   // ← stable primitives & arrays — no functions in deps

  /* ── Load-more (button-triggered only, never via useEffect) ── */
  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const currentPage = pageRef.current

    let q = supabase
      .from('product')
      .select(`
        productid, title, itemcondition, status, viewcount,
        categoryid,
        users ( username, overallrating ),
        productphoto ( photourl )
      `)
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
      .order('productid', { ascending: false })

    if (query)                q = q.ilike('title', `%${query}%`)
    if (selectedCats.length)  q = q.in('categoryid', selectedCats)
    if (selectedStatus.length) q = q.in('status', selectedStatus)

    const { data, error } = await q
    if (error) {
      console.error('[Home] Load more error:', error)
      setLoadingMore(false)
      return
    }

    const mapped = (data ?? []).map(p => ({
      ...p,
      thumbnail:      p.productphoto?.[0]?.photourl ?? null,
      sellerUsername: p.users?.username ?? null,
      sellerRating:   p.users?.overallrating ?? null,
    }))

    setProducts(prev => [...prev, ...mapped])
    setHasMore((data ?? []).length === PAGE_SIZE)
    pageRef.current = currentPage + 1
    setLoadingMore(false)
  }

  /* ── Toggle helpers ── */
  const toggleCat = (id) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const toggleStatus = (s) =>
    setSelectedStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const clearFilters = () => { setSelectedCats([]); setSelectedStatus([]) }

  const hasFilters = selectedCats.length > 0 || selectedStatus.length > 0

  return (
    <div className="page-container">
      {/* ── Hero banner ── */}
      <div className="rounded-xl3 bg-gradient-to-br from-brand-navy to-brand-navy/80 text-white p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #C8102E 0%, transparent 60%)' }} />
        <div className="relative">
          <h1 className="text-3xl font-extrabold mb-2">
            {query ? `Results for "${query}"` : 'Discover Campus Deals 🎓'}
          </h1>
          <p className="text-brand-muted text-sm">
            {query
              ? 'Showing matching products from your KU community.'
              : 'Browse items listed by Koç University students. Find, swap, or buy.'}
          </p>
        </div>
      </div>

      {/* ── Campus Insights (advanced SQL queries) ── */}
      <HomeInsights />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Sidebar (filters) ── */}
        <aside className={`${sidebarOpen ? 'w-full lg:w-60 shrink-0 block' : 'hidden lg:block lg:w-60 shrink-0'}`}>
          <div className="card p-4 sticky top-24 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="section-title text-base flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-brand-crimson hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Categories */}
            <div>
              <button
                onClick={() => setCatExpanded(v => !v)}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-brand-navy"
              >
                Category
                {catExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {catExpanded && (
                <div className="space-y-1 ml-1 mt-1">
                  {categories.map(cat => (
                    <label key={cat.categoryid}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-navy cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                        checked={selectedCats.includes(cat.categoryid)}
                        onChange={() => toggleCat(cat.categoryid)}
                      />
                      {cat.categoryname}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />

            {/* Status */}
            <div>
              <button
                onClick={() => setStatusExpanded(v => !v)}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-brand-navy"
              >
                Status
                {statusExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {statusExpanded && (
                <div className="space-y-1 ml-1 mt-1">
                  {STATUSES.map(s => (
                    <label key={s}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-navy cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                        checked={selectedStatus.includes(s)}
                        onChange={() => toggleStatus(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main grid ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile filter toggle */}
          <div className="lg:hidden mb-4 flex items-center gap-2">
            <button onClick={() => setSidebarOpen(v => !v)}
              className="btn-outline btn-sm flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {sidebarOpen ? 'Hide Filters' : 'Show Filters'}
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost btn-sm text-brand-crimson flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCats.map(id => {
                const cat = categories.find(c => c.categoryid === id)
                return cat ? (
                  <button key={id} onClick={() => toggleCat(id)}
                    className="badge badge-blue gap-1.5 cursor-pointer hover:bg-blue-200">
                    <Tag className="w-2.5 h-2.5" /> {cat.categoryname}
                    <X className="w-2.5 h-2.5" />
                  </button>
                ) : null
              })}
              {selectedStatus.map(s => (
                <button key={s} onClick={() => toggleStatus(s)}
                  className="badge badge-yellow gap-1.5 cursor-pointer hover:bg-yellow-200">
                  {s} <X className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}

          {/* States */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-navy" />
              <span className="text-sm">Loading products…</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <SearchX className="w-12 h-12 text-gray-300" />
              <p className="text-base font-medium text-gray-600">No products found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-outline btn-sm mt-2">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-4">{products.length} product{products.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
                {products.map(p => <ProductCard key={p.productid} product={p} />)}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    id="load-more-btn"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="btn-outline"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
