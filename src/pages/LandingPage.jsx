import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LogIn,
  UserPlus,
  Warehouse,
  ShieldCheck,
  Zap,
  LayoutDashboard,
} from 'lucide-react'
import MarketplaceTopBar from '../components/marketplace/MarketplaceTopBar.jsx'
import MarketplaceSearchHeader from '../components/marketplace/MarketplaceSearchHeader.jsx'
import MarketplaceCategoryNav from '../components/marketplace/MarketplaceCategoryNav.jsx'
import MarketplaceHeroCarousel from '../components/marketplace/MarketplaceHeroCarousel.jsx'
import MarketplaceCategoryGrid from '../components/marketplace/MarketplaceCategoryGrid.jsx'
import MarketplacePromoBanner from '../components/marketplace/MarketplacePromoBanner.jsx'
import MarketplaceDeals from '../components/marketplace/MarketplaceDeals.jsx'
import MarketplaceTrending from '../components/marketplace/MarketplaceTrending.jsx'
import MarketplaceDarkBanner from '../components/marketplace/MarketplaceDarkBanner.jsx'
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter.jsx'
import { productApi, categoryApi, mediaUrl } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getRedirectForUser } from '../lib/authRedirect.js'
import { MARKETPLACE_CATEGORIES } from '../components/marketplace/marketplaceData.js'

function LandingPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [activeCategory, setActiveCategory] = useState('All Categories')
  const [activeSubcategory, setActiveSubcategory] = useState('')
  const [categories, setCategories] = useState(MARKETPLACE_CATEGORIES)
  const [liveProducts, setLiveProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const dashboardPath = getRedirectForUser(user) || '/user/dashboard'

  // Fetch real categories & approved products from Sellvro backend APIs
  useEffect(() => {
    let isMounted = true

    Promise.all([
      categoryApi.list().catch(() => ({ data: [] })),
      productApi.marketplace().catch(() => ({ data: [] })),
    ])
      .then(([catRes, prodRes]) => {
        if (!isMounted) return
        const prods = Array.isArray(prodRes?.data) ? prodRes.data : []
        setLiveProducts(prods)

        const apiCats = Array.isArray(catRes?.data) ? catRes.data : []
        if (apiCats.length > 0) {
          // Enrich categories with live product count and photos
          const enriched = apiCats.map((cat, idx) => {
            const catName = cat.name
            const matchingProds = prods.filter(
              (p) => p.category?.toLowerCase() === catName?.toLowerCase()
            )
            const repProd = matchingProds[0]
            const repImg =
              (repProd?.images && repProd.images[0] && mediaUrl(repProd.images[0])) ||
              (repProd?.image && mediaUrl(repProd.image)) ||
              MARKETPLACE_CATEGORIES[idx % MARKETPLACE_CATEGORIES.length]?.image ||
              'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'

            return {
              id: cat.id || cat._id || `cat-${idx}`,
              name: catName,
              products: matchingProds.length || cat.products || 0,
              count: `${matchingProds.length || cat.products || 0} items`,
              image: repImg,
              subcategories: cat.subcategories || [],
            }
          })

          // Complement with defaults if DB has fewer than 6 categories
          if (enriched.length < 6) {
            const existingNames = new Set(enriched.map((c) => c.name.toLowerCase()))
            MARKETPLACE_CATEGORIES.forEach((defCat) => {
              if (!existingNames.has(defCat.name.toLowerCase()) && enriched.length < 8) {
                enriched.push(defCat)
              }
            })
          }
          setCategories(enriched)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Handle Search Submission
  const handleSearch = ({ query, category, advSku, advMinPrice, advMaxPrice, advWarehouseOnly }) => {
    const params = new URLSearchParams()
    if (query?.trim()) params.set('q', query.trim())
    if (category && category !== 'All Categories') params.set('category', category)
    if (advSku?.trim()) params.set('sku', advSku.trim())
    if (advMinPrice) params.set('minPrice', advMinPrice)
    if (advMaxPrice) params.set('maxPrice', advMaxPrice)
    if (advWarehouseOnly) params.set('warehouse', 'true')
    navigate(`/user/products?${params.toString()}`)
  }

  // Handle Category Quick Selection
  const handleSelectCategory = (catName, subName = '') => {
    setActiveCategory(catName)
    setActiveSubcategory(subName)
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-slate-800 antialiased font-sans selection:bg-blue-500 selection:text-white">
      {/* 1. Micro Utility Header (eBay style) */}
      <MarketplaceTopBar />

      {/* 2. Main Search & Brand Header (eBay style) */}
      <MarketplaceSearchHeader
        onSearch={handleSearch}
        initialCategory={activeCategory}
        categories={categories}
      />

      {/* 3. Horizontal Category Ribbon */}
      <MarketplaceCategoryNav
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        categories={categories}
      />

      {/* Main Content Sections */}
      <main className="relative z-0 pb-12">
        {/* 4. Top Hero Banner Carousel */}
        <MarketplaceHeroCarousel />

        {/* 5. Client & Reseller Quick Portal Banner */}
        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-5 sm:p-7 text-white shadow-lg border border-slate-800">
            {/* Background ambient glow */}
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-bold text-blue-300 border border-blue-400/30">
                    <Zap className="h-3.5 w-3.5 text-blue-400" />
                    <span>Client & Reseller Portal</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
                    <Warehouse className="h-3 w-3" />
                    <span>3PL Automated Dispatch</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Launch Your Reselling Business with Direct Wholesale Sourcing
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Sign in to your client account to place bulk wholesale orders, manage store dropshipping, and route orders to our 3PL fulfillment warehouse with instant barcode tracking.
                </p>

                {/* Key feature pills */}
                <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Escrow Protected Funds</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="h-4 w-4 text-blue-400" />
                    <span>Live 3PL Warehouse Stock</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>Instant CSV & Store Push</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[240px]">
                {isAuthenticated ? (
                  <>
                    <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs border border-white/15">
                      <p className="text-xs text-slate-300">Signed in as:</p>
                      <p className="font-bold text-white text-sm truncate">{user?.fullName || 'Client'}</p>
                      <p className="text-[11px] text-blue-300 capitalize">{user?.role} Account</p>
                    </div>
                    <Link
                      to={dashboardPath}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-blue-500 transition focus:outline-none"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Open Client Dashboard</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-blue-500 transition focus:outline-none"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Client Sign In</span>
                    </Link>

                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-100 transition focus:outline-none"
                    >
                      <UserPlus className="h-4 w-4 text-blue-600" />
                      <span>Register as Reseller</span>
                    </Link>

                    <div className="pt-1 text-center">
                      <Link
                        to="/register?role=supplier"
                        className="text-[11px] text-slate-400 hover:text-white transition underline"
                      >
                        Are you a manufacturer? Join as Supplier →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6. "The future in your hands" Category Cards Grid */}
        <MarketplaceCategoryGrid
          categories={categories}
          onSelectCategory={(cat) => handleSelectCategory(cat, '')}
        />

        {/* 7. "Sourcing made easy" & Promo Deal Banner */}
        <MarketplacePromoBanner />

        {/* 8. "Today's Deals" Product Showcase */}
        <MarketplaceDeals
          products={liveProducts}
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
        />

        {/* 9. "Trending on Sellvro" Round Category Spotlight */}
        <MarketplaceTrending
          categories={categories}
          onSelectCategory={handleSelectCategory}
        />

        {/* 10. Dark 3PL Warehouse & Logistics Showcase Banner */}
        <MarketplaceDarkBanner />
      </main>

      {/* 11. Comprehensive eBay-Style Multi-Column Footer */}
      <MarketplaceFooter />
    </div>
  )
}

export default LandingPage
