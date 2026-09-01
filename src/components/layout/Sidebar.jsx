import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'

const linkClasses = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-50 text-primary'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
  }`

/**
 * Single sidebar entry. Renders a plain link, or, when `children` are
 * provided, an expandable group (e.g. Products -> All/Add/Categories).
 * Only one group can be expanded at a time (accordion).
 */
function NavItem({ item, expandedLabel, onToggle }) {
  const { pathname } = useLocation()
  const { unreadCount } = useDisputeNotifications()
  const hasChildren = Array.isArray(item.children) && item.children.length > 0
  const isChildActive = hasChildren && item.children.some((child) => pathname.startsWith(child.to))

  if (!hasChildren) {
    return (
      <NavLink to={item.to} className={linkClasses}>
        <item.icon className="h-[18px] w-[18px]" />
        {item.label}
      </NavLink>
    )
  }

  const isExpanded = expandedLabel === item.label
  const isGroupActive = isExpanded || isChildActive

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(item.label)}
        aria-expanded={isExpanded}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isGroupActive ? 'bg-primary-50 text-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        }`}
      >
        <item.icon className="h-[18px] w-[18px]" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.label === 'Disputes' && unreadCount > 0 ? (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="ml-[19px] mt-1 space-y-1 border-l border-slate-200 pl-4">
          {item.children.map((child) => (
            <NavLink
              key={`${item.label}-${child.label}`}
              to={child.to}
              end
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'font-semibold text-primary' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Mobile-only left navigation drawer. Hidden on desktop (md+);
 * desktop uses HorizontalNav instead.
 */
function Sidebar({ navItems, homeTo, isOpen = false, onClose = () => {} }) {
  const { pathname } = useLocation()

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

  const [expandedLabel, setExpandedLabel] = useState(() => resolveGroupLabel(null))

  useEffect(() => {
    setExpandedLabel((prev) => resolveGroupLabel(prev))
  }, [pathname, navItems])

  const handleToggle = (label) => {
    setExpandedLabel((prev) => (prev === label ? null : label))
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-100 bg-surface-card transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-6">
          <Link to={homeTo} onClick={onClose}>
            <Logo size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6" onClick={(e) => e.target.closest('a') && onClose()}>
          {navItems.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              expandedLabel={expandedLabel}
              onToggle={handleToggle}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
