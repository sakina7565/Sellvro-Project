import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart,
  ChevronRight,
  Warehouse,
  Star,
  CheckCircle,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Palette,
  Search,
  ExternalLink,
  ChevronDown,
  Flame,
} from 'lucide-react'
import { mediaUrl } from '../../lib/api.js'
import { FEATURED_DEALS, MARKETPLACE_CATEGORIES } from './marketplaceData.js'
import { useAuth } from '../../context/AuthContext.jsx'

// Subcategory mappings for major categories (matching eBay's taxonomy in the user screenshot)
const CATEGORY_TAXONOMY = {
  'Electronics & Tech': [
    'Cameras & Photo',
    'Cell Phones & Accessories',
    'Computers/Tablets & Networking',
    'Major Appliances',
    'Surveillance & Smart Home Electronics',
    'TV, Video & Home Audio',
    'Vehicle Electronics & GPS',
    'Video Games & Consoles',
    'Virtual Reality',
  ],
  'Electronics': [
    'Cameras & Photo',
    'Cell Phones & Accessories',
    'Computers/Tablets & Networking',
    'Major Appliances',
    'Surveillance & Smart Home Electronics',
    'TV, Video & Home Audio',
    'Vehicle Electronics & GPS',
    'Video Games & Consoles',
    'Virtual Reality',
  ],
  'Laptops & Computers': [
    'Ultrabooks & Laptops',
    'Gaming Desktops',
    'Monitors & Displays',
    'Keyboards & Mice',
    'Computer Components',
    'Docks & Hubs',
    'Laptop Bags & Sleeves',
  ],
  'Computer Parts': [
    'CPUs & Processors',
    'Motherboards',
    'Graphics Cards (GPUs)',
    'RAM & Memory Modules',
    'Power Supplies (PSUs)',
    'Cooling & Fans',
    'PC Cases',
  ],
  'Smartphones & Tech': [
    'Unlocked Smartphones',
    'Smartwatches & Bands',
    'Cases & Screen Protectors',
    'Fast Wireless Chargers',
    'Earbuds & Bluetooth Audio',
    'Power Banks & Batteries',
  ],
  'Mechanical & Auto Parts': [
    'Braking Systems',
    'Engines & Components',
    'Lighting & Headlamps',
    'Filters & Fluids',
    'Suspension & Steering',
    'Tires & Wheels',
  ],
  'Footwear & Apparel': [
    'Safety Work Boots',
    'Athletic Sneakers',
    'Tactical Boots',
    'High-Visibility Vests',
    'Work Pants & Overalls',
    'Gloves & Eye Protection',
  ],
  '3PL Warehouse In-Stock': [
    'Fast-Dispatch Pallet Lots',
    'Pre-Barcoded Tech SKUs',
    'Consumer Electronics Hub',
    'Ready-to-Ship Tool Bundles',
    'Consignment Wholesale Lots',
  ],
  'Storage & Hardware': [
    'Enterprise NVMe M.2 SSDs',
    'SATA Hard Disk Drives (HDDs)',
    'NAS Enclosures & Systems',
    'External Portable SSDs',
    'Memory Cards & USB Drives',
  ],
  'Industrial & Tools': [
    'Cordless Power Drills',
    'Wrench & Socket Sets',
    'Welding & Soldering Gear',
    'Air Compressors & Hoses',
    'Safety Helmets & Harnesses',
  ],
}

