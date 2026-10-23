import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ArrowRight, Layers } from 'lucide-react'
import { categoryApi } from '../../lib/api.js'

// Realistic fallback categories and subcategories matching Sellvro's marketplace domain
const DEFAULT_MAIN_CATEGORIES = [
  {
    id: 'cat-electronics',
    name: 'Electronics & Tech',
    subcategories: [
      'Laptops & Computers',
      'Computer Parts & Motherboards',
      'Smartphones & Mobile Tech',
      'Enterprise Storage & SSDs',
      'Audio & Commercial Gear',
    ],
  },
  {
    id: 'cat-mechanical',
    name: 'Mechanical & Auto Parts',
    subcategories: [
      'Bearings & Bushings',
      'Automotive Engine Parts',
      'Hydraulic Systems & Pumps',
      'Industrial Turbines & Valves',
      'Heavy Equipment Components',
    ],
  },
  {
    id: 'cat-footwear',
    name: 'Footwear & Apparel',
    subcategories: [
      'Industrial Safety Boots',
      'Tactical & Workwear Shoes',
      'Protective Uniforms & Apparel',
      'Athletic & Sneaker Lots',
      'High-Visibility Safety Gear',
    ],
  },
  {
    id: 'cat-warehouse',
    name: '3PL Warehouse In-Stock',
    isSpecial: true,
    badge: '3PL Hub',
    subcategories: [
      'Fast-Dispatch Pallet Lots',
      'Pre-Barcoded Inventory',
      'Ready-to-Ship Tech SKUs',
      'Supplier Consignment Lots',
      'Same-Day Fulfillable Stock',
    ],
  },
  {
    id: 'cat-tools',
    name: 'Industrial & Tools',
    subcategories: [
      'Cordless Power Tools',
      'Hand Tools & Wrenches',
      'Welding & Fabrication Gear',
      'Fasteners & Industrial Hardware',
      'Precision Measuring Equipment',
    ],
  },
  {
    id: 'cat-networking',
    name: 'Enterprise & Networking',
    subcategories: [
      'Commercial Switches & Routers',
      'Server Racks & Accessories',
      'Fiber Optic & Patch Cables',
      'Network Attached Storage (NAS)',
      'Enterprise Firewall Devices',
    ],
  },
  {
    id: 'cat-storage',
    name: 'Storage & Hardware',
    subcategories: [
      'Enterprise NVMe M.2 Drives',
      'SATA & SAS Hard Drives',
      'Server Memory & ECC RAM',
      'Enclosures & Backup Systems',
      'Industrial Flash Storage',
    ],
  },
]

function MarketplaceCategoryNav({ activeCategory, onSelectCategory }) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState(DEFAULT_MAIN_CATEGORIES)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const navRef = useRef(null)

  // Fetch real categories from Sellvro backend API
  useEffect(() => {
    let isMounted = true
    categoryApi
      .list()
      .then((res) => {
        if (isMounted && res?.data && res.data.length > 0) {
          // Merge API categories with our defaults if API has limited categories
          const apiCats = res.data.map((cat) => ({
            id: cat.id || cat._id,
            name: cat.name,
            subcategories:
              Array.isArray(cat.subcategories) && cat.subcategories.length > 0
                ? cat.subcategories
                : DEFAULT_MAIN_CATEGORIES.find(
                    (d) => d.name.toLowerCase() === cat.name.toLowerCase()
                  )?.subcategories || [
                    `${cat.name} Bulk Lots`,
                    `${cat.name} 3PL Stock`,
                    `Wholesale ${cat.name}`,
                  ],
          }))
          setCategories(apiCats)
        }
      })
      .catch(() => {
        // Retain default marketplace categories
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubcategoryClick = (catName, subName) => {
    setOpenDropdownId(null)
    if (onSelectCategory) {
      onSelectCategory(catName, subName)
    } else {
      navigate(
        `/user/products?category=${encodeURIComponent(catName)}&q=${encodeURIComponent(subName)}`
      )
    }
  }

  const handleCategoryClick = (cat) => {
    // If has subcategories, toggle dropdown; otherwise navigate directly
    if (openDropdownId === cat.id) {
      setOpenDropdownId(null)
    } else {
      setOpenDropdownId(cat.id)
    }
  }

  return (
    <nav className="relative z-40 border-b border-slate-200 bg-white" ref={navRef}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-y-2 py-2 text-xs text-slate-700">
          {categories.map((cat, index) => {
            const isOpen = openDropdownId === cat.id
            const isActive = activeCategory === cat.name
            const hasSubs = Array.isArray(cat.subcategories) && cat.subcategories.length > 0
            const isRightSide = index >= categories.length - 2

            return (
              <div
                key={cat.id || cat.name}
                className="relative"
                onMouseEnter={() => setOpenDropdownId(cat.id)}
                onMouseLeave={() => setOpenDropdownId(null)}
              >
                <button
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex items-center gap-1.5 py-1.5 transition-colors focus:outline-none ${
                    isActive || isOpen
                      ? 'font-bold text-blue-600'
                      : 'hover:text-blue-600 font-medium'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.badge && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      {cat.badge}
                    </span>
                  )}
                  {hasSubs && (
                    <ChevronDown
                      className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Subcategory Dropdown Panel (eBay Style) */}
                {isOpen && hasSubs && (
                  <div
                    className={`absolute ${
                      isRightSide ? 'right-0' : 'left-0'
                    } top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150`}
                  >
                    <div className="mb-2 border-b border-slate-100 pb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {cat.name}
                      </p>
                    </div>

                    <ul className="space-y-1">
                      {cat.subcategories.map((sub, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => handleSubcategoryClick(cat.name, sub)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                          >
                            <span>{sub}</span>
                            <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-blue-600 opacity-60" />
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <Link
                        to={`/user/products?category=${encodeURIComponent(cat.name)}`}
                        onClick={() => setOpenDropdownId(null)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1"
                      >
                        <Layers className="h-3 w-3" />
                        <span>All {cat.name} Products</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default MarketplaceCategoryNav
