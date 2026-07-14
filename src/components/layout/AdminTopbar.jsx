import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/**
 * Top bar shared by admin / supplier / user panels and onboarding
 * screens. Logout lives in the profile picture dropdown.
 */
function AdminTopbar({ name, onMenuClick = () => {}, showMenuButton = true }) {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const displayName = name || user?.fullName || 'User'

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

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-surface-card px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
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
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">Welcome, {displayName}</p>
          <p className="text-xs text-slate-400">{today}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-slate-400 sm:gap-4">
        <button className="relative rounded-full p-2 hover:bg-slate-50 hover:text-slate-600" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => isAuthenticated && setMenuOpen((open) => !open)}
            className="rounded-full p-1 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Profile menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <UserCircle className="h-7 w-7" />
          </button>

          {menuOpen && isAuthenticated && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-soft"
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
    </header>
  )
}

export default AdminTopbar
