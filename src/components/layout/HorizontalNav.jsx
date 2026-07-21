import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

/**
 * Desktop horizontal nav with a visible sub-category row.
 * Hover or click a parent (Products, Suppliers, …) to show its
 * sub-pages in the row below — always visible, not a clipped dropdown.
 */
function HorizontalNav({ navItems = [] }) {
  const { pathname } = useLocation()
  const [openLabel, setOpenLabel] = useState(null)

  const activeGroup = navItems.find(
    (item) => Array.isArray(item.children) && item.children.some((child) => pathname.startsWith(child.to)),
  )

  const displayGroup =
    navItems.find((item) => item.label === openLabel && item.children?.length) || activeGroup

  return (
    <nav
      className="relative z-30 hidden border-b border-slate-200 bg-white md:block"
      onMouseLeave={() => setOpenLabel(null)}
    >
      <div className="flex items-center justify-center gap-5 overflow-x-auto px-4 py-2.5 md:gap-7 md:px-8">
        {navItems.map((item) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0
          const isGroupActive =
            hasChildren && item.children.some((child) => pathname.startsWith(child.to))
          const isOpen = openLabel === item.label || isGroupActive

          if (hasChildren) {
            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setOpenLabel(item.label)}
                onClick={() => setOpenLabel((prev) => (prev === item.label ? null : item.label))}
                className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm transition-colors hover:text-slate-900 ${
                  isOpen ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
                }`}
                aria-expanded={isOpen}
              >
                {item.label}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to?.endsWith('/dashboard')}
              onMouseEnter={() => setOpenLabel(null)}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap text-sm transition-colors hover:text-slate-900 ${
                  isActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          )
        })}
      </div>

      {displayGroup?.children?.length > 0 && (
        <div className="flex items-center justify-center gap-5 overflow-x-auto border-t border-slate-100 bg-white px-4 py-2.5 md:gap-6 md:px-8">
          {displayGroup.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 font-semibold text-primary'
                    : 'font-medium text-slate-600 hover:bg-white hover:text-slate-900'
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

export default HorizontalNav