// Visual category feature cards for popular categories (eBay style showcase header)
const CATEGORY_SHOWCASE = {
  'Electronics & Tech': {
    bannerTitle: 'Reconditioned & Certified Wholesale Tech',
    bannerSubtitle: 'See the verified savings on refurbished and 3PL certified hardware lots',
    bannerImage:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    cards: [
      {
        title: 'Smartphones and smartwatches',
        sub: 'Smartphones & Mobile Tech',
        image:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Computers and accessories',
        sub: 'Laptops & Computers',
        image:
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Tablets and eReaders',
        sub: 'Enterprise Storage & SSDs',
        image:
          'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
  'Laptops & Computers': {
    bannerTitle: 'Commercial Grade Laptops & Workstations',
    bannerSubtitle: 'Direct factory batches with 3PL inspection and same-day warehouse dispatch',
    bannerImage:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    cards: [
      {
        title: 'Ultrabooks & Business Laptops',
        sub: 'Ultrabooks & Laptops',
        image:
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Displays & High-Hz Monitors',
        sub: 'Monitors & Displays',
        image:
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Workstation Accessories & Docks',
        sub: 'Docks & Hubs',
        image:
          'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
}

export default function MarketplaceCategoryView({
  products = [],
  categories = [],
  activeCategory = 'All Categories',
  activeSubcategory = '',
  searchQuery = '',
  skuQuery = '',
  minPriceQuery = '',
  maxPriceQuery = '',
  onApplyPriceFilter,
  onSelectCategory,
  onResetFilters,
}) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid' (eBay default in screenshot is list)
  const [wishlist, setWishlist] = useState({})
  const [sortBy, setSortBy] = useState('best_match') // 'best_match' (default: product ranking by research priority), 'newest', 'price_asc', 'price_desc', 'rating'
  const [pillFilter, setPillFilter] = useState('all') // 'all', 'warehouse', 'free_shipping', 'under_50', '50_150', 'over_150', 'top_rated'
  const [priceMin, setPriceMin] = useState(minPriceQuery || '')
  const [priceMax, setPriceMax] = useState(maxPriceQuery || '')
  const [appliedMin, setAppliedMin] = useState(minPriceQuery || '')
  const [appliedMax, setAppliedMax] = useState(maxPriceQuery || '')
  const [warehouseOnly, setWarehouseOnly] = useState(false)
  const [freeShippingOnly, setFreeShippingOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)


  // Sync price states with URL props
  useEffect(() => {
    if (minPriceQuery !== undefined) {
      setPriceMin(minPriceQuery)
      setAppliedMin(minPriceQuery)
    }
    if (maxPriceQuery !== undefined) {
      setPriceMax(maxPriceQuery)
      setAppliedMax(maxPriceQuery)
    }
  }, [minPriceQuery, maxPriceQuery])

  const handleApplyPrice = (e) => {
    e?.preventDefault()
    setAppliedMin(priceMin)
    setAppliedMax(priceMax)
    if (onApplyPriceFilter) {
      onApplyPriceFilter(priceMin, priceMax)
    }
  }

  const handlePresetPrice = (min, max) => {
    const minStr = min !== undefined && min !== null && min !== '' ? String(min) : ''
    const maxStr = max !== undefined && max !== null && max !== '' ? String(max) : ''
    setPriceMin(minStr)
    setPriceMax(maxStr)
    setAppliedMin(minStr)
    setAppliedMax(maxStr)
    if (onApplyPriceFilter) {
      onApplyPriceFilter(minStr, maxStr)
    }
  }

  // Master product list combining backend DB products with fallback featured deals
  const allProducts = useMemo(() => {
    return products && products.length > 0 ? products : FEATURED_DEALS
  }, [products])

  // Look up subcategories for the active category
  const activeSubcategories = useMemo(() => {
    if (activeCategory && activeCategory !== 'All Categories') {
      // 1. Check taxonomy table
      const matchedKey = Object.keys(CATEGORY_TAXONOMY).find(
        (k) => k.toLowerCase() === activeCategory.toLowerCase(),
      )
      if (matchedKey) return CATEGORY_TAXONOMY[matchedKey]

      // 2. Check category objects from API
      const foundObj = categories.find(
        (c) => c.name?.toLowerCase() === activeCategory.toLowerCase(),
      )
      if (foundObj?.subcategories?.length > 0) {
        return foundObj.subcategories
      }

      // 3. Extract unique subcategories from products matching this category
      const set = new Set()
      allProducts.forEach((p) => {
        if (
          p.category?.toLowerCase() === activeCategory.toLowerCase() &&
          p.subcategory
        ) {
          set.add(p.subcategory)
        }
      })
      if (set.size > 0) return Array.from(set)
    }

    // Default to general tech/electronics subcategories
    return CATEGORY_TAXONOMY['Electronics & Tech']
  }, [activeCategory, categories, allProducts])

  // Showcase header banner and 3 cards
  const showcaseInfo = useMemo(() => {
    const key = Object.keys(CATEGORY_SHOWCASE).find(
      (k) => k.toLowerCase() === activeCategory?.toLowerCase(),
    )
    if (key) return CATEGORY_SHOWCASE[key]

    // Default generic showcase
    return {
      bannerTitle: activeCategory && activeCategory !== 'All Categories'
        ? `Verified Wholesale ${activeCategory}`
        : `Marketplace Sourcing: ${searchQuery ? `"${searchQuery}"` : 'All Products'}`,
      bannerSubtitle:
        'Certified B2B suppliers, escrow protected payments, and direct 3PL warehouse fulfillment',
      bannerImage:
        'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80',
      cards: [
        {
          title: '3PL Fast Warehouse Lots',
          sub: 'Fast Dispatch',
          image:
            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
        },
        {
          title: 'Top Rated Tech Hardware',
          sub: 'Electronics',
          image:
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
        },
        {
          title: 'Industrial & Mechanical',
          sub: 'Hardware',
          image:
            'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
        },
      ],
    }
  }, [activeCategory, searchQuery])

  // Filter products based on search query, category, subcategory, price, pills, and ratings
  const filteredProducts = useMemo(() => {
    return allProducts.filter((item) => {
      // 1. Search Query
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.color && item.color.toLowerCase().includes(q)) ||
          (Array.isArray(item.sisterSkus) && item.sisterSkus.some((s) => String(s).toLowerCase().includes(q))) ||
          (Array.isArray(item.productKeywords) &&
            item.productKeywords.some((k) => String(k).toLowerCase().includes(q)))
        if (!match) return false
      }

      // 2. SKU query (advanced)
      if (skuQuery?.trim()) {
        const s = skuQuery.toLowerCase().trim()
        if (!item.sku || !item.sku.toLowerCase().includes(s)) return false
      }

      // 3. Category match
      if (activeCategory && activeCategory !== 'All Categories') {
        const catQ = activeCategory.toLowerCase()
        const itemCat = (item.category || '').toLowerCase()
        // Allow fuzzy matching (e.g. "Electronics" matches "Electronics & Tech")
        const match =
          itemCat.includes(catQ) ||
          catQ.includes(itemCat) ||
          (catQ.includes('elect') && itemCat.includes('elect')) ||
          (catQ.includes('laptop') && (itemCat.includes('laptop') || itemCat.includes('comp')))
        if (!match) return false
      }

      // 4. Subcategory match
      if (activeSubcategory?.trim()) {
        const subQ = activeSubcategory.toLowerCase().trim()
        const matchSub =
          (item.subcategory && item.subcategory.toLowerCase().includes(subQ)) ||
          (item.name && item.name.toLowerCase().includes(subQ)) ||
          (item.description && item.description.toLowerCase().includes(subQ))
        if (!matchSub) return false
      }

      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0

      // 5. Price Min/Max filter
      const activeMin = appliedMin !== '' ? Number(appliedMin) : (priceMin !== '' ? Number(priceMin) : null)
      const activeMax = appliedMax !== '' ? Number(appliedMax) : (priceMax !== '' ? Number(priceMax) : null)

      if (activeMin !== null && !isNaN(activeMin) && price < activeMin) {
        return false
      }
      if (activeMax !== null && !isNaN(activeMax) && price > activeMax) {
        return false
      }

      // 6. Pill filter
      if (pillFilter === 'warehouse') {
        const inWh = Boolean(item.inWarehouse || item.fulfillBy === 'warehouse')
        if (!inWh) return false
      } else if (pillFilter === 'free_shipping') {
        if (!item.freeShipping && item.price < 50) return false
      } else if (pillFilter === 'under_50') {
        if (price >= 50) return false
      } else if (pillFilter === '50_150') {
        if (price < 50 || price > 150) return false
      } else if (pillFilter === 'over_150') {
        if (price < 150) return false
      } else if (pillFilter === 'top_rated') {
        const r = item.rating || 4.5
        if (r < 4.5) return false
      }

      // 7. Checkboxes
      if (warehouseOnly) {
        const inWh = Boolean(item.inWarehouse || item.fulfillBy === 'warehouse')
        if (!inWh) return false
      }
      if (freeShippingOnly) {
        if (!item.freeShipping && item.price < 50) return false
      }
      if (minRating > 0) {
        const r = item.rating || 4.5
        if (r < minRating) return false
      }

      return true
    })
  }, [
    allProducts,
    searchQuery,
    skuQuery,
    activeCategory,
    activeSubcategory,
    priceMin,
    priceMax,
    appliedMin,
    appliedMax,
    pillFilter,
    warehouseOnly,
    freeShippingOnly,
    minRating,
  ])

  // Sort the filtered products (default: landing page priority & research score)
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0))
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } else {
      // 'best_match' (Landing Page Product Ranking):
      // Highest-ranked products appear at the top in descending order of performance score.
      // Top 20 performers are Hot-Selling products.
      list.sort((a, b) => {
        const scoreA = Number(a.rankingScore || 0)
        const scoreB = Number(b.rankingScore || 0)
        if (scoreB !== scoreA) return scoreB - scoreA
        const priorityWeights = { high: 3, medium: 2, low: 1, standard: 0 }
        const pA = priorityWeights[a.rankingPriority] ?? 0
        const pB = priorityWeights[b.rankingPriority] ?? 0
        if (pB !== pA) return pB - pA
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
    }
    return list
  }, [filteredProducts, sortBy])

  // Pagination (25 products per page)
  const ITEMS_PER_PAGE = 25
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    skuQuery,
    activeCategory,
    activeSubcategory,
    appliedMin,
    appliedMax,
    inWarehouseOnly,
    freeShippingOnly,
    minRating,
    sortBy,
  ])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE))
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [sortedProducts, currentPage])

  // Related products to show if results are small or empty
  const relatedProducts = useMemo(() => {
    return allProducts
      .filter((p) => !sortedProducts.some((sp) => (sp._id || sp.id) === (p._id || p.id)))
      .slice(0, 4)
  }, [allProducts, sortedProducts])

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


  // Auto-scroll down to results when user searches or switches category/subcategory
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery?.trim()) {
        const el = document.getElementById('results-section')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
      const catView = document.getElementById('marketplace-category-view')
      if (catView) {
        catView.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 120)

    return () => clearTimeout(timer)
  }, [searchQuery, activeCategory, activeSubcategory])

  // Display title
  const displayTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : activeCategory !== 'All Categories'
    ? activeCategory
    : 'All Products'

  return (
    <div id="marketplace-category-view" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 scroll-mt-20">
      {/* ── 1. eBay Breadcrumb Navigation ── */}
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <button
          type="button"
          onClick={onResetFilters}
          className="hover:text-blue-600 hover:underline transition-colors font-medium"
        >
          Sellvro Home
        </button>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        {activeCategory && activeCategory !== 'All Categories' && (
          <>
            <button
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(activeCategory, '')}
              className={`hover:text-blue-600 hover:underline transition-colors ${
                !activeSubcategory && !searchQuery ? 'font-bold text-slate-900' : ''
              }`}
            >
              {activeCategory}
            </button>
            {activeSubcategory && (
              <>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="font-bold text-slate-900">{activeSubcategory}</span>
              </>
            )}
          </>
        )}
        {searchQuery && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="font-bold text-slate-900">Search: "{searchQuery}"</span>
          </>
        )}
      </nav>

      {/* ── 2. Primary Category / Search Title ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {displayTitle}
          </h1>
          {activeSubcategory && (
            <p className="mt-0.5 text-xs text-slate-500">
              Browsing subcategory: <strong className="text-blue-700">{activeSubcategory}</strong>
            </p>
          )}
        </div>

        {/* Clear / Reset Filter Button */}
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span>Show Full Homepage</span>
        </button>
      </div>

      {/* ── 3. Main 2-Column eBay Layout (Sidebar + Content) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* ── LEFT SIDEBAR: Shop by Category & Filters (eBay style) ── */}
        <aside className="space-y-6">
          {/* Section A: Shop by Category */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
              Shop by category
            </h3>

            {/* Subcategories list */}
            <ul className="mt-3 space-y-1 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory && onSelectCategory(activeCategory, '')}
                  className={`w-full text-left py-1 px-2 rounded-md transition-colors ${
                    !activeSubcategory
                      ? 'font-bold text-blue-700 bg-blue-50'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  All in {activeCategory !== 'All Categories' ? activeCategory : 'Catalog'}
                </button>
              </li>
              {activeSubcategories.map((sub, idx) => {
                const isSelected = activeSubcategory?.toLowerCase() === sub.toLowerCase()
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => onSelectCategory && onSelectCategory(activeCategory, sub)}
                      className={`w-full text-left py-1 px-2 rounded-md transition-colors truncate ${
                        isSelected
                          ? 'font-bold text-blue-700 bg-blue-50'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                      }`}
                      title={sub}
                    >
                      {sub}
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Other categories dropdown/list */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Explore Other Verticals
              </span>
              <div className="space-y-1">
                {categories.slice(0, 6).map((cat) => {
                  const isCurrent = cat.name?.toLowerCase() === activeCategory?.toLowerCase()
                  return (
                    <button
                      key={cat.id || cat._id || cat.name}
                      type="button"
                      onClick={() => onSelectCategory && onSelectCategory(cat.name, '')}
                      className={`block w-full text-left text-xs py-1 px-2 rounded-md truncate transition-colors ${
                        isCurrent
                          ? 'font-bold text-blue-700'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Section B: Refinements & Price Filter */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900">Price ($ USD)</h4>
                {(appliedMin || appliedMax) && (
                  <button
                    type="button"
                    onClick={() => handlePresetPrice('', '')}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Clear Price
                  </button>
                )}
              </div>

              {/* Form with Min, Max inputs and Go/Apply button */}
              <form onSubmit={handleApplyPrice} className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-5 pr-1.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <span className="text-slate-400 text-xs">to</span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-5 pr-1.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shrink-0 shadow-2xs cursor-pointer"
                  title="Apply price filter"
                >
                  Go
                </button>
              </form>

              {/* eBay-style Quick Price Range Presets */}
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Popular Price Ranges
                </span>
                {[
                  { label: 'Any Price', min: '', max: '' },
                  { label: 'Under $25', min: '', max: '25' },
                  { label: '$25 to $50', min: '25', max: '50' },
                  { label: '$50 to $100', min: '50', max: '100' },
                  { label: '$100 to $250', min: '100', max: '250' },
                  { label: '$250+', min: '250', max: '' },
                ].map((preset, idx) => {
                  const isActive =
                    String(appliedMin || '') === String(preset.min) &&
                    String(appliedMax || '') === String(preset.max)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetPrice(preset.min, preset.max)}
                      className={`flex w-full items-center justify-between py-1 px-1.5 rounded-md text-xs transition text-left cursor-pointer ${
                        isActive
                          ? 'font-bold text-blue-700 bg-blue-50'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  )
                })}
              </div>

              {/* Active Price Badge if applied */}
              {(appliedMin || appliedMax) && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-blue-50/80 border border-blue-200 px-2 py-1 text-[11px] text-blue-900">
                  <span className="font-semibold">
                    Active: {appliedMin ? `${appliedMin}` : '$0'} - {appliedMax ? `${appliedMax}` : 'Above'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePresetPrice('', '')}
                    className="text-blue-500 hover:text-blue-700 font-bold ml-1 cursor-pointer"
                    title="Remove price filter"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Fulfillment Checkbox */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Fulfillment & Delivery</h4>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={warehouseOnly}
                  onChange={(e) => setWarehouseOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="inline-flex items-center gap-1">
                  <Warehouse className="h-3.5 w-3.5 text-blue-600" />
                  <span>In 3PL Warehouse</span>
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={freeShippingOnly}
                  onChange={(e) => setFreeShippingOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Free Dispatch / Shipping</span>
                </span>
              </label>
            </div>

            {/* Rating Filter */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Customer Rating</h4>
              <div className="space-y-1">
                {[4, 3, 0].map((starVal) => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setMinRating(starVal === minRating ? 0 : starVal)}
                    className={`flex items-center gap-1 text-xs py-1 px-1.5 rounded-md w-full transition ${
                      minRating === starVal ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: starVal || 5 }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-500" />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500 ml-1">
                      {starVal ? `& up` : 'Any rating'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reset button inside sidebar */}
            {(priceMin || priceMax || warehouseOnly || freeShippingOnly || minRating > 0 || pillFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setPriceMin('')
                  setPriceMax('')
                  setWarehouseOnly(false)
                  setFreeShippingOnly(false)
                  setMinRating(0)
                  setPillFilter('all')
                }}
                className="w-full rounded-lg bg-slate-100 py-1.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Clear Sidebar Filters
              </button>
            )}
          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT AREA (Showcase + Pills + Product List) ── */}
        <main className="space-y-5">
          {/* ── Feature Header: eBay-style Top Banner & 3 Cards ── */}
          <div className="space-y-3">
            {/* Wide Top Banner (like "Reconditioned tech" in screenshot) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-md">
              <div className="relative z-10 max-w-lg">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-300 border border-blue-400/30 mb-2">
                  <Sparkles className="h-3 w-3 text-blue-400" />
                  <span>Verified B2B Catalog</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {showcaseInfo.bannerTitle}
                </h2>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  {showcaseInfo.bannerSubtitle}
                </p>
                <div className="mt-3.5 flex items-center gap-3">
                  <a
                    href="#results-section"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 transition shadow-sm"
                  >
                    <span>View items</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-700" />
                  </a>
                  <span className="text-xs text-slate-300">
                    <strong className="text-white">{sortedProducts.length}</strong> available lots
                  </span>
                </div>
              </div>

              {/* Decorative background glow */}
              <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none">
                <img
                  src={showcaseInfo.bannerImage}
                  alt="Feature banner"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* 3 Visual Category Showcase Cards (like in screenshot: Smartphones, Computers, Tablets) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {showcaseInfo.cards.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectCategory && onSelectCategory(activeCategory, card.sub)}
                  className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-2xs hover:border-blue-400 hover:shadow-md transition"
                >
                  <div className="pr-2 z-10">
                    <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                      {card.title}
                    </h3>
                    <div className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Filter Pills Row (eBay style horizontal filters) ── */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'warehouse', label: 'In 3PL Warehouse' },
              { id: 'free_shipping', label: 'Free Shipping' },
              { id: 'under_50', label: 'Under $50', min: '', max: '50' },
              { id: '50_150', label: '$50 to $150', min: '50', max: '150' },
              { id: 'over_150', label: '$150+', min: '150', max: '' },
              { id: 'top_rated', label: 'Top Rated (4.5★+)' },
            ].map((pill) => {
              const active =
                pill.min !== undefined || pill.max !== undefined
                  ? String(appliedMin || '') === String(pill.min || '') &&
                    String(appliedMax || '') === String(pill.max || '')
                  : pillFilter === pill.id
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    if (pill.min !== undefined || pill.max !== undefined) {
                      if (active) {
                        handlePresetPrice('', '')
                      } else {
                        handlePresetPrice(pill.min, pill.max)
                      }
                    } else {
                      setPillFilter(active && pill.id !== 'all' ? 'all' : pill.id)
                    }
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition border cursor-pointer ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>

          {/* ── Results Bar & View Toggle (eBay style) ── */}
          <div
            id="results-section"
            className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3 scroll-mt-24"
          >
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900 font-bold">{sortedProducts.length}</strong> results found
              {activeSubcategory && <span> in <strong className="text-slate-800">{activeSubcategory}</strong></span>}
            </div>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="best_match">Marketplace Ranking (Priority &amp; Research)</option>
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rating</option>
                </select>
              </div>

              {/* View Switch: Grid vs List */}
              <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition ${
                    viewMode === 'grid'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition ${
                    viewMode === 'list'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List View (eBay Style)"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Product Listings (List vs Grid) ── */}
          {sortedProducts.length > 0 ? (
            <>
              {viewMode === 'list' ? (
              /* ── LIST VIEW (Matches eBay screenshot exactly) ── */
              <div className="space-y-4">
                {paginatedProducts.map((item) => {
                  const itemId = item._id || item.id
                  const productLink = itemId ? `/user/products/${itemId}` : '/'
                  const isWishlisted = Boolean(wishlist[itemId])
                  const price =
                    typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
                  const originalPrice =
                    item.originalPrice || (price > 0 ? (price * 1.25).toFixed(2) : null)
                  const inWarehouse = Boolean(item.inWarehouse || item.fulfillBy === 'warehouse')
                  const stockCount = item.quantity !== undefined ? item.quantity : item.stock
                  const ratingVal = item.rating || 4.8
                  const reviewsCount = item.reviews || (Math.floor(price * 3) + 12)

                  const rawImg =
                    (Array.isArray(item.images) && item.images[0]) ||
                    item.image ||
                    item.imageUrl ||
                    ''
                  const displayImg = rawImg
                    ? mediaUrl(rawImg)
                    : 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'

                  return (
                    <div
                      key={itemId}
                      className="group relative flex flex-col sm:flex-row items-start gap-4 sm:gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-md transition"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 mx-auto sm:mx-0">
                        {Boolean(item.isHotSelling || (item.hotSellingRank && item.hotSellingRank <= 20)) && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 px-2 py-0.5 text-[9.5px] font-black text-white shadow-xs">
                              <Flame className="h-3 w-3 fill-white" />
                              <span>Hot Selling #{item.hotSellingRank || 1}</span>
                            </span>
                          </div>
                        )}
                        <Link to={productLink} className="block h-full w-full">
                          <img
                            src={displayImg}
                            alt={item.name}
                            className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </Link>
                        {/* Wishlist Heart */}
                        <button
                          type="button"
                          onClick={(e) => toggleWishlist(itemId, e)}
                          className={`absolute top-2 right-2 rounded-full p-1.5 shadow-sm transition ${
                            isWishlisted
                              ? 'bg-rose-50 text-rose-500'
                              : 'bg-white/90 text-slate-400 hover:text-rose-500'
                          }`}
                          aria-label="Save to Watchlist"
                        >
                          <Heart
                            className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Middle Details (eBay Style) */}
                      <div className="flex-1 min-w-0">
                        <Link to={productLink} className="block">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                            {item.name}
                          </h3>
                        </Link>

                        {/* Specs & Highlights */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {item.brand && (
                            <span className="font-semibold text-slate-700">
                              Brand: {item.brand}
                            </span>
                          )}
                          {item.sku && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-slate-500">
                                SKU: {item.sku}
                              </span>
                            </>
                          )}
                          {item.category && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600">{item.category}</span>
                            </>
                          )}
                        </div>

                        {/* Ratings & Reviews */}
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className="flex items-center text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < Math.floor(ratingVal)
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {ratingVal.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-400">({reviewsCount})</span>
                        </div>

                        {/* Stock & 3PL Warehouse Badge */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {inWarehouse ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <Warehouse className="h-3 w-3" />
                              <span>In 3PL Warehouse (Instant Dispatch)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              <span>Supplier Fulfillment</span>
                            </span>
                          )}

                          {stockCount !== undefined && (
                            <span className="text-xs text-slate-500">
                              Stock: <strong className="text-slate-700">{stockCount}</strong> available
                            </span>
                          )}

                          {Array.isArray(item.sisterSkus) && item.sisterSkus.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
                              <Palette className="h-3 w-3 text-sky-600" />
                              <span>Also in {item.sisterSkus.length} {item.sisterVariationType || 'Color'}{item.sisterSkus.length > 1 ? 's' : ''}</span>
                            </span>
                          )}

                          {Boolean(item.isHotSelling || (item.hotSellingRank && item.hotSellingRank <= 20)) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow-xs">
                              <Flame className="h-3 w-3 fill-white" />
                              <span>Top 20 Hot-Selling #{item.hotSellingRank || 1}</span>
                            </span>
                          )}

                          {item.rankingPriority === 'high' && !item.isHotSelling && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                              <Sparkles className="h-3 w-3 text-indigo-600" />
                              <span>Top Trending &bull; High Demand</span>
                            </span>
                          )}
                        </div>

                        {/* Shipping note */}
                        <p className="mt-2 text-xs text-slate-500">
                          {item.freeShipping || price > 80
                            ? 'Free International / Domestic 3PL Shipping'
                            : 'Standard Courier Dispatch available'}
                        </p>
                      </div>

                      {/* Right / Price Column */}
                      <div className="w-full sm:w-44 shrink-0 flex flex-col justify-between items-start sm:items-end border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 self-stretch">
                        <div className="sm:text-right">
                          <div className="text-xs text-slate-400">Wholesale Price</div>
                          <div className="text-xl font-extrabold text-slate-900">
                            US ${price.toFixed(2)}
                          </div>
                          {originalPrice && (
                            <div className="text-xs text-slate-400 line-through">
                              US ${originalPrice}
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                            Escrow Buyer Protected
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex sm:flex-col gap-2 w-full">
                          <button
                            type="button"
                            onClick={(e) => handleOrderClick(item, e)}
                            className="flex-1 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition text-center"
                          >
                            Order Now
                          </button>
                          <Link
                            to={productLink}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition text-center"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── GRID VIEW ── */
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {paginatedProducts.map((item) => {
                  const itemId = item._id || item.id
                  const productLink = itemId ? `/user/products/${itemId}` : '/'
                  const isWishlisted = Boolean(wishlist[itemId])
                  const price =
                    typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
                  const inWarehouse = Boolean(item.inWarehouse || item.fulfillBy === 'warehouse')
                  const ratingVal = item.rating || 4.8
                  const reviewsCount = item.reviews || (Math.floor(price * 2) + 10)

                  const rawImg =
                    (Array.isArray(item.images) && item.images[0]) ||
                    item.image ||
                    item.imageUrl ||
                    ''
                  const displayImg = rawImg
                    ? mediaUrl(rawImg)
                    : 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'

                  return (
                    <div
                      key={itemId}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-md transition"
                    >
                      <div>
                        {/* Square image */}
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                          {Boolean(item.isHotSelling || (item.hotSellingRank && item.hotSellingRank <= 20)) && (
                            <div className="absolute top-2 left-2 z-10">
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 px-2 py-0.5 text-[9px] font-black text-white shadow-xs">
                                <Flame className="h-2.5 w-2.5 fill-white" />
                                <span>#{item.hotSellingRank || 1} Hot</span>
                              </span>
                            </div>
                          )}
                          <Link to={productLink} className="block h-full w-full">
                            <img
                              src={displayImg}
                              alt={item.name}
                              className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(itemId, e)}
                            className={`absolute top-2 right-2 rounded-full p-1.5 shadow-sm transition ${
                              isWishlisted
                                ? 'bg-rose-50 text-rose-500'
                                : 'bg-white/90 text-slate-400 hover:text-rose-500'
                            }`}
                            aria-label="Save to Watchlist"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Title */}
                        <Link to={productLink} className="mt-2.5 block">
                          <h3 className="line-clamp-2 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                            {item.name}
                          </h3>
                        </Link>

                        {/* Rating */}
                        <div className="mt-1 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          <span className="text-[11px] font-bold text-slate-800">
                            {ratingVal.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">({reviewsCount})</span>
                        </div>

                        {/* Badge */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Boolean(item.isHotSelling || (item.hotSellingRank && item.hotSellingRank <= 20)) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                              <Flame className="h-2.5 w-2.5 fill-white" />
                              <span>Top 20 Hot</span>
                            </span>
                          )}
                          {inWarehouse && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <Warehouse className="h-2.5 w-2.5" />
                              <span>3PL Warehouse</span>
                            </span>
                          )}
                          {Array.isArray(item.sisterSkus) && item.sisterSkus.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              <Palette className="h-2.5 w-2.5 text-sky-600" />
                              <span>+{item.sisterSkus.length} {item.sisterVariationType || 'Colors'}</span>
                            </span>
                          )}
                          {item.rankingPriority === 'high' && !item.isHotSelling && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                              <span>Top Demand</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Price & Order */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-extrabold text-slate-900">
                            ${price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500">Wholesale</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleOrderClick(item, e)}
                          className="mt-2 w-full rounded-xl bg-blue-600 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-500 transition"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination Controls (25 products per page) */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">
                  Showing{' '}
                  <strong className="text-slate-900 font-bold">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedProducts.length)}
                  </strong>{' '}
                  of <strong className="text-slate-900 font-bold">{sortedProducts.length}</strong> products
                  <span className="text-slate-400 ml-1.5">(25 per page)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1))
                      document.getElementById('marketplace-category-view')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
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
                              document.getElementById('marketplace-category-view')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            className={`min-w-8 h-8 rounded-xl px-2.5 text-xs font-bold transition shadow-2xs ${
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
                      document.getElementById('marketplace-category-view')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
          ) : (
            /* ── EMPTY STATE (No matching items) ── */
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Search className="h-7 w-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  No exact matches found for your filter
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Try checking your spelling, loosening the price limit, or selecting a broader category.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow-xs"
                >
                  Reset All Filters & View All
                </button>
              </div>
            </div>
          )}

          {/* ── Related / Recommended Items Section ── */}
          {relatedProducts.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Related Wholesale Products You Might Like
                </h3>
                <span className="text-xs text-slate-500">From verified sellers</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedProducts.map((relItem) => {
                  const relId = relItem._id || relItem.id
                  const price =
                    typeof relItem.price === 'number'
                      ? relItem.price
                      : parseFloat(relItem.price) || 0
                  const rawImg =
                    (Array.isArray(relItem.images) && relItem.images[0]) ||
                    relItem.image ||
                    relItem.imageUrl ||
                    ''
                  const displayImg = rawImg
                    ? mediaUrl(rawImg)
                    : 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'

                  return (
                    <Link
                      key={relId}
                      to={`/user/products/${relId}`}
                      className="group rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="aspect-square w-full rounded-lg bg-slate-50 p-2 overflow-hidden mb-2">
                        <img
                          src={displayImg}
                          alt={relItem.name}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h4 className="line-clamp-1 text-xs font-bold text-slate-900 group-hover:text-blue-600">
                        {relItem.name}
                      </h4>
                      <div className="mt-1 text-xs font-extrabold text-slate-900">
                        ${price.toFixed(2)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

