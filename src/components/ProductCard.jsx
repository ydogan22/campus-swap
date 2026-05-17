import React from 'react'
import { Link } from 'react-router-dom'
import { Star, Eye, Tag } from 'lucide-react'

const CONDITION_STYLE = {
  New:       'badge-green',
  'Like New': 'badge-blue',
  Good:      'badge-yellow',
  Fair:      'badge-gray',
  Poor:      'badge-red',
}

const STATUS_STYLE = {
  Available: 'badge-green',
  Pending:   'badge-yellow',
  Sold:      'badge-gray',
}

const PLACEHOLDER = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=60'

export default function ProductCard({ product }) {
  const {
    ProductID, Title, ItemCondition, Status, ViewCount,
    thumbnail, sellerUsername, sellerRating,
  } = product

  return (
    <Link
      to={`/product/${ProductID}`}
      id={`product-card-${ProductID}`}
      className="card-hover group flex flex-col overflow-hidden"
    >
      {/* ── Thumbnail ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={thumbnail ?? PLACEHOLDER}
          alt={Title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={e => { e.target.src = PLACEHOLDER }}
        />
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={STATUS_STYLE[Status] ?? 'badge-gray'}>{Status ?? 'Unknown'}</span>
        </div>
        {/* View count */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
          <Eye className="w-3 h-3" />
          {ViewCount ?? 0}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-navy transition-colors">
          {Title}
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={CONDITION_STYLE[ItemCondition] ?? 'badge-gray'}>
            <Tag className="w-2.5 h-2.5" />
            {ItemCondition}
          </span>
        </div>

        <div className="mt-auto pt-3 border-t border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="avatar w-6 h-6 text-[10px]">
              {sellerUsername?.slice(0, 2).toUpperCase() ?? '??'}
            </span>
            <span className="text-xs text-gray-600 truncate max-w-[80px]">{sellerUsername ?? 'Unknown'}</span>
          </div>
          {sellerRating != null && (
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-medium text-gray-700">{Number(sellerRating).toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
