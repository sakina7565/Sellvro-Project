import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronDown, SlidersHorizontal, Layers, Camera, Check } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { MARKETPLACE_CATEGORIES } from './marketplaceData.js'

function MarketplaceSearchHeader({ onSearch, initialQuery = '', initialCategory = 'All Categories' }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [shopByCategoryOpen, setShopByCategoryOpen] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false)

  // Advanced filters state
  const [advSku, setAdvSku] = useState('')
  const [advMinPrice, setAdvMinPrice] = useState('')
  const [advMaxPrice, setAdvMaxPrice] = useState('')
  const [advWarehouseOnly, setAdvWarehouseOnly] = useState(false)

  const shopCatRef = useRef(null)
  const catDropRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (shopCatRef.current && !shopCatRef.current.contains(event.target)) {
        setShopByCategoryOpen(false)
      }
      if (catDropRef.current && !catDropRef.current.contains(event.target)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (onSearch) {
      onSearch({ query, category, advSku, advMinPrice, advMaxPrice, advWarehouseOnly })
    } else {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category && category !== 'All Categories') params.set('category', category)
      navigate(`/user/products?${params.toString()}`)
    }
  }

  const handleCategorySelect = (catName) => {
    setCategory(catName)
    setCategoryDropdownOpen(false)
    setShopByCategoryOpen(false)
    if (onSearch) {
      onSearch({ query, category: catName, advSku, advMinPrice, advMaxPrice, advWarehouseOnly })
    }
  }

  const applyAdvancedFilters = () => {
    setAdvancedModalOpen(false)
    handleSubmit()
  }

  return (
    <div className="border-b border-slate-200 bg-white py-3.5">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 md:gap-5">
        {/* Brand Logo */}
        <Link to="/" className="shrink-0 flex items-center">
          <Logo size="lg" className="h-8 sm:h-9 w-auto" />
        </Link>

        {/* Shop by category button & popover */}
        <div className="relative hidden md:block" ref={shopCatRef}>
          <button
            type="button"
            onClick={() => setShopByCategoryOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 focus:outline-none"
          >
            <span>Shop by category</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {shopByCategoryOpen && (
            <div className="absolute left-0 top-full z-50 mt-3 w-[640px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  All Marketplace Verticals
                </span>
                <span className="text-xs text-blue-600 font-medium">B2B Verified Suppliers</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.name)}
                    className="flex flex-col items-center rounded-lg p-2.5 text-center transition hover:bg-slate-50"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                    </div>
                    <span className="mt-2 line-clamp-2 text-xs font-medium text-slate-800">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main eBay-Style Unified Search Bar */}
        <form onSubmit={handleSubmit} className="flex flex-1 items-center">
          <div className="flex w-full items-center rounded-full border-2 border-slate-900 focus-within:border-blue-600 bg-white transition-all shadow-sm">
            {/* Search Input */}
            <div className="relative flex flex-1 items-center pl-4">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything (Products, SKUs, Categories, Suppliers...)"
                className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* In-bar Category Selector */}
            <div className="relative hidden border-l border-slate-200 sm:block" ref={catDropRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 focus:outline-none whitespace-nowrap"
              >
                <span className="max-w-[130px] truncate">{category}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-60 w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect('All Categories')}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50 text-slate-700"
                  >
                    <span>All Categories</span>
                    {category === 'All Categories' && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </button>
                  {MARKETPLACE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.name)}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50 text-slate-700"
                    >
                      <span className="truncate">{cat.name}</span>
                      {category === cat.name && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Blue eBay Action Button */}
            <button
              type="submit"
              className="m-0.5 rounded-full bg-[#3665f3] px-5 sm:px-7 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none"
            >
              Search
            </button>
          </div>
        </form>

        {/* Advanced Search Link */}
        <button
          type="button"
          onClick={() => setAdvancedModalOpen(true)}
          className="hidden lg:flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 whitespace-nowrap focus:outline-none"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Advanced</span>
        </button>
      </div>

      {/* Advanced Search Modal */}
      {advancedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Advanced B2B Search</h3>
              <button
                type="button"
                onClick={() => setAdvancedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keywords / Title</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Industrial Bearing, Work Boots, NVMe SSD"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specific SKU Code</label>
                  <input
                    type="text"
                    value={advSku}
                    onChange={(e) => setAdvSku(e.target.value)}
                    placeholder="e.g. EZONE-2GDVOM"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="All Categories">All Categories</option>
                    {MARKETPLACE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Price ($)</label>
                  <input
                    type="number"
                    value={advMinPrice}
                    onChange={(e) => setAdvMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Price ($)</label>
                  <input
                    type="number"
                    value={advMaxPrice}
                    onChange={(e) => setAdvMaxPrice(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="advWarehouse"
                  checked={advWarehouseOnly}
                  onChange={(e) => setAdvWarehouseOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="advWarehouse" className="font-medium text-slate-700 cursor-pointer">
                  In Warehouse only (Fulfill by Sellvro 3PL)
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setAdvancedModalOpen(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAdvancedFilters}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Apply & Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarketplaceSearchHeader
