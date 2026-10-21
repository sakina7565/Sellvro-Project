import { Link } from 'react-router-dom'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { TRENDING_VERTICALS } from './marketplaceData.js'

function MarketplaceTrending({ onSelectCategory }) {
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Trending on Sellvro
          </h2>
        </div>

        <Link
          to="/user/products"
          className="group flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>Explore all trending</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {TRENDING_VERTICALS.map((item) => {
          if (onSelectCategory) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectCategory(item.name)}
                className="group flex flex-col items-center text-center focus:outline-none"
              >
                <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50 p-2 shadow-xs transition-all duration-300 group-hover:border-blue-500 group-hover:shadow-lg group-hover:scale-105">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full rounded-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 rounded-full bg-blue-600/0 transition-colors group-hover:bg-blue-600/10" />
                </div>
                <span className="mt-3 text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {item.name}
                </span>
                <span className="text-[10px] text-slate-400">{item.count}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.id}
              to={`/user/products?category=${encodeURIComponent(item.name)}`}
              className="group flex flex-col items-center text-center focus:outline-none"
            >
              <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50 p-2 shadow-xs transition-all duration-300 group-hover:border-blue-500 group-hover:shadow-lg group-hover:scale-105">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full rounded-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 rounded-full bg-blue-600/0 transition-colors group-hover:bg-blue-600/10" />
              </div>
              <span className="mt-3 text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400">{item.count}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default MarketplaceTrending
