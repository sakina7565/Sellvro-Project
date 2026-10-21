import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { productApi } from '../lib/api.js'

function LandingPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All Categories')
  const [activeSubcategory, setActiveSubcategory] = useState('')
  const [liveProducts, setLiveProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Fetch active marketplace products from API
  useEffect(() => {
    let isMounted = true
    productApi
      .marketplace()
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data)) {
          setLiveProducts(res.data)
        }
      })
      .catch(() => {
        // Fallback to curated marketplaceData if backend DB is empty
      })
      .finally(() => {
        if (isMounted) setLoadingProducts(false)
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

  // Handle Category Quick Selection (with subcategory support)
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
      />

      {/* 3. Horizontal Category Ribbon (ONLY Main Categories with Subcategory Dropdowns) */}
      <MarketplaceCategoryNav
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main Content Sections */}
      <main className="pb-12">
        {/* 4. Top Hero Banner Carousel */}
        <MarketplaceHeroCarousel />

        {/* 5. "The future in your hands" Category Cards Grid */}
        <MarketplaceCategoryGrid onSelectCategory={(cat) => handleSelectCategory(cat, '')} />

        {/* 6. "Sourcing made easy" & Promo Deal Banner */}
        <MarketplacePromoBanner />

        {/* 7. "Today's Deals" Product Showcase */}
        <MarketplaceDeals
          products={liveProducts}
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
        />

        {/* 8. "Trending on Sellvro" Round Category Spotlight */}
        <MarketplaceTrending onSelectCategory={handleSelectCategory} />

        {/* 9. Dark 3PL Warehouse & Logistics Showcase Banner */}
        <MarketplaceDarkBanner />
      </main>

      {/* 10. Comprehensive eBay-Style Multi-Column Footer */}
      <MarketplaceFooter />
    </div>
  )
}

export default LandingPage
