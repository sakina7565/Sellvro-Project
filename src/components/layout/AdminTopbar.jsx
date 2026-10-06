import { useEffect, useRef, useState, useMemo } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  Key,
  LogOut,
  Menu,
  Search,
  User,
  ShieldCheck,
  CheckCheck,
  AlertCircle,
  X,
  Loader2,
  Package,
  ShoppingBag,
  Compass,
  Check,
  DollarSign,
} from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'
import { getRedirectForUser } from '../../lib/authRedirect.js'
import { isSuperAdmin } from '../../lib/permissions.js'
import { notificationApi, searchApi, mediaUrl } from '../../lib/api.js'
import ChangePasswordModal from '../admin/ChangePasswordModal.jsx'

function formatRelativeTime(dateInput) {
  if (!dateInput) return ''
  try {
    const date = new Date(dateInput)
    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 45) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Two-tier panel header matching the design screenshot:
 * top utility links + logo / live-search / notifications & profile actions row.
 * Includes interactive live search dropdown and notification manager.
 */
function AdminTopbar({ name, onMenuClick = () => {}, showMenuButton = true }) {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isSuper = isSuperAdmin(user)

  const [menuOpen, setMenuOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  // Notification States
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifFilter, setNotifFilter] = useState('all') // 'all' | 'unread'

  // Search States
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const menuRef = useRef(null)
  const notifRef = useRef(null)
  const searchContainerRef = useRef(null)
  const searchDebounceRef = useRef(null)

  const displayName = name || user?.fullName || 'User'
  const homePath = getRedirectForUser(user) || '/'
  const { unreadCount: disputeUnread } = useDisputeNotifications()

  // Load notifications from API
  const loadNotifications = async () => {
    if (!isAuthenticated) return
    try {
      const res = await notificationApi.list()
      setNotifications(res?.data || [])
      setUnreadCount(res?.unreadCount || 0)
    } catch {
      // Graceful fallback
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications()
      const interval = setInterval(loadNotifications, 25000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  // Sync query with URL param when present
  useEffect(() => {
    const currentQ = searchParams.get('q')
    if (currentQ !== null) {
      setQuery(currentQ)
    }
  }, [searchParams])

  // Live Search debouncing
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults(null)
      setSearchLoading(false)
      setSearchOpen(false)
      setSelectedIndex(-1)
      return
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.search(trimmed)
        setSearchResults(res?.results || null)
        setSearchOpen(true)
        setSelectedIndex(-1)
      } catch {
        setSearchResults(null)
      } finally {
        setSearchLoading(false)
      }
    }, 220)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [query])

  // Click outside and Escape key handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setNotificationsOpen(false)
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = async () => {
    setMenuOpen(false)
    const loginPath = user?.role === 'admin' ? '/admin/login' : '/login'
    try {
      await logout()
    } finally {
      navigate(loginPath, { replace: true })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      //
    }
  }

  const handleMarkOneRead = async (id, link) => {
    try {
      await notificationApi.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      //
    }
    if (link) {
      setNotificationsOpen(false)
      navigate(link)
    }
  }

  // Flatten search results for keyboard navigation
  const flattenedResults = useMemo(() => {
    if (!searchResults) return []
    const list = []
    ;(searchResults.pages || []).forEach((item) => list.push({ ...item, category: 'Pages' }))
    ;(searchResults.products || []).forEach((item) => list.push({ ...item, category: 'Products' }))
    ;(searchResults.orders || []).forEach((item) => list.push({ ...item, category: 'Orders' }))
    ;(searchResults.users || []).forEach((item) => list.push({ ...item, category: 'Users' }))
    return list
  }, [searchResults])

  const handleKeyDown = (e) => {
    if (!searchOpen || flattenedResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < flattenedResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flattenedResults.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      const selected = flattenedResults[selectedIndex]
      if (selected?.link) {
        setSearchOpen(false)
        navigate(selected.link)
      }
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (selectedIndex >= 0 && flattenedResults[selectedIndex]?.link) {
      setSearchOpen(false)
      navigate(flattenedResults[selectedIndex].link)
      return
    }

    setSearchOpen(false)
    const trimmed = query.trim()
    let basePath = '/user/products'
    if (location.pathname.startsWith('/admin') || user?.role === 'admin') {
      basePath = '/admin/products'
    } else if (location.pathname.startsWith('/supplier') || user?.role === 'supplier') {
      basePath = '/supplier/products'
    }
    navigate(trimmed ? `${basePath}?q=${encodeURIComponent(trimmed)}` : basePath)
  }

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(homePath)
  }

  const totalUnread = unreadCount + (disputeUnread || 0)

  const displayedNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.isRead)
    }
    return notifications
  }, [notifications, notifFilter])

  const getRoleLabel = () => {
    if (user?.role === 'supplier') return 'Supplier'
    if (user?.role === 'customer' || user?.role === 'user') return 'Customer'
    if (isSuper) return 'Super Admin'
    return user?.adminRoleName || 'Sub-Admin Staff'
  }

  const getNotifIcon = (type) => {
    switch (type) {
      case 'security':
        return { icon: Key, bg: 'bg-amber-100 text-amber-700' }
      case 'dispute':
        return { icon: AlertCircle, bg: 'bg-rose-100 text-rose-700' }
      case 'order':
        return { icon: ShoppingBag, bg: 'bg-blue-100 text-blue-700' }
      case 'product':
        return { icon: Package, bg: 'bg-purple-100 text-purple-700' }
      case 'payout':
        return { icon: DollarSign, bg: 'bg-emerald-100 text-emerald-700' }
      default:
        return { icon: Bell, bg: 'bg-primary-100 text-primary-700' }
    }
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        {/* Top utility row */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500 sm:text-sm md:px-8">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:gap-x-8 md:gap-x-12">
            <button type="button" className="font-medium text-slate-500 transition-colors hover:text-slate-800">
              Helpline &amp; Contact
            </button>
            <button type="button" className="font-medium text-slate-500 transition-colors hover:text-slate-800">
              Managing (Global)
            </button>
            <button
              type="button"
              onClick={() => isAuthenticated && setPasswordModalOpen(true)}
              className="font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Your Profile Setting
            </button>
          </div>
        </div>

        {/* Main row: logo + full-width search + actions */}
        <div className="flex min-w-0 items-center gap-2 px-4 py-3 sm:gap-3 md:gap-4 md:px-8">
          <div className="flex shrink-0 items-center gap-2">
            {showMenuButton && (
              <button
                type="button"
                onClick={onMenuClick}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Link to={homePath} className="shrink-0 flex items-center">
              <Logo size="md" className="h-7 sm:h-8 w-auto object-contain object-left" />
            </Link>
          </div>

          {/* Interactive Search Bar with Live Results Dropdown */}
          <div className="relative min-w-0 flex-1" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="flex w-full overflow-hidden rounded-full border border-slate-700 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <div className="relative flex min-w-0 flex-1 items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      if (!searchOpen && e.target.value.trim()) setSearchOpen(true)
                    }}
                    onFocus={() => {
                      if (query.trim()) setSearchOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products, SKU, orders, sections..."
                    className="h-10 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    autoComplete="off"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('')
                        setSearchResults(null)
                        setSearchOpen(false)
                      }}
                      className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="h-10 shrink-0 bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:px-5 flex items-center gap-1.5"
                >
                  {searchLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Search</span>
                      <Search className="h-4 w-4 sm:hidden" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Live Search Floating Dropdown */}
            {searchOpen && query.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[460px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                {searchLoading && !searchResults && (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Searching across products, orders &amp; pages…
                  </div>
                )}

                {searchResults && (
                  <div className="divide-y divide-slate-100">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500">
                      <span>Live Results for &ldquo;{query}&rdquo;</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        {flattenedResults.length} matches
                      </span>
                    </div>

                    {/* Section: Pages / Quick Navigation */}
                    {searchResults.pages?.length > 0 && (
                      <div className="py-1.5">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Pages &amp; Navigation
                        </div>
                        {searchResults.pages.map((p) => {
                          const flatIdx = flattenedResults.findIndex((x) => x.id === p.id)
                          const isSelected = selectedIndex === flatIdx
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSearchOpen(false)
                                navigate(p.link)
                              }}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors ${
                                isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <Compass className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900">{p.title}</p>
                                <p className="text-[11px] text-slate-500">{p.subtitle}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Section: Products */}
                    {searchResults.products?.length > 0 && (
                      <div className="py-1.5">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Products
                        </div>
                        {searchResults.products.map((p) => {
                          const flatIdx = flattenedResults.findIndex((x) => x.id === p.id)
                          const isSelected = selectedIndex === flatIdx
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSearchOpen(false)
                                navigate(p.link)
                              }}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors ${
                                isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                {p.photo ? (
                                  <img
                                    src={mediaUrl(p.photo)}
                                    alt={p.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">{p.title}</p>
                                <p className="text-[11px] text-slate-500">{p.subtitle}</p>
                              </div>
                              {p.price !== undefined && (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                  ${Number(p.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Section: Orders */}
                    {searchResults.orders?.length > 0 && (
                      <div className="py-1.5">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Orders
                        </div>
                        {searchResults.orders.map((o) => {
                          const flatIdx = flattenedResults.findIndex((x) => x.id === o.id)
                          const isSelected = selectedIndex === flatIdx
                          return (
                            <div
                              key={o.id}
                              onClick={() => {
                                setSearchOpen(false)
                                navigate(o.link)
                              }}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors ${
                                isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <ShoppingBag className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900">{o.title}</p>
                                <p className="text-[11px] text-slate-500">{o.subtitle}</p>
                              </div>
                              {o.status && (
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {o.status}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Section: Users & Staff */}
                    {searchResults.users?.length > 0 && (
                      <div className="py-1.5">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Users &amp; Accounts
                        </div>
                        {searchResults.users.map((u) => {
                          const flatIdx = flattenedResults.findIndex((x) => x.id === u.id)
                          const isSelected = selectedIndex === flatIdx
                          return (
                            <div
                              key={u.id}
                              onClick={() => {
                                setSearchOpen(false)
                                navigate(u.link)
                              }}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors ${
                                isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900">{u.title}</p>
                                <p className="text-[11px] text-slate-500">{u.subtitle}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Empty State */}
                    {flattenedResults.length === 0 && !searchLoading && (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-700">No results found for &ldquo;{query}&rdquo;</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Try searching by Product title, SKU, Order number, or navigation section.
                        </p>
                      </div>
                    )}

                    {/* Footer Submit Action */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-50 transition-colors"
                      >
                        <span>View all matching results for &ldquo;{query}&rdquo;</span>
                        <span className="text-[11px] text-slate-400">Press Enter ↵</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Notifications + Profile */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {/* Notification Bell with Filter Tabs & Live Updates */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                {totalUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  {/* Dropdown Header */}
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-slate-800">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Filter tabs: All vs Unread */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNotifFilter('all')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          notifFilter === 'all'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter('unread')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          notifFilter === 'unread'
                            ? 'bg-white text-rose-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {displayedNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        {notifFilter === 'unread' ? (
                          <p>You have no unread notifications.</p>
                        ) : (
                          <p>No notifications at this time.</p>
                        )}
                      </div>
                    ) : (
                      displayedNotifications.map((n) => {
                        const { icon: IconComp, bg } = getNotifIcon(n.type)
                        return (
                          <div
                            key={n.id}
                            onClick={() => n.link && handleMarkOneRead(n.id, n.link)}
                            className={`flex items-start justify-between gap-3 p-3.5 text-xs transition-colors ${
                              n.link ? 'cursor-pointer hover:bg-slate-50' : ''
                            } ${!n.isRead ? 'bg-primary-50/30' : ''}`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span
                                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bg}`}
                              >
                                <IconComp className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 leading-snug">{n.title}</p>
                                <p className="mt-0.5 text-slate-600 leading-relaxed break-words">{n.message}</p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {formatRelativeTime(n.createdAt)}
                                </p>
                              </div>
                            </div>
                            {!n.isRead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkOneRead(n.id)
                                }}
                                className="shrink-0 flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                                title="Mark read"
                              >
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span>Read</span>
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => isAuthenticated && setMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600"
                aria-label="Profile menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={displayName}
              >
                <User className="h-5 w-5" fill="currentColor" strokeWidth={0} />
              </button>

              {menuOpen && isAuthenticated && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-soft"
                >
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                    {user?.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
                    <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {getRoleLabel()}
                    </span>
                  </div>

                  <Link
                    to={homePath}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    My Dashboard
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setPasswordModalOpen(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Key className="h-4 w-4 text-slate-400" />
                    Change Password
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  )
}

export default AdminTopbar
