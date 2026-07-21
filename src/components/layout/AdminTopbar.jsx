import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Menu, Scale, Search, User } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getRedirectForUser } from '../../lib/authRedirect.js'

/**
 * Two-tier panel header matching the design screenshot:
 * top utility links + logo / search / actions row.
 * Profile icon opens the logout dropdown. Existing project logo is used.
 */
function AdminTopbar({ name, onMenuClick = () => {}, showMenuButton = true }) {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const menuRef = useRef(null)
  const displayName = name || user?.fullName || 'User'
  const homePath = getRedirectForUser(user) || '/'

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleSearch = (e) => {
    e.preventDefault()
  }

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(homePath)
  }

  return (
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
            onClick={() => isAuthenticated && setMenuOpen(true)}
            className="font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            Your Profile Setting
          </button>
        </div>
      </div>

      {/* Main row: logo + full-width search + actions */}
      <div className="flex items-center gap-3 px-4 py-3 md:gap-4 md:px-8">
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
              className="h-10 shrink-0 bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="relative rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Scale className="h-6 w-6" strokeWidth={1.75} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              5
            </span>
          </button>

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
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-soft"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                  {user?.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
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
  )
}

export default AdminTopbar
