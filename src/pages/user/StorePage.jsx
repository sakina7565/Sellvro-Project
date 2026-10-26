import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Heart,
  Info,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  MoreVertical,
  Package,
  Pause,
  Play,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Truck,
  Warehouse,
  X,
  Zap,
} from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { productApi, mediaUrl, getErrorMessage } from '../../lib/api.js'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'

const ITEMS_PER_PAGE = 12

function UserStorePage() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Interactive eBay Navigation Tabs: 'shop', 'sale', 'about', 'feedback'
  const [activeTab, setActiveTab] = useState('shop')

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortOption, setSortOption] = useState('best-match')
  const [filterFormat, setFilterFormat] = useState('all') // 'all', 'wms', 'direct'
  const [filterCondition, setFilterCondition] = useState('all') // 'all', 'new', 'wms-inspected'
  const [filterShipping, setFilterShipping] = useState('all') // 'all', 'free'

  // Categories Dropdown State
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)

  // Follow / Save Seller State
  const [isSellerSaved, setIsSellerSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [copiedShare, setCopiedShare] = useState(false)

  // Banner Carousel State
  const [isBannerPlaying, setIsBannerPlaying] = useState(true)
  const [bannerSlide, setBannerSlide] = useState(0)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // Quick View / Action Modal State
  const [quickViewProduct, setQuickViewProduct] = useState(null)

  // Watchlisted product IDs
  const [watchedProductIds, setWatchedProductIds] = useState(new Set())

  // Load Store & Products from API
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    productApi
      .store(supplierId)
      .then((res) => {
        if (!active) return
        const s = res.store || null
        const prods = Array.isArray(res.products) ? res.products : []
        setStore(s)
        setProducts(prods)
        setSavedCount(Number(s?.followersCount ?? 0))
      })
      .catch((err) => {
        if (!active) return
        // Fallback: Fetch from marketplace catalog
        productApi
          .marketplace()
          .then((mRes) => {
            if (!active) return
            const list = Array.isArray(mRes.data) ? mRes.data : []
            const matching = list.filter(
              (p) =>
                String(p.supplierId) === String(supplierId) ||
                String(p.supplier) === String(supplierId),
            )
            if (matching.length > 0) {
              const first = matching[0]
              const sName =
                first.vendorName ||
                first.supplierBusinessName ||
                first.supplier ||
                'Sellvro Verified Merchant'
              setStore({
                id: supplierId,
                name: sName,
                businessDescription:
                  first.supplierBusinessName ? `${sName} is committed to providing genuine products with fast logistics and high quality service.` : '',
                businessCategory: first.category || 'General Merchandise',
                city: first.supplierCity || first.location || 'Lahore',
                country: first.supplierCountry || first.country || 'Pakistan',
                totalOrders: first.supplierTotalOrders || 0,
                totalItemsSold: matching.reduce((acc, curr) => acc + Number(curr.soldCount || 0), 0),
                positiveRating: first.supplierRating || '99.4%',
                followersCount: 0,
                totalProducts: matching.length,
                isVerified: true,
              })
              setProducts(matching)
            } else {
              setError(getErrorMessage(err, 'Store not found or has no active listings.'))
            }
          })
          .catch(() => {
            if (active) setError(getErrorMessage(err, 'Failed to load store profile.'))
          })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [supplierId])

  // Banner Slides Content
  const bannerSlides = useMemo(() => {
    const storeTitle = store?.name || 'Big Deals'
    return [
      {
        title: `${storeTitle} is committed to providing the best quality products and accessories and ensuring a great overall customer experience. Our customer...`,
        tag: 'Official Storefront',
      },
      {
        title: `Explore authentic inventory verified by Sellvro Central Warehouse (WMS) with guaranteed quick dispatch and buyer protection.`,
        tag: 'WMS Certified Hub',
      },
      {
        title: `Exclusive deals on seasonal merchandise, computers, consumer electronics, and home accessories at unbeatable prices.`,
        tag: 'Featured Collections',
      },
    ]
  }, [store])

  // Auto-slide banner
  useEffect(() => {
    if (!isBannerPlaying) return
    const timer = setInterval(() => {
      setBannerSlide((prev) => (prev + 1) % bannerSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isBannerPlaying, bannerSlides.length])

  // Categories extracted with top representative images
  const featuredCategories = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      if (!p.category) return
      if (!map.has(p.category)) {
        const img = p.image
          ? mediaUrl(p.image)
          : p.images?.[0]
          ? mediaUrl(p.images[0])
          : PLACEHOLDER_IMAGE
        map.set(p.category, { name: p.category, image: img, count: 1 })
      } else {
        const item = map.get(p.category)
        item.count += 1
      }
    })
    return Array.from(map.values())
  }, [products])

  // Toggle Watchlist for a single product
  const toggleProductWatch = async (e, productId) => {
    e.preventDefault()
    e.stopPropagation()
    setWatchedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
    try {
      await productApi.watch(productId)
    } catch {
      // Offline fallback
    }
  }

  // Toggle Follow / Save Seller
  const toggleSaveSeller = () => {
    setIsSellerSaved((prev) => {
      const next = !prev
      setSavedCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
      return next
    })
  }

  // Copy Store Share Link
  const handleShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2500)
    }
  }

  // Filtered & Sorted "All items"
  const allFilteredProducts = useMemo(() => {
    let list = [...products]

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)),
      )
    }

    // 2. Selected Category Filter
    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory)
    }

    // 3. Buying Format Filter
    if (filterFormat === 'wms') {
      list = list.filter(
        (p) => p.isWmsVerified === true || p.inWarehouse === true || p.fulfillBy === 'warehouse',
      )
    } else if (filterFormat === 'direct') {
      list = list.filter(
        (p) => !p.isWmsVerified && !p.inWarehouse && p.fulfillBy !== 'warehouse',
      )
    }

    // 4. Condition Filter
    if (filterCondition === 'wms-inspected') {
      list = list.filter((p) => p.isWmsVerified === true)
    } else if (filterCondition === 'new') {
      list = list.filter((p) => !p.condition || p.condition === 'Brand New')
    }

    // 5. Sorting
    if (sortOption === 'price-low') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (sortOption === 'price-high') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    } else if (sortOption === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } else {
      // Best Match: Popular / high sold first
      list.sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))
    }

    return list
  }, [products, searchQuery, selectedCategory, filterFormat, filterCondition, sortOption])

  // Pagination Math
  const totalPages = Math.ceil(allFilteredProducts.length / ITEMS_PER_PAGE) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return allFilteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [allFilteredProducts, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, filterFormat, filterCondition, sortOption])

  // Horizontal Curated Rows:
  // "On Demand Items" (Items with highest orders / trending)
  const onDemandItems = useMemo(() => {
    return [...products]
      .sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))
      .slice(0, 4)
  }, [products])

  // "Newly Listed" (Newest 4 items)
  const newlyListedItems = useMemo(() => {
    return [...products]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 4)
  }, [products])

  if (loading) {
    return (
      <UserLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading store...</p>
          </div>
        </div>
      </UserLayout>
    )
  }

  if (error || !store) {
    return (
      <UserLayout>
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-8 ring-rose-50/50">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Store Not Found</h2>
          <p className="mb-6 text-sm text-slate-500">
            {error || 'This seller store does not exist or has no active listings.'}
          </p>
          <Button as={Link} to="/user/products" variant="primary" size="md">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>
        </div>
      </UserLayout>
    )
  }

  const storeName = store.name || 'Big Deals'

  return (
    <UserLayout>
      <div className="max-w-6xl mx-auto space-y-3 text-slate-900">
        {/* ================================================================= */}
        {/* 1. TOP BLACK BANNER / HERO CAROUSEL (eBay Signature Store Hero)  */}
        {/* ================================================================= */}
        <div className="relative overflow-hidden rounded-lg bg-[#0a0a0a] text-white shadow-xs min-h-[85px] sm:min-h-[95px] flex items-center px-4 py-2.5 sm:px-6">
          {/* Subtle background glow */}
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none" />

          <div className="max-w-xl z-10 space-y-1.5">
            <span className="inline-block rounded-full bg-white/10 backdrop-blur-md px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-300 border border-white/15">
              {bannerSlides[bannerSlide].tag}
            </span>

            <p className="text-[11px] sm:text-xs font-normal text-slate-200 leading-snug line-clamp-2">
              {bannerSlides[bannerSlide].title}
            </p>

            <div>
              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-950 shadow-2xs hover:bg-slate-100 transition-colors"
              >
                Learn more
              </button>
            </div>
          </div>

          {/* Carousel Controls on Bottom-Right */}
          <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() =>
                setBannerSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
              }
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setBannerSlide((prev) => (prev + 1) % bannerSlides.length)}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label={isBannerPlaying ? 'Pause carousel' : 'Play carousel'}
              onClick={() => setIsBannerPlaying((prev) => !prev)}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-colors"
            >
              {isBannerPlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. STORE HEADER & STATS BAR (Store Avatar, Rating, Action Pills) */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 py-1 border-b border-slate-200">
          {/* Store Logo & Details */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 shadow-2xs">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-white font-black text-[10px] shadow-inner">
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-950 tracking-tight leading-tight">
                {storeName}
              </h1>

              {/* Stats Line */}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-slate-900">
                  {store.positiveRating || '99.4%'} positive feedback
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-900">
                    {store.totalItemsSold > 0 ? `${store.totalItemsSold}` : `${store.totalOrders || 0}`}
                  </strong>{' '}
                  items sold
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-900">{savedCount}</strong> followers
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              {copiedShare ? (
                <>
                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-2.5 w-2.5 text-slate-500" />
                  <span>Share</span>
                </>
              )}
            </button>

            {/* Contact */}
            <Link
              to="/user/disputes"
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Mail className="h-2.5 w-2.5 text-slate-500" />
              <span>Contact</span>
            </Link>

            {/* Save Seller */}
            <button
              type="button"
              onClick={toggleSaveSeller}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all shadow-2xs ${
                isSellerSaved
                  ? 'border-rose-400 bg-rose-50 text-rose-600'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
              }`}
            >
              <Heart
                className={`h-2.5 w-2.5 ${isSellerSaved ? 'fill-rose-500 text-rose-500' : ''}`}
              />
              <span>{isSellerSaved ? 'Saved' : 'Save Seller'}</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. STORE NAVIGATION TABS & SEARCH BAR                             */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-1">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {/* Categories Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Menu className="h-2.5 w-2.5 text-slate-600" />
                <span>Categories</span>
                <ChevronDown className="h-2 w-2 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div className="absolute left-0 top-full z-40 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in-50">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All')
                      setIsCategoryMenuOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold text-left transition-colors ${
                      selectedCategory === 'All' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>All Categories</span>
                    <span className="font-mono text-[9px] text-slate-400">{products.length}</span>
                  </button>
                  {featuredCategories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.name)
                        setIsCategoryMenuOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold text-left transition-colors ${
                        selectedCategory === cat.name ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="font-mono text-[9px] text-slate-400">{cat.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Tabs: Shop, Sale, About, Feedback */}
            <button
              type="button"
              onClick={() => setActiveTab('shop')}
              className={`relative px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                activeTab === 'shop'
                  ? 'text-slate-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-950'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Shop
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sale')}
              className={`relative px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                activeTab === 'sale'
                  ? 'text-slate-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-950'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sale
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`relative px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                activeTab === 'about'
                  ? 'text-slate-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-950'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              About
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`relative px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                activeTab === 'feedback'
                  ? 'text-slate-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-950'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Feedback
            </button>
          </div>

          {/* Right: Search All Items Input */}
          <div className="relative w-full md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search all ${products.length} items`}
              className="h-6.5 w-full rounded-full border border-slate-300 bg-white pl-7 pr-2.5 text-[10px] text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tab: About */}
        {activeTab === 'about' && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2 text-[10px] sm:text-[11px] text-slate-700">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">About {storeName}</h3>
            <p className="leading-relaxed">
              {store.businessDescription ||
                `${storeName} is a verified seller operating on Sellvro Marketplace. We specialize in authenticated consumer electronics, high-grade accessories, and quality lifestyle products dispatched quickly to buyers.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              <div className="rounded border border-slate-100 bg-slate-50 p-2">
                <span className="block text-slate-400 font-medium">Location:</span>
                <strong className="text-slate-900">
                  {[store.city, store.country].filter(Boolean).join(', ') || 'Central Hub'}
                </strong>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50 p-2">
                <span className="block text-slate-400 font-medium">Fulfillment Rating:</span>
                <strong className="text-emerald-700 font-bold">{store.positiveRating || '99.4%'} Satisfied</strong>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50 p-2">
                <span className="block text-slate-400 font-medium">Member Since:</span>
                <strong className="text-slate-900">
                  {store.joinedAt ? new Date(store.joinedAt).getFullYear() : '2024'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Feedback */}
        {activeTab === 'feedback' && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2 text-[10px] sm:text-[11px]">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Seller Feedback &amp; Ratings</h3>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xl font-black text-slate-950">
                {store.positiveRating || '99.4%'}
              </div>
              <div className="text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-900 text-[11px]">Positive Feedback</p>
                <p className="text-[9px] text-slate-500">
                  Based on completed buyer orders, authentic warehouse custody checks, and dispute-free deliveries.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Shop or Sale */}
        {(activeTab === 'shop' || activeTab === 'sale') && (
          <>
            {/* ============================================================= */}
            {/* 4. FEATURED CATEGORIES STRIP (Compact Photo Cards)           */}
            {/* ============================================================= */}
            {featuredCategories.length > 0 && !searchQuery.trim() && (
              <div className="space-y-1.5">
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-900">Featured categories</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {featuredCategories.slice(0, 6).map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className="group flex flex-col items-center text-center transition-all"
                    >
                      <div
                        className={`relative aspect-square w-full max-h-20 sm:max-h-24 overflow-hidden rounded-lg bg-[#f7f7f7] border flex items-center justify-center p-2 transition-all group-hover:bg-white group-hover:shadow-2xs ${
                          selectedCategory === cat.name
                            ? 'border-slate-900 ring-1 ring-slate-900'
                            : 'border-slate-200/80'
                        }`}
                      >
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER_IMAGE
                          }}
                        />
                      </div>
                      <span className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 5. MID-PAGE PROMO BANNER ("On Demand Items")                   */}
            {/* ============================================================= */}
            {!searchQuery.trim() && (
              <div className="grid grid-cols-1 md:grid-cols-12 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
                {/* Left Side Promo Text */}
                <div className="md:col-span-6 p-4 sm:p-5 flex flex-col justify-center items-start space-y-1.5 bg-[#fbfcfd]">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                    On Demand Items
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Find popular items at unbeatable prices!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('all-items-section')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="mt-1 rounded-full bg-[#111827] px-3 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors"
                  >
                    Shop now
                  </button>
                </div>

                {/* Right Side Visual Graphic */}
                <div className="md:col-span-6 bg-gradient-to-br from-amber-50 via-sky-50 to-indigo-100 p-4 flex items-center justify-center relative overflow-hidden">
                  <div className="relative z-10 text-center space-y-1">
                    <span className="text-[8px] font-extrabold tracking-widest uppercase text-blue-600">
                      SELLVRO OFFICIAL
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {storeName}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 pt-0.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-700 shadow-2xs">
                        <ShoppingBag className="h-2.5 w-2.5 text-amber-500" /> Fast Courier
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-700 shadow-2xs">
                        <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" /> Buyer Protection
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 6. "On Demand Items" HORIZONTAL ROW (4 Columns)               */}
            {/* ============================================================= */}
            {onDemandItems.length > 0 && !searchQuery.trim() && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-[13px] font-bold text-slate-900">On Demand Items</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSortOption('best-match')
                      const el = document.getElementById('all-items-section')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    See all
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {onDemandItems.map((prod) => {
                    const prodImg = prod.image
                      ? mediaUrl(prod.image)
                      : prod.images?.[0]
                      ? mediaUrl(prod.images[0])
                      : PLACEHOLDER_IMAGE
                    const unitPrice = Number(prod.price || 0)
                    const isWatched = watchedProductIds.has(prod.id || prod._id)

                    return (
                      <div
                        key={prod.id || prod._id}
                        className="group relative flex flex-col rounded-md border border-slate-200/70 bg-white p-2 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all"
                      >
                        {/* Image Container with Watchlist Heart */}
                        <div className="relative aspect-square w-full overflow-hidden rounded bg-[#f7f7f7] mb-1.5 flex items-center justify-center p-1.5">
                          <img
                            src={prodImg}
                            alt={prod.name}
                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => toggleProductWatch(e, prod.id || prod._id)}
                            aria-label="Add to watchlist"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-slate-400 hover:text-rose-500 shadow-2xs transition-colors"
                          >
                            <Heart
                              className={`h-3 w-3 ${isWatched ? 'fill-rose-500 text-rose-500' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Title */}
                        <h3 className="line-clamp-2 text-[10px] sm:text-[11px] font-normal text-slate-900 group-hover:text-blue-600 group-hover:underline transition-colors leading-[1.25] mb-0.5 min-h-[1.75rem]">
                          {prod.name}
                        </h3>

                        {/* Price & Dots */}
                        <div className="mt-auto pt-1 flex items-center justify-between">
                          <span className="text-[12px] sm:text-[13px] font-bold text-slate-950">
                            ${unitPrice.toFixed(2)}
                          </span>

                          <Link
                            to={`/user/products/${prod.id || prod._id}`}
                            aria-label={`View ${prod.name}`}
                            className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Link>
                        </div>

                        {/* Whole card link */}
                        <Link
                          to={`/user/products/${prod.id || prod._id}`}
                          className="absolute inset-0 z-0"
                          aria-label={prod.name}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 7. "Newly Listed" HORIZONTAL ROW (4 Columns)                  */}
            {/* ============================================================= */}
            {newlyListedItems.length > 0 && !searchQuery.trim() && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-[13px] font-bold text-slate-900">Newly Listed</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSortOption('newest')
                      const el = document.getElementById('all-items-section')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    See all
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {newlyListedItems.map((prod) => {
                    const prodImg = prod.image
                      ? mediaUrl(prod.image)
                      : prod.images?.[0]
                      ? mediaUrl(prod.images[0])
                      : PLACEHOLDER_IMAGE
                    const unitPrice = Number(prod.price || 0)
                    const isWatched = watchedProductIds.has(prod.id || prod._id)

                    return (
                      <div
                        key={prod.id || prod._id}
                        className="group relative flex flex-col rounded-md border border-slate-200/70 bg-white p-2 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all"
                      >
                        {/* Image Container with Watchlist Heart */}
                        <div className="relative aspect-square w-full overflow-hidden rounded bg-[#f7f7f7] mb-1.5 flex items-center justify-center p-1.5">
                          <img
                            src={prodImg}
                            alt={prod.name}
                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => toggleProductWatch(e, prod.id || prod._id)}
                            aria-label="Add to watchlist"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-slate-400 hover:text-rose-500 shadow-2xs transition-colors"
                          >
                            <Heart
                              className={`h-3 w-3 ${isWatched ? 'fill-rose-500 text-rose-500' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Title */}
                        <h3 className="line-clamp-2 text-[10px] sm:text-[11px] font-normal text-slate-900 group-hover:text-blue-600 group-hover:underline transition-colors leading-[1.25] mb-0.5 min-h-[1.75rem]">
                          {prod.name}
                        </h3>

                        {/* Price & Dots */}
                        <div className="mt-auto pt-1 flex items-center justify-between">
                          <span className="text-[12px] sm:text-[13px] font-bold text-slate-950">
                            ${unitPrice.toFixed(2)}
                          </span>

                          <Link
                            to={`/user/products/${prod.id || prod._id}`}
                            aria-label={`View ${prod.name}`}
                            className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Link>
                        </div>

                        {/* Whole card link */}
                        <Link
                          to={`/user/products/${prod.id || prod._id}`}
                          className="absolute inset-0 z-0"
                          aria-label={prod.name}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 8. "All items" SECTION WITH FILTERS & PAGINATION              */}
            {/* ============================================================= */}
            <div id="all-items-section" className="space-y-2.5 pt-2.5 border-t border-slate-200">
              {/* Header with Title and Sort By */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-[13px] font-bold text-slate-900">All items</h2>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    {allFilteredProducts.length}
                  </span>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500 font-semibold">Sort:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="h-6 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="best-match">Best Match</option>
                    <option value="price-low">Price + Shipping: lowest first</option>
                    <option value="price-high">Price + Shipping: highest first</option>
                    <option value="newest">Time: newly listed</option>
                  </select>
                </div>
              </div>

              {/* Filter Dropdowns Bar */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                {/* Buying Format */}
                <div className="flex items-center">
                  <select
                    value={filterFormat}
                    onChange={(e) => setFilterFormat(e.target.value)}
                    className="h-6 rounded-full border border-slate-300 bg-white px-2 text-[10px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Buying Format: All Listings</option>
                    <option value="wms">WMS Verified (In Warehouse)</option>
                    <option value="direct">Direct Supplier Dispatch</option>
                  </select>
                </div>

                {/* Condition */}
                <div className="flex items-center">
                  <select
                    value={filterCondition}
                    onChange={(e) => setFilterCondition(e.target.value)}
                    className="h-6 rounded-full border border-slate-300 bg-white px-2 text-[10px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Condition: Any Condition</option>
                    <option value="new">Brand New</option>
                    <option value="wms-inspected">WMS Verified Authentic</option>
                  </select>
                </div>

                {/* Active Category Tag (if filtered) */}
                {selectedCategory !== 'All' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                    Category: {selectedCategory}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      aria-label="Clear category"
                      className="hover:text-blue-900"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </span>
                )}
              </div>

              {/* All Items Grid (4 Columns) */}
              {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {paginatedProducts.map((prod) => {
                    const prodImg = prod.image
                      ? mediaUrl(prod.image)
                      : prod.images?.[0]
                      ? mediaUrl(prod.images[0])
                      : PLACEHOLDER_IMAGE
                    const unitPrice = Number(prod.price || 0)
                    const isWatched = watchedProductIds.has(prod.id || prod._id)

                    return (
                      <div
                        key={prod.id || prod._id}
                        className="group relative flex flex-col rounded-md border border-slate-200/70 bg-white p-2 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all"
                      >
                        {/* Image Container with Watchlist Heart */}
                        <div className="relative aspect-square w-full overflow-hidden rounded bg-[#f7f7f7] mb-1.5 flex items-center justify-center p-1.5">
                          <img
                            src={prodImg}
                            alt={prod.name}
                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => toggleProductWatch(e, prod.id || prod._id)}
                            aria-label="Add to watchlist"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-slate-400 hover:text-rose-500 shadow-2xs transition-colors"
                          >
                            <Heart
                              className={`h-3 w-3 ${isWatched ? 'fill-rose-500 text-rose-500' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Title */}
                        <h3 className="line-clamp-2 text-[10px] sm:text-[11px] font-normal text-slate-900 group-hover:text-blue-600 group-hover:underline transition-colors leading-[1.25] mb-0.5 min-h-[1.75rem]">
                          {prod.name}
                        </h3>

                        {/* Price & Dots Menu */}
                        <div className="mt-auto pt-1 flex items-center justify-between">
                          <div>
                            <span className="text-[12px] sm:text-[13px] font-bold text-slate-950">
                              ${unitPrice.toFixed(2)}
                            </span>
                            <span className="block text-[8px] text-slate-400 font-normal">
                              Free shipping
                            </span>
                          </div>

                          <Link
                            to={`/user/products/${prod.id || prod._id}`}
                            aria-label={`View ${prod.name}`}
                            className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Link>
                        </div>

                        {/* Whole card link */}
                        <Link
                          to={`/user/products/${prod.id || prod._id}`}
                          className="absolute inset-0 z-0"
                          aria-label={prod.name}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-2xs">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">No items match your criteria</h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Try changing your search terms or filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('All')
                      setFilterFormat('all')
                      setFilterCondition('all')
                    }}
                    className="mt-2.5 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                  >
                    Reset filters
                  </button>
                </div>
              )}

              {/* ============================================================= */}
              {/* 9. PAGINATION AT THE BOTTOM (eBay Standard Pagination)         */}
              {/* ============================================================= */}
              {totalPages > 1 && (
                <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, allFilteredProducts.length)} of{' '}
                    <strong>{allFilteredProducts.length}</strong> items
                  </div>

                  <nav
                    className="flex items-center gap-1"
                    aria-label="Store pagination"
                  >
                    {/* Previous Button */}
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1))
                        const el = document.getElementById('all-items-section')
                        el?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => {
                      const isActive = currentPage === pageNo
                      return (
                        <button
                          key={pageNo}
                          type="button"
                          onClick={() => {
                            setCurrentPage(pageNo)
                            const el = document.getElementById('all-items-section')
                            el?.scrollIntoView({ behavior: 'smooth' })
                          }}
                          className={`flex h-6 min-w-6 px-2 items-center justify-center rounded-full text-[10px] font-bold transition-all shadow-2xs ${
                            isActive
                              ? 'bg-[#111827] text-white shadow-xs'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pageNo}
                        </button>
                      )
                    })}

                    {/* Next Button */}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                        const el = document.getElementById('all-items-section')
                        el?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </UserLayout>
  )
}

export default UserStorePage
