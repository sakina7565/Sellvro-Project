import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ChevronRight, Warehouse, Star, CheckCircle } from 'lucide-react'
import { FEATURED_DEALS } from './marketplaceData.js'

function MarketplaceDeals({ products = [], onSelectCategory }) {
  const [wishlist, setWishlist] = useState({})

  const toggleWishlist = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Use live products from API if provided and non-empty, otherwise use featured deals
  const displayItems = products.length > 0 ? products.slice(0, 6) : FEATURED_DEALS

  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Today's Deals
            </h2>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
              Hot B2B Offers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            All with 3PL Fast Dispatch & Escrow Buyer Protection
          </p>
        </div>

        <Link
          to="/user/products"
          className="group flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>See all deals</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {displayItems.map((item) => {
          const isWishlisted = Boolean(wishlist[item.id])
          const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
          const originalPrice = item.originalPrice || (price * 1.25).toFixed(2)
          const inWarehouse = Boolean(item.inWarehouse || item.fulfillBy === 'warehouse')

          return (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-md"
            >
              {/* Wishlist Button */}
              <button
                type="button"
                onClick={(e) => toggleWishlist(item.id, e)}
                aria-label="Add to watchlist"
                className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-xs transition hover:bg-white ${
                  isWishlisted ? 'text-red-500' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Heart className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>

              {/* Product Thumbnail */}
              <Link to="/user/products" className="block overflow-hidden rounded-lg bg-slate-50">
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={
                      item.image ||
                      (item.images && item.images[0]) ||
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </Link>

              {/* Product Details */}
              <div className="mt-3 flex flex-1 flex-col justify-between">
                <div>
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {inWarehouse ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Warehouse className="h-3 w-3" />
                        <span>3PL Hub</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        <span>Direct</span>
                      </span>
                    )}

                    {item.sku && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                        {item.sku}
                      </span>
                    )}
                  </div>

                  <Link
                    to="/user/products"
                    className="line-clamp-2 text-xs font-medium text-slate-800 hover:text-blue-600 leading-snug"
                    title={item.name}
                  >
                    {item.name}
                  </Link>
                </div>

                <div className="mt-3">
                  {/* Pricing */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      ${Number(price).toFixed(2)}
                    </span>
                    {originalPrice && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ${Number(originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="text-emerald-600 font-semibold">
                      {item.freeShipping !== false ? 'Free 3PL Dispatch' : 'Standard Shipping'}
                    </span>
                    {item.stock !== undefined && (
                      <span className="text-[10px] text-slate-400">{item.stock} in stock</span>
                    )}
                  </div>

                  <Link
                    to="/user/products"
                    className="mt-2.5 block w-full rounded-lg bg-slate-900 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-blue-600 transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default MarketplaceDeals
