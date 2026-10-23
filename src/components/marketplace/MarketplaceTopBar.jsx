import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  ShoppingCart,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Package,
  Store,
  ShieldCheck,
  Globe,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getRedirectForUser } from '../../lib/authRedirect.js'

function MarketplaceTopBar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const [mySellvroOpen, setMySellvroOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const mySellvroRef = useRef(null)
  const profileRef = useRef(null)

  const dashboardPath = getRedirectForUser(user) || '/login'
  const displayName = user?.fullName || 'User'

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (mySellvroRef.current && !mySellvroRef.current.contains(event.target)) {
        setMySellvroOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setProfileOpen(false)
    const loginPath = user?.role === 'admin' ? '/admin/login' : '/login'
    try {
      await logout()
    } finally {
      navigate(loginPath, { replace: true })
    }
  }

  return (
    <div className="border-b border-slate-200 bg-white text-xs text-slate-600">
      <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left Side Links */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-1.5 font-medium text-slate-800 hover:text-blue-600 focus:outline-none"
              >
                <span>
                  Hi, <strong className="font-semibold text-slate-900">{displayName}</strong>!
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="font-semibold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{user?.role} Account</p>
                  </div>
                  <Link
                    to={dashboardPath}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-600" />
                    <span>My Dashboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span>Hi!</span>
              <Link to="/login" className="font-medium text-blue-600 underline hover:text-blue-700">
                Sign in
              </Link>
              <span>or</span>
              <Link to="/register" className="font-medium text-blue-600 underline hover:text-blue-700">
                register
              </Link>
            </div>
          )}

          <span className="hidden text-slate-300 md:inline">|</span>
          <Link to="/user/products" className="hidden text-slate-600 hover:text-blue-600 md:inline">
            Daily B2B Deals
          </Link>
          <Link to="/user/products" className="hidden text-slate-600 hover:text-blue-600 lg:inline">
            Brand Outlet
          </Link>
          <Link to="/user/disputes" className="hidden text-slate-600 hover:text-blue-600 lg:inline">
            Help & Dispute Center
          </Link>
        </div>

        {/* Right Side Links */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1 text-slate-600 hover:text-blue-600 sm:flex cursor-pointer">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>Ship to Global / USD</span>
          </div>

          <Link
            to={user?.role === 'supplier' ? '/supplier/dashboard' : '/register?role=supplier'}
            className="hidden font-medium text-slate-700 hover:text-blue-600 sm:inline"
          >
            Sell on Sellvro
          </Link>

          <Link
            to="/register?role=supplier"
            className="hidden text-slate-600 hover:text-blue-600 md:inline"
          >
            3PL Warehousing
          </Link>

          {/* My Sellvro dropdown */}
          <div className="relative" ref={mySellvroRef}>
            <button
              type="button"
              onClick={() => setMySellvroOpen((o) => !o)}
              className="flex items-center gap-1 text-slate-700 hover:text-blue-600 focus:outline-none"
            >
              <span>My Sellvro</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {mySellvroOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Quick Portals
                </p>
                <Link
                  to={dashboardPath}
                  onClick={() => setMySellvroOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <LayoutDashboard className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">Dashboard</p>
                    <p className="text-[11px] text-slate-500">Go to your account workspace</p>
                  </div>
                </Link>
                <Link
                  to="/user/orders"
                  onClick={() => setMySellvroOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <Package className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-900">Purchases & Orders</p>
                    <p className="text-[11px] text-slate-500">Track shipments and status</p>
                  </div>
                </Link>
                <Link
                  to="/register?role=supplier"
                  onClick={() => setMySellvroOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <Store className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="font-medium text-slate-900">Supplier Portal</p>
                    <p className="text-[11px] text-slate-500">List wholesale items & 3PL</p>
                  </div>
                </Link>
                <Link
                  to="/user/disputes"
                  onClick={() => setMySellvroOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="font-medium text-slate-900">Resolution Center</p>
                    <p className="text-[11px] text-slate-500">Escrow dispute protection</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <Link
            to={isAuthenticated ? '/user/dashboard' : '/login'}
            className="text-slate-600 hover:text-blue-600 relative p-1"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
            </span>
          </Link>

          {/* Cart Icon */}
          <Link
            to={isAuthenticated ? '/user/orders' : '/login'}
            className="text-slate-700 hover:text-blue-600 relative p-1"
            title="Orders & Cart"
          >
            <ShoppingCart className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default MarketplaceTopBar
