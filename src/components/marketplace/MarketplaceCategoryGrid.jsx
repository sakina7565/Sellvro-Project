import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { MARKETPLACE_CATEGORIES } from './marketplaceData.js'

function MarketplaceCategoryGrid({ onSelectCategory, categories = [] }) {
  const activeCategories =
    Array.isArray(categories) && categories.length > 0 ? categories : MARKETPLACE_CATEGORIES

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            The future in your hands
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified wholesale lots, warehouse stocks, and industrial essentials
          </p>
        </div>
        <Link
          to="/user/products"
          className="group flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>See all categories</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4 md:grid-cols-8">
        {activeCategories.slice(0, 8).map((cat) => {
          const catImg =
            cat.image ||
            'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'
          const catCount = cat.count || (cat.products ? `${cat.products} items` : 'Explore')

          if (onSelectCategory) {
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className="group flex flex-col items-center text-center focus:outline-none"
              >
                <div className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-400 group-hover:shadow-md">
                  <img
                    src={catImg}
                    alt={cat.name}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'
                    }}
                  />
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-800 transition-colors group-hover:text-blue-600 line-clamp-2">
                  {cat.name}
                </span>
                <span className="text-[10px] text-slate-400">{catCount}</span>
              </button>
            )
          }

          return (
            <Link
              key={cat.id || cat.name}
              to={`/user/products?category=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center text-center focus:outline-none"
            >
              <div className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-400 group-hover:shadow-md">
                <img
                  src={catImg}
                  alt={cat.name}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'
                  }}
                />
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-800 transition-colors group-hover:text-blue-600 line-clamp-2">
                {cat.name}
              </span>
              <span className="text-[10px] text-slate-400">{catCount}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default MarketplaceCategoryGrid
