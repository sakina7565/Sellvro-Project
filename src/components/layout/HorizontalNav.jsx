import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'

/**
 * Desktop horizontal nav with a visible sub-category row.
 * Hover or click a parent (Products, Suppliers, …) to show its
 * sub-pages in the row below — only one group open at a time.
 */
function HorizontalNav({ navItems = [] }) {
  const { pathname } = useLocation()
  const [openLabel, setOpenLabel] = useState(null)
  const { unreadCount } = useDisputeNotifications()

  const renderLabel = (label) => {
    if (label !== 'Disputes' || unreadCount <= 0) return label
    return (
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      </span>
    )
  }

  const matchingGroups = navItems.filter(
    (item) => Array.isArray(item.children) && item.children.some((child) => pathname.startsWith(child.to)),
  )

  const resolveGroupLabel = (preferredLabel) => {
    if (matchingGroups.length === 0) return null
    if (preferredLabel && matchingGroups.some((group) => group.label === preferredLabel)) {
      return preferredLabel
    }
    return matchingGroups[0].label
  }

  useEffect(() => {
    setOpenLabel((prev) => resolveGroupLabel(prev))
  }, [pathname, navItems])

  const displayGroup =
    navItems.find((item) => item.label === openLabel && item.children?.length) || null

  const handleParentClick = (label) => {
    setOpenLabel((prev) => (prev === label ? null : label))
  }

  const handleParentEnter = (label) => {
    setOpenLabel(label)
  }

  return (
    <nav
      className="relative z-30 hidden max-w-full overflow-x-hidden border-b border-slate-200 bg-white md:block"
      onMouseLeave={() => setOpenLabel(resolveGroupLabel(openLabel))}
    >
      <div className="flex max-w-full items-center justify-start gap-5 overflow-x-auto px-4 py-2.5 md:justify-center md:gap-7 md:px-8">
        {navItems.map((item) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0
          const isGroupActive =
            hasChildren && item.children.some((child) => pathname.startsWith(child.to))
          const isOpen = openLabel === item.label

          if (hasChildren) {
            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => handleParentEnter(item.label)}
                onClick={() => handleParentClick(item.label)}
                className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm transition-colors hover:text-slate-900 ${
                  isOpen || isGroupActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
                }`}
                aria-expanded={isOpen}
              >
                {renderLabel(item.label)}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to?.endsWith('/dashboard')}
              onMouseEnter={() => setOpenLabel(resolveGroupLabel(openLabel))}
              onClick={() => setOpenLabel(null)}
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
        <div
          key={displayGroup.label}
          className="flex max-w-full items-center justify-start gap-5 overflow-x-auto border-t border-slate-100 bg-white px-4 py-2.5 md:justify-center md:gap-6 md:px-8"
        >
          {displayGroup.children.map((child) => (
            <NavLink
              key={`${displayGroup.label}-${child.label}`}
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
