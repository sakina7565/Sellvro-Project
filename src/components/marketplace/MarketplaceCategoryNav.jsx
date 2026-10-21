import { Link } from 'react-router-dom'
import { Heart, Sparkles, Flame, Tag } from 'lucide-react'

const NAV_ITEMS = [
  { name: 'Home', path: '/', isSpecial: false },
  { name: 'Saved', path: '/user/products', icon: Heart, isSpecial: false },
  { name: 'Electronics & Tech', path: '/user/products?category=Electronics', isSpecial: false },
  { name: 'Mechanical & Motors', path: '/user/products?category=Mechanical+parts', isSpecial: false },
  { name: 'Footwear & Apparel', path: '/user/products?category=shoes', isSpecial: false },
  { name: '3PL Warehouse Stock', path: '/user/products?warehouse=true', isSpecial: true, badge: '3PL' },
  { name: 'Industrial & Tools', path: '/user/products?category=Tools', isSpecial: false },
  { name: 'Storage & Hardware', path: '/user/products?category=Storage', isSpecial: false },
  { name: "Today's Deals", path: '/user/products?deals=true', icon: Flame, isSpecial: true },
  { name: 'Sell on Sellvro', path: '/register?role=supplier', isSpecial: false },
]

function MarketplaceCategoryNav({ activeCategory, onSelectCategory }) {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center space-x-6 overflow-x-auto py-2.5 scrollbar-none text-xs text-slate-700">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeCategory === item.name

            if (onSelectCategory && !item.path.startsWith('/register')) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onSelectCategory(item.name)}
                  className={`flex shrink-0 items-center gap-1.5 transition-colors focus:outline-none ${
                    isActive
                      ? 'font-bold text-blue-600 border-b-2 border-blue-600 pb-0.5'
                      : 'hover:text-blue-600'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 text-amber-500" />}
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex shrink-0 items-center gap-1.5 transition-colors hover:text-blue-600 ${
                  isActive ? 'font-bold text-blue-600' : ''
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 text-amber-500" />}
                <span>{item.name}</span>
                {item.badge && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default MarketplaceCategoryNav
