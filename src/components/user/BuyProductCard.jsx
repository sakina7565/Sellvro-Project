import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Eye, Tag, CheckCircle2, Store } from 'lucide-react'
import { mediaUrl } from '../../lib/api.js'

/**
 * Product card on User Panel "Buy Products" grid.
 * - Displays "WMS" badge ONLY for products stocked in warehouse/WMS inventory.
 * - If kept with supplier, displays "Supplier Direct" and NO WMS mention.
 * - Clicking card, title, image, or Details navigates to the full Product Details Page (/user/products/:id).
 * - "Buy now" button directly opens checkout.
 */
function BuyProductCard({ product }) {
  const navigate = useNavigate()
  const productId = product.id || product._id
  const isActive = product.status === 'active' || !product.status
  const isOutOfStock = typeof product.quantity === 'number' && product.quantity <= 0
  const isWms = Boolean(product.inWarehouse || product.fulfillBy === 'warehouse')

  const imageSrc =
    mediaUrl(product.image) ||
    (Array.isArray(product.images) && product.images[0] ? mediaUrl(product.images[0]) : '') ||
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'

  const handleBuy = (e) => {
    e.stopPropagation()
    e.preventDefault()
    navigate(`/user/checkout/${productId}`, { state: { product } })
  }

  const handleCardClick = () => {
    navigate(`/user/products/${productId}`)
  }

  return (
    <article
      onClick={handleCardClick}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg cursor-pointer"
    >
      <div>
        {/* Image & Badges */}
        <div className="relative bg-slate-50/50 p-4 pt-5">
          {/* Fulfillment Badge: WMS only if in inventory; if kept with supplier, show Supplier Direct (NO WMS) */}
          {isWms ? (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md bg-slate-900/95 px-2.5 py-1 text-[11px] font-black tracking-wider text-amber-400 shadow-md backdrop-blur-xs border border-amber-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              WMS
            </div>
          ) : (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs border border-slate-200">
              <Store className="h-3 w-3 text-indigo-600" />
              Supplier Direct
            </div>
          )}

          {product.category && (
            <div className="absolute right-3 top-3 z-10">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-2xs backdrop-blur-xs">
                <Tag className="h-2.5 w-2.5 text-slate-400" />
                {product.category}
              </span>
            </div>
          )}

          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white p-2">
            <img
              src={imageSrc}
              alt={product.name}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pt-3.5 pb-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-primary-600">
            {product.name}
          </h3>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-black text-slate-900">
              ${Number(product.price || 0).toFixed(2)}
            </p>

            {isWms ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                WMS Hub
              </span>
            ) : isOutOfStock ? (
              <span className="text-[11px] font-semibold text-rose-600">
                Out of stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <Store className="h-3 w-3 text-slate-400" />
                {product.location && product.location !== '—' ? product.location : 'Supplier Stock'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="border-t border-slate-100 p-3 pt-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/user/products/${productId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            Details
          </Link>

          <button
            type="button"
            disabled={!isActive || isOutOfStock}
            onClick={handleBuy}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary-600 text-xs font-bold text-white transition-colors hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isOutOfStock ? 'Sold Out' : 'Buy now'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default BuyProductCard
