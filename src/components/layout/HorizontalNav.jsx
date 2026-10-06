import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'

/**
 * Desktop horizontal nav with a visible sub-category row.
 * - Single-winner best matching: Exactly one group or top-level link can be active at a time.
 * - Prioritizes exact child route matches over partial prefix matches so that
 *   routes like /admin/users/complaines (Disputes) or /admin/users/roles (Settings)
 *   will NEVER falsely activate the "Users" tab.
 */
function HorizontalNav({ navItems = [] }) {
  const { pathname } = useLocation()
  const [openLabel, setOpenLabel] = useState(null)
  const { unreadCount } = useDisputeNotifications()

  const isDashboardRoute =
    pathname.endsWith('/dashboard') || pathname.endsWith('/dashboard/')

  // Check if current route matches an exact standalone top-level link (without children)
  const hasExactTopLevelMatch = navItems.some(
    (item) => !item.children?.length && item.to && pathname === item.to,
  )

  // Single-winner best matching group algorithm
  const activeGroup = (() => {
    if (isDashboardRoute || hasExactTopLevelMatch) return null

    // Priority 1: Exact child match (child.to === pathname)
    for (const item of navItems) {
      if (!Array.isArray(item.children)) continue
      const exact = item.children.some((child) => child.to === pathname)
      if (exact) return item
    }

    // Priority 2: Longest prefix child match (for dynamic sub-routes like /admin/products/:id)
    let bestItem = null
    let longestPrefixLen = 0

    for (const item of navItems) {
      if (!Array.isArray(item.children)) continue
      for (const child of item.children) {
        if (!child.to || child.to.endsWith('/dashboard')) continue
        if (pathname.startsWith(child.to + '/') && child.to.length > longestPrefixLen) {
          longestPrefixLen = child.to.length
          bestItem = item
        }
      }
    }

    return bestItem
  })()

  const activeGroupLabel = activeGroup?.label || null

  useEffect(() => {
    setOpenLabel(activeGroupLabel)
  }, [activeGroupLabel])

  const renderLabel = (label) => {
    if (!label?.includes('Dispute') || unreadCount <= 0) return label
    return (
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      </span>
    )
  }

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
      onMouseLeave={() => setOpenLabel(activeGroupLabel)}
    >
      <div className="flex max-w-full items-center justify-start gap-5 overflow-x-auto px-4 py-2.5 md:justify-center md:gap-7 md:px-8">
        {navItems.map((item) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0
          const isGroupActive = activeGroupLabel === item.label
          const isOpen = openLabel === item.label

          if (hasChildren) {
            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => handleParentEnter(item.label)}
                onClick={() => handleParentClick(item.label)}
                className={`relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-1 text-sm transition-colors hover:text-slate-900 ${
                  isOpen || isGroupActive
                    ? 'font-bold text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600 after:rounded-full'
                    : 'font-medium text-slate-600'
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
              onMouseEnter={() => setOpenLabel(activeGroupLabel)}
              onClick={() => setOpenLabel(null)}
              className={({ isActive }) =>
                `relative shrink-0 whitespace-nowrap py-1 text-sm transition-colors hover:text-slate-900 ${
                  isActive
                    ? 'font-bold text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600 after:rounded-full'
                    : 'font-medium text-slate-600'
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
                `shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 font-semibold text-primary'
                    : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
