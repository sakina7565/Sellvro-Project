import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, LayoutDashboard } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import Button from '../ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getRedirectForUser } from '../../lib/authRedirect.js'

/**
 * Top navigation bar shown on the public landing page.
 * If the user is already logged in, shows a profile dropdown with
 * Dashboard link and Logout — instead of the plain Login/Get Started buttons.
 */
function PublicHeader() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const homePath = getRedirectForUser(user) || '/login'
  const displayName = user?.fullName || 'Account'

  const handleLogout = async () => {
    setMenuOpen(false)
    const loginPath = user?.role === 'admin' ? '/admin/login' : '/login'
    try {
      await logout()
    } finally {
      navigate(loginPath, { replace: true })
    }
  }

  // Close dropdown on outside click
  const handleBlur = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.relatedTarget)) {
      setMenuOpen(false)
    }
  }

  return (
    <header className="bg-surface-card">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center shrink-0">
          <Logo size="lg" className="h-8 sm:h-9 w-auto" />
        </Link>

        <nav className="flex items-center gap-6">
          {isAuthenticated ? (
            /* ── Logged-in: profile avatar + dropdown ── */
            <div className="relative" ref={menuRef} onBlur={handleBlur}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none"
                aria-label="Profile menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={displayName}
              >
                <User className="h-5 w-5" fill="currentColor" strokeWidth={0} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg"
                >
                  {/* User info */}
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                    {user?.email && (
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    )}
                    <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                      {user?.role || 'User'}
                    </span>
                  </div>

                  {/* Dashboard link */}
                  <Link
                    to={homePath}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-slate-400" />
                    Go to Dashboard
                  </Link>

                  {/* Logout */}
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
          ) : (
            /* ── Guest: Login + Get Started ── */
            <>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Button as={Link} to="/register" size="sm">
                Get Started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default PublicHeader
