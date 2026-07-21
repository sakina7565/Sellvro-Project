import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

/**
 * Light-blue dashboard module card with title, description and
 * vertically stacked pill-shaped subcategory links.
 */
function DashboardModuleCard({ title, description, links = [], className = '' }) {
  return (
    <div className={`rounded-2xl bg-[#ebf4ff] p-5 sm:p-6 ${className}`}>
      <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-center justify-between gap-2 rounded-full bg-[#d0e3ff] px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white sm:text-sm"
          >
            <span className="leading-tight">{link.label}</span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-primary transition-colors group-hover:bg-white/20 group-hover:text-white">
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default DashboardModuleCard
