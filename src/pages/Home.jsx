import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'
import {
  SlidersHorizontal, X, ChevronDown, ChevronUp,
  Loader2, SearchX, Tag,
} from 'lucide-react'

const STATUSES = ['Available', 'Pending', 'Sold']
const PAGE_SIZE = 12

export default function Home() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [categories,      setCategories]      = useState([])
  const [products,        setProducts]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [loadingMore,     setLoadingMore]     = useState(false)
  const [hasMore,         setHasMore]         = useState(false)
  const [page,            setPage]            = useState(0)

  const [selectedCats,   setSelectedCats]    = useState([])
  const [selectedStatus, setSelectedStatus]  = useState([])
  const [sidebarOpen,    setSidebarOpen]     = useState(true)
  const [catExpanded,    setCatExpanded]     = useState(true)
  const [statusExpanded, setStatusExpanded]  = useState(true)

  /* ── Load categories ── */
  useEffect(() => {
    supabase.from('Category').select('CategoryID, CategoryName').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [])

  /* ── Build & run product query ── */
  const fetchProducts = useCallback(async (reset = true) => {
    const currentPage = reset ? 0 : page

    if (reset) setLoading(true)
    else setLoadingMore(true)

    let q = supabase
      .from('Product')
      .select(`
        ProductID, Title, ItemCondition, Status, ViewCount,
        CategoryID,
        Users!Product_OwnerID_fkey ( Username, OverallRating ),
        ProductPhoto ( PhotoURL )
      `)
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
      .order('ProductID', { ascending: false })

    if (query)               q = q.ilike('Title', `%${query}%`)
    if (selectedCats.length) q = q.in('CategoryID', selectedCats)
    if (selectedStatus.length) q = q.in('Status', selectedStatus)

    const { data, error } = await q

    const mapped = (data ?? []).map(p => ({
      ...p,
      thumbnail:     p.ProductPhoto?.[0]?.PhotoURL ?? null,
      sellerUsername: p.Users?.Username ?? null,
      sellerRating:   p.Users?.OverallRating ?? null,
    }))

    if (reset) {
      setProducts(mapped)
      setPage(1)
    } else {
      setProducts(prev => [...prev, ...mapped])
      setPage(p => p + 1)
    }
    setHasMore((data ?? []).length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }, [query, selectedCats, selectedStatus, page])

  useEffect(() => { fetchProducts(true) }, [query, selectedCats, selectedStatus])

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

      <div className="flex gap-6">
        {/* ── Sidebar (filters) ── */}
        <aside className={`${sidebarOpen ? 'w-60 shrink-0' : 'hidden'} hidden lg:block`}>
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
                    <label key={cat.CategoryID}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-navy cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                        checked={selectedCats.includes(cat.CategoryID)}
                        onChange={() => toggleCat(cat.CategoryID)}
                      />
                      {cat.CategoryName}
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
                const cat = categories.find(c => c.CategoryID === id)
                return cat ? (
                  <button key={id} onClick={() => toggleCat(id)}
                    className="badge badge-blue gap-1.5 cursor-pointer hover:bg-blue-200">
                    <Tag className="w-2.5 h-2.5" /> {cat.CategoryName}
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
                {products.map(p => <ProductCard key={p.ProductID} product={p} />)}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    id="load-more-btn"
                    onClick={() => fetchProducts(false)}
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
