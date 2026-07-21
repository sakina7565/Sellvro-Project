import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

/**
 * Compact hero-side card: light-blue panel with vertically stacked pill links.
 */
function HeroFeaturedCard({ title, description, links = [], className = '' }) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl bg-[#e8f2ff] p-3 sm:p-4 ${className}`}
    >
      <h3 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">{title}</h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">{description}</p>
      )}

      <div className="mt-2.5 flex flex-col gap-1.5">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className="group flex items-center justify-between gap-2 rounded-full bg-[#c5d9f7] px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <span className="leading-tight">{link.label}</span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-primary transition-colors group-hover:bg-white/20 group-hover:text-white">
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default HeroFeaturedCard
