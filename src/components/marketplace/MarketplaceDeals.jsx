import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, ChevronRight, Warehouse, Star, CheckCircle, Lock, Flame } from 'lucide-react'
import { FEATURED_DEALS } from './marketplaceData.js'
import { mediaUrl } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

function MarketplaceDeals({ products = [], activeCategory = 'All Categories', activeSubcategory = '', searchQuery = '' }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState({})

  const toggleWishlist = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleOrderClick = (item, e) => {
    e.preventDefault()
    e.stopPropagation()
    const itemId = item._id || item.id
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: `/checkout/${itemId}`,
          message: 'Please sign in to your account before placing an order.',
        },
      })
      return
    }
    if (user?.role !== 'admin' && user?.status !== 'approved') {
      navigate('/user/business/detail', {
        state: {
          message: 'Your buyer account is pending admin approval. You cannot place orders until approved by the Admin.',
        },
      })
      return
    }
    navigate(`/checkout/${itemId}`, { state: { product: { ...item, id: itemId } } })
  }

  // Combine real database products with fallback deals, sorted by market research score descending
  const allItems = useMemo(() => {
    const raw = products && products.length > 0 ? products : FEATURED_DEALS
    return [...raw].sort((a, b) => {
      const scoreA = Number(a.rankingScore || 0)
      const scoreB = Number(b.rankingScore || 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      const priorityWeights = { high: 3, medium: 2, low: 1, standard: 0 }
      const pA = priorityWeights[a.rankingPriority] ?? 0
      const pB = priorityWeights[b.rankingPriority] ?? 0
      if (pB !== pA) return pB - pA
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  }, [products])

  // Filter by search query, category, or subcategory
  const filtered = allItems.filter((item) => {
    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      if (!matchSearch) return false
    }
    if (activeCategory && activeCategory !== 'All Categories') {
      const matchCat =
        item.category && item.category.toLowerCase().includes(activeCategory.toLowerCase())
      if (!matchCat) return false
    }
    if (activeSubcategory) {
      const matchSub =
        (item.name && item.name.toLowerCase().includes(activeSubcategory.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(activeSubcategory.toLowerCase())) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(activeSubcategory.toLowerCase()))
      if (!matchSub) return false
    }
    return true
  })

  const displayItems = filtered.length > 0 ? filtered : allItems

  // Pagination (25 items per page)
  const ITEMS_PER_PAGE = 25
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, activeSubcategory, searchQuery])

  const totalPages = Math.max(1, Math.ceil(displayItems.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return displayItems.slice(start, start + ITEMS_PER_PAGE)
  }, [displayItems, currentPage])

  return (
    <section id="deals" className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 scroll-mt-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Today&apos;s Deals
            </h2>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
              Hot B2B Offers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {searchQuery || (activeCategory && activeCategory !== 'All Categories')
              ? `Showing ${displayItems.length} products matching filter`
              : 'All with 3PL Fast Dispatch & Escrow Buyer Protection'}
          </p>
        </div>

        <a
          href="#deals"
          className="group flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>All deals ({allItems.length})</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {paginatedItems.map((item, idx) => {
          const itemId = item._id || item.id
          const productLink = itemId ? `/user/products/${itemId}` : '/'
          const isWishlisted = Boolean(wishlist[itemId])
          const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
          const originalPrice = item.originalPrice || (price > 0 ? (price * 1.25).toFixed(2) : null)
          const inWarehouse = Boolean(item.inWarehouse || item.fulfillBy === 'warehouse')
          const stockCount = item.quantity !== undefined ? item.quantity : item.stock

          const rawImg =
            (Array.isArray(item.images) && item.images[0]) ||
            item.image ||
            item.imageUrl ||
            ''
          const displayImg = rawImg
            ? mediaUrl(rawImg)
            : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'

          return (
            <div
              key={itemId || Math.random()}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-md"
            >
              {/* Wishlist Button */}
              <button
                type="button"
                onClick={(e) => toggleWishlist(itemId, e)}
                aria-label="Add to watchlist"
                className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-xs transition hover:bg-white ${
                  isWishlisted ? 'text-red-500' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Heart className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>

              {/* Product Thumbnail with Hot-Selling Overlay */}
              <Link to={productLink} className="block overflow-hidden rounded-lg bg-slate-50 relative">
                {Boolean(item.isHotSelling || (item.hotSellingRank && item.hotSellingRank <= 20)) && (
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 px-1.5 py-0.5 text-[8.5px] font-black text-white shadow-xs">
                      <Flame className="h-2 w-2 fill-white" />
                      <span>#{item.hotSellingRank || (idx + 1)} Hot</span>
                    </span>
                  </div>
                )}
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={displayImg}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                    }}
                  />
                </div>
              </Link>

              {/* Product Details */}
              <div className="mt-3 flex flex-1 flex-col justify-between">
                <div>
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {Boolean(item.isHotSelling || (item.hotSellingRank && item.hotSellingRank <= 20)) && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-red-500 to-amber-500 text-white px-1.5 py-0.5 text-[8.5px] font-black">
                        🔥 Hot #{item.hotSellingRank || (idx + 1)}
                      </span>
                    )}
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
                    to={productLink}
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
                    {stockCount !== undefined && (
                      <span className="text-[10px] text-slate-400">{stockCount} in stock</span>
                    )}
                  </div>

                  {/* Action Buttons: Details + Order Now */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <Link
                      to={productLink}
                      className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-center text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-2xs"
                    >
                      Details
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => handleOrderClick(item, e)}
                      className="flex-1 rounded-lg bg-blue-600 py-1.5 text-center text-[11px] font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition shadow-2xs flex items-center justify-center gap-1"
                      title="Proceed directly to checkout"
                    >
                      <span>Order Now</span>
                    </button>
                  </div>

                  <p className="mt-1 flex items-center justify-center gap-0.5 text-[9.5px] font-medium text-emerald-700">
                    <CheckCircle className="h-2.5 w-2.5" /> Verified Express Delivery
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Controls (25 products per page) */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">
            Showing{' '}
            <strong className="text-slate-900 font-bold">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, displayItems.length)}
            </strong>{' '}
            of <strong className="text-slate-900 font-bold">{displayItems.length}</strong> deals
            <span className="text-slate-400 ml-1.5">(25 per page)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1))
                document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' })
              }}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter((page) => {
                if (totalPages <= 7) return true
                if (page === 1 || page === totalPages) return true
                return Math.abs(page - currentPage) <= 1
              })
              .map((page, i, arr) => {
                const prev = arr[i - 1]
                return (
                  <span key={page} className="flex items-center">
                    {prev && page - prev > 1 && (
                      <span className="px-1 text-xs text-slate-400">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage(page)
                        document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className={`min-w-8 h-8 rounded-lg px-2.5 text-xs font-bold transition shadow-2xs ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                )
              })}

            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1))
                document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' })
              }}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default MarketplaceDeals
