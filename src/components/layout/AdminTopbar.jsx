import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Key, LogOut, Menu, Search, User, ShieldCheck, CheckCheck } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'
import { getRedirectForUser } from '../../lib/authRedirect.js'
import { isSuperAdmin } from '../../lib/permissions.js'
import { adminApi } from '../../lib/api.js'
import ChangePasswordModal from '../admin/ChangePasswordModal.jsx'

/**
 * Two-tier panel header matching the design screenshot:
 * top utility links + logo / search / actions row.
 * Profile icon opens the profile/settings & logout dropdown.
 * Bell icon shows notifications (Security alerts for Super Admin, disputes for all).
 */
function AdminTopbar({ name, onMenuClick = () => {}, showMenuButton = true }) {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const isSuper = isSuperAdmin(user)

  const [menuOpen, setMenuOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [securityNotifications, setSecurityNotifications] = useState([])
  const [securityUnreadCount, setSecurityUnreadCount] = useState(0)
  const [query, setQuery] = useState('')

  const menuRef = useRef(null)
  const notifRef = useRef(null)

  const displayName = name || user?.fullName || 'Admin'
  const homePath = getRedirectForUser(user) || '/'
  const { unreadCount: disputeUnread } = useDisputeNotifications()

  const loadNotifications = async () => {
    if (!isSuper) return
    try {
      const res = await adminApi.notifications()
      setSecurityNotifications(res?.data || [])
      setSecurityUnreadCount(res?.unreadCount || 0)
    } catch {
      // Graceful fallback
    }
  }

  useEffect(() => {
    if (isSuper) {
      loadNotifications()
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isSuper])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setNotificationsOpen(false)
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
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead()
      setSecurityUnreadCount(0)
      setSecurityNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      //
    }
  }

  const handleMarkOneRead = async (id) => {
    try {
      await adminApi.markNotificationRead(id)
      setSecurityNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      )
      setSecurityUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      //
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
  }

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(homePath)
  }

  const totalUnread = isSuper ? securityUnreadCount + disputeUnread : disputeUnread

  return (
    <>
      <header className="overflow-x-hidden border-b border-slate-200 bg-white">
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
        <div className="flex min-w-0 items-center gap-2 overflow-hidden px-4 py-3 sm:gap-3 md:gap-4 md:px-8">
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
            <Link to={homePath} className="shrink-0">
              <Logo size="sm" className="max-w-[110px] object-contain object-left" />
            </Link>
          </div>

          <form onSubmit={handleSearch} className="min-w-0 flex-1">
            <div className="flex w-full overflow-hidden rounded-full border border-slate-700 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-100">
              <div className="relative flex min-w-0 flex-1 items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products or SKU"
                  className="h-10 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-10 shrink-0 bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:px-5"
              >
                <span className="hidden sm:inline">Search</span>
                <Search className="h-4 w-4 sm:hidden" />
              </button>
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {/* Notification Bell with Dropdown for Super Admin */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => isSuper ? setNotificationsOpen((prev) => !prev) : navigate('/admin/users/complaines')}
                className="relative rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                aria-label="Notifications"
                title={isSuper ? "Security & Platform Notifications" : "Dispute Notifications"}
              >
                <Bell className="h-6 w-6" strokeWidth={1.75} />
                {totalUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>

              {notificationsOpen && isSuper && (
                <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Security Alerts
                      </span>
                      {securityUnreadCount > 0 && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          {securityUnreadCount} new
                        </span>
                      )}
                    </div>
                    {securityUnreadCount > 0 && (
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

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {securityNotifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-slate-400">
                        No security or password change notifications.
                      </p>
                    ) : (
                      securityNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start justify-between gap-3 p-3.5 text-xs transition-colors ${
                            !n.isRead ? 'bg-primary-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                              <Key className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">{n.title}</p>
                              <p className="mt-0.5 text-slate-600 leading-relaxed break-words">{n.message}</p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                              </p>
                            </div>
                          </div>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkOneRead(n.id)}
                              className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                              title="Mark read"
                            >
                              Read
                            </button>
                          )}
                        </div>
                      ))
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
                      {isSuper ? 'Super Admin' : user?.adminRoleName || 'Sub-Admin Staff'}
                    </span>
                  </div>

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

