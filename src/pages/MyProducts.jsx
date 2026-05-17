import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  Plus, X, Loader2, AlertCircle, CheckCircle, Pencil,
  Tag, Eye, Package, Trash2, Image as ImageIcon, Upload,
} from 'lucide-react'

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor']
const BUCKET     = 'product-photos'

const STATUS_STYLE = {
  Available: 'badge-green', Pending: 'badge-yellow', Sold: 'badge-gray',
}

export default function MyProducts() {
  // authLoading = true while Supabase session is still being resolved.
  // We must NOT query with user.id until authLoading is false.
  const { user, loading: authLoading } = useAuth()

  const [products,    setProducts]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [saving,      setSaving]      = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', condition: 'Good', categoryId: '', status: 'Available',
  })
  const [photoFiles,    setPhotoFiles]    = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const fileRef = useRef(null)

  /* ── Load ──
   * Only runs after auth has fully resolved (authLoading === false)
   * and a valid user session exists.  If either is missing we clear
   * the spinner immediately so the page never hangs.
   */
  const load = async () => {
    // Auth still resolving — wait for the next effect cycle
    if (authLoading) return

    // No session — clear spinner so the page doesn’t hang on initial render
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Column name confirmed against schema: Product.OwnerID UUID NOT NULL
      console.log('[MyProducts] Fetching products for UserID:', user.id)

      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('Product')
          .select('ProductID, Title, ItemCondition, Status, ViewCount, CategoryID, ProductPhoto(PhotoURL)')
          .eq('OwnerID', user.id)     // OwnerID — matches schema FK column
          .order('ProductID', { ascending: false }),
        supabase.from('Category').select('CategoryID, CategoryName'),
      ])

      // Strict error logging so Supabase issues are always visible
      if (prodRes.error) {
        console.error('[MyProducts] Product query error:', {
          message: prodRes.error.message,
          code:    prodRes.error.code,
          hint:    prodRes.error.hint,
          details: prodRes.error.details,
        })
        setError('Could not load products: ' + prodRes.error.message)
      } else {
        console.log('[MyProducts] Loaded', prodRes.data?.length ?? 0, 'products')
        setProducts(prodRes.data ?? [])
      }

      if (catRes.error) {
        console.error('[MyProducts] Category query error:', catRes.error)
      }
      setCategories(catRes.data ?? [])

    } catch (err) {
      console.error('[MyProducts] Unexpected exception:', err)
      setError('Unexpected error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Re-run whenever auth state changes. authLoading is included so
  // the effect fires a second time once auth finishes resolving.
  useEffect(() => { load() }, [user, authLoading])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  const openNew = () => {
    setEditProduct(null)
    setForm({ title: '', description: '', condition: 'Good', categoryId: categories[0]?.CategoryID ?? '', status: 'Available' })
    setPhotoFiles([]); setPhotoPreviews([])
    setError(''); setSuccess('')
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ title: p.Title, description: '', condition: p.ItemCondition, categoryId: p.CategoryID, status: p.Status })
    setPhotoFiles([]); setPhotoPreviews([])
    setError(''); setSuccess('')
    setShowForm(true)
  }

  const handleFiles = (e) => {
    const files = [...(e.target.files ?? [])]
    setPhotoFiles(prev => [...prev, ...files])
    setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  const removePreview = (i) => {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)

    try {
      let productId = editProduct?.ProductID

      if (editProduct) {
        /* Update */
        const { error: upErr } = await supabase
          .from('Product')
          .update({
            Title: form.title.trim(),
            ItemCondition: form.condition,
            CategoryID: form.categoryId || null,
            Status: form.status,
          })
          .eq('ProductID', productId)
        if (upErr) { setError(upErr.message); return }
      } else {
        /* Insert */
        const { data, error: insErr } = await supabase
          .from('Product')
          .insert({
            OwnerID:       user.id,
            Title:         form.title.trim(),
            Description:   form.description.trim() || null,
            ItemCondition: form.condition,
            CategoryID:    form.categoryId || null,
            Status:        'Available',
            ViewCount:     0,
          })
          .select('ProductID')
          .single()
        if (insErr) { setError(insErr.message); return }
        if (!data?.ProductID) { setError('Insert succeeded but returned no ID. Check RLS policies.'); return }
        productId = data.ProductID
      }

      /* Upload photos (only if we have a valid product ID) */
      for (const file of photoFiles) {
        const ext  = file.name.split('.').pop()
        const path = `products/${productId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
        if (upErr) { setError('Photo upload failed: ' + upErr.message); return }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        const { error: photoErr } = await supabase
          .from('ProductPhoto')
          .insert({ ProductID: productId, PhotoURL: urlData.publicUrl })
        if (photoErr) { setError('Photo record failed: ' + photoErr.message); return }
      }

      setSuccess(editProduct ? 'Product updated!' : 'Product listed!')
      setShowForm(false)
      load()
    } catch (err) {
      setError('Unexpected error: ' + err.message)
    } finally {
      setSaving(false)   // ← always runs, no more stuck spinner
    }
  }

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) return
    await supabase.from('Product').delete().eq('ProductID', productId)
    load()
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <Package className="w-6 h-6" /> My Products
        </h1>
        <button id="add-product-btn" onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> List New Item
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6 text-sm animate-slide-up">
          <CheckCircle className="w-4 h-4" />{success}
        </div>
      )}

      {/* ── Add/Edit form ── */}
      {showForm && (
        <div className="card p-6 mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">{editProduct ? 'Edit Product' : 'List New Item'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="form-group sm:col-span-2">
                <label htmlFor="prod-title" className="label">Title *</label>
                <input id="prod-title" type="text" value={form.title} onChange={set('title')}
                  className="input" placeholder="e.g. Calculus Textbook 8th Edition" required />
              </div>

              {/* Category */}
              <div className="form-group">
                <label htmlFor="prod-category" className="label">Category</label>
                <select id="prod-category" value={form.categoryId} onChange={set('categoryId')} className="input">
                  <option value="">— Select —</option>
                  {categories.map(c => (
                    <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="form-group">
                <label htmlFor="prod-condition" className="label">Condition</label>
                <select id="prod-condition" value={form.condition} onChange={set('condition')} className="input">
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Status (edit only) */}
              {editProduct && (
                <div className="form-group">
                  <label htmlFor="prod-status" className="label">Status</label>
                  <select id="prod-status" value={form.status} onChange={set('status')} className="input">
                    <option>Available</option>
                    <option>Pending</option>
                    <option>Sold</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="form-group sm:col-span-2">
                <label htmlFor="prod-desc" className="label">Description</label>
                <textarea id="prod-desc" rows={3} value={form.description} onChange={set('description')}
                  className="input resize-none" placeholder="Describe the item's condition, any defects, etc." />
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <label className="label">Photos</label>
              <div className="flex flex-wrap gap-3 items-start">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={src} className="w-full h-full object-cover rounded-xl border border-surface-border" alt="" />
                    <button type="button" onClick={() => removePreview(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-surface-border flex flex-col items-center justify-center text-gray-400 hover:border-brand-navy hover:text-brand-navy transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px] mt-1">Add</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
              <button id="save-product-btn" type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : editProduct ? 'Save Changes' : 'List Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Products grid ── */}
      {/* Show auth-level spinner while session is still resolving */}
      {(loading || authLoading) ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-brand-navy" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
          <Package className="w-12 h-12 text-gray-300" />
          <p className="text-base font-medium text-gray-600">No products listed yet</p>
          <button onClick={openNew} className="btn-primary btn-sm">List your first item</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(p => {
            // Safe fallbacks — every field might be null if schema/RLS differs
            const thumb     = p?.ProductPhoto?.[0]?.PhotoURL ?? null
            const title     = p?.Title     ?? 'Untitled'
            const condition = p?.ItemCondition ?? '—'
            const status    = p?.Status    ?? 'Unknown'
            const views     = p?.ViewCount ?? 0
            const productId = p?.ProductID

            return (
              <div key={productId} className="card overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={title}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={STATUS_STYLE[status] ?? 'badge-gray'}>{status}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm truncate">{title}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <Tag className="w-3 h-3" />{condition}
                    <span>·</span>
                    <Eye className="w-3 h-3" />{views} views
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(p)} className="btn-outline btn-sm flex-1 gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {productId && (
                      <button
                        onClick={() => handleDelete(productId)}
                        className="btn-ghost btn-sm text-red-500 hover:bg-red-50 gap-1 px-3"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {productId && (
                      <Link to={`/product/${productId}`} className="btn-ghost btn-sm gap-1 px-3">
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
