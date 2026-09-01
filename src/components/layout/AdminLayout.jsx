import { useState, useMemo } from 'react'
import AdminSidebar from './AdminSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import HorizontalNav from './HorizontalNav.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { ADMIN_NAV_ITEMS } from '../../lib/adminNav.js'
import { filterAdminNavItems } from '../../lib/permissions.js'

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const navItems = useMemo(() => filterAdminNavItems(ADMIN_NAV_ITEMS, user), [user])

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-white">
      <AdminSidebar navItems={navItems} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden bg-white">
        <AdminTopbar name={user?.fullName || 'Admin'} onMenuClick={() => setSidebarOpen(true)} />
        <HorizontalNav navItems={navItems} />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-white px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
