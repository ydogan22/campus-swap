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
  const [existingPhotos, setExistingPhotos] = useState([])
  const [photosToDelete, setPhotosToDelete] = useState([])
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

      const [prodRes, catRes] = await Promise.race([
        Promise.all([
          supabase
            .from('product')
            .select('productid, title, description, itemcondition, status, viewcount, categoryid, productphoto(photoid, photourl)')
            .eq('ownerid', user.id)     // OwnerID — matches schema FK column
            .order('productid', { ascending: false }),
          supabase.from('category').select('categoryid, categoryname'),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Products query timed out (8s).')), 8000))
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
    setForm({ title: '', description: '', condition: 'Good', categoryId: categories[0]?.categoryid ?? '', status: 'Available' })
    setPhotoFiles([]); setPhotoPreviews([])
    setExistingPhotos([]); setPhotosToDelete([])
    setError(''); setSuccess('')
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ title: p.title, description: p.description ?? '', condition: p.itemcondition, categoryId: p.categoryid, status: p.status })
    setPhotoFiles([]); setPhotoPreviews([])
    setExistingPhotos(p.productphoto || [])
    setPhotosToDelete([])
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

  const removeExistingPhoto = (photo) => {
    setExistingPhotos(prev => prev.filter(p => p.photoid !== photo.photoid))
    setPhotosToDelete(prev => [...prev, photo])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.categoryId) { setError('Category is required.'); return }
    setSaving(true)

    try {
      let productId = editProduct?.productid

      if (editProduct) {
        /* Update */
        const { error: upErr } = await Promise.race([
          supabase
            .from('product')
            .update({
              title: form.title.trim(),
              description: form.description.trim() || null,
              itemcondition: form.condition,
              categoryid: form.categoryId || null,
              status: form.status,
            })
            .eq('productid', productId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Update timed out')), 8000))
        ]).catch(err => ({ error: { message: err.message } }))
        if (upErr) { setError(upErr.message); return }
      } else {
        /* Insert */
        const { data, error: insErr } = await Promise.race([
          supabase
            .from('product')
            .insert({
              ownerid:       user.id,
              title:         form.title.trim(),
              description:   form.description.trim() || null,
              itemcondition: form.condition,
              categoryid:    form.categoryId || null,
              status:        'Available',
              viewcount:     0,
            })
            .select('productid')
            .single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Insert timed out')), 8000))
        ]).catch(err => ({ error: { message: err.message } }))
        if (insErr) { setError(insErr.message); return }
        if (!data?.productid) { setError('Insert succeeded but returned no ID. Check RLS policies.'); return }
        productId = data.productid
      }

      /* Delete removed existing photos */
      if (photosToDelete.length > 0) {
        // 1. Delete from database
        const idsToDelete = photosToDelete.map(p => p.photoid)
        const { error: delErr } = await supabase.from('productphoto').delete().in('photoid', idsToDelete)
        if (delErr) { setError('Failed to delete old photos: ' + delErr.message); return }
        
        // 2. Delete from storage bucket
        const pathsToDelete = photosToDelete.map(p => {
          const urlParts = p.photourl.split(`${BUCKET}/`)
          return urlParts.length > 1 ? urlParts[1] : null
        }).filter(Boolean)
        if (pathsToDelete.length > 0) {
          await supabase.storage.from(BUCKET).remove(pathsToDelete)
        }
      }

      /* Upload new photos (only if we have a valid product ID) */
      for (const file of photoFiles) {
        const ext  = file.name.split('.').pop()
        const path = `products/${productId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
        if (upErr) { setError('Photo upload failed: ' + upErr.message); return }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        const { error: photoErr } = await supabase
          .from('productphoto')
          .insert({ productid: productId, photourl: urlData.publicUrl })
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
    
    try {
      // 1. Fetch photo URLs for this product to delete from Storage
      const { data: photos } = await supabase
        .from('productphoto')
        .select('photourl')
        .eq('productid', productId)

      // 2. Delete files from the Storage Bucket
      if (photos && photos.length > 0) {
        const pathsToDelete = photos.map(p => {
          // Extract the path after the bucket name. 
          const urlParts = p.photourl.split(`${BUCKET}/`)
          return urlParts.length > 1 ? urlParts[1] : null
        }).filter(Boolean)

        if (pathsToDelete.length > 0) {
          await supabase.storage.from(BUCKET).remove(pathsToDelete)
        }
        
        // 2.5 explicitly delete the photo rows from the database to prevent Foreign Key conflicts
        await supabase.from('productphoto').delete().eq('productid', productId)
      }

      // 3. Delete the product from the database
      await Promise.race([
        supabase.from('product').delete().eq('productid', productId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Delete timed out')), 8000))
      ])
      
    } catch (err) {
      alert(err.message)
    }
    
    load()
  }

  const handleMarkSold = async (productId) => {
    if (!window.confirm('Mark this item as Sold? This will hide it from active searches.')) return
    try {
      await Promise.race([
        supabase.from('product').update({ status: 'Sold' }).eq('productid', productId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Update timed out')), 8000))
      ])
      load()
    } catch (err) {
      alert(err.message)
    }
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
                    <option key={c.categoryid} value={c.categoryid}>{c.categoryname}</option>
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
                
                {/* Existing Photos */}
                {existingPhotos.map((photo) => (
                  <div key={photo.photoid} className="relative w-20 h-20">
                    <img src={photo.photourl} className="w-full h-full object-cover rounded-xl border border-surface-border" alt="existing" />
                    <button type="button" onClick={() => removeExistingPhoto(photo)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* New Photo Previews */}
                {photoPreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative w-20 h-20">
                    <img src={src} className="w-full h-full object-cover rounded-xl border border-surface-border opacity-80" alt="new" />
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
            const thumb     = p?.productphoto?.[0]?.photourl ?? null
            const title     = p?.title     ?? 'Untitled'
            const condition = p?.itemcondition ?? '—'
            const status    = p?.status    ?? 'Unknown'
            const views     = p?.viewcount ?? 0
            const productId = p?.productid

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
                  <div className="absolute top-3 left-3">
                    <span className={`${STATUS_STYLE[status] ?? 'badge-gray'} shadow-md border-2 border-white/50 font-bold uppercase tracking-wider text-[11px] px-3 py-1 backdrop-blur-sm`}>
                      {status === 'Pending' ? 'Proposed' : status}
                    </span>
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
                    {productId && status !== 'Sold' && (
                      <button
                        onClick={() => handleMarkSold(productId)}
                        className="btn-outline btn-sm flex-1 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300 gap-1"
                        title="Mark as Sold"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Sold
                      </button>
                    )}
                    {productId && (
                      <button
                        onClick={() => handleDelete(productId)}
                        className="btn-ghost btn-sm text-red-500 hover:bg-red-50 gap-1 px-3"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {productId && (
                      <Link to={`/product/${productId}`} className="btn-ghost btn-sm gap-1 px-3" title="View Product">
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
