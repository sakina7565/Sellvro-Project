import { useState } from 'react'
import AdminSidebar from './AdminSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import HorizontalNav from './HorizontalNav.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { ADMIN_NAV_ITEMS } from '../../lib/adminNav.js'

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col bg-white">
        <AdminTopbar name={user?.fullName || 'Admin'} onMenuClick={() => setSidebarOpen(true)} />
        <HorizontalNav navItems={ADMIN_NAV_ITEMS} />
        <main className="flex-1 bg-white px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
