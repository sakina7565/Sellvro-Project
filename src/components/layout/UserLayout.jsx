import { useState } from 'react'
import UserSidebar from './UserSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import HorizontalNav from './HorizontalNav.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { USER_NAV_ITEMS } from '../../lib/userNav.js'

function UserLayout({ children, topbarName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-white">
      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden bg-white">
        <AdminTopbar name={topbarName || user?.fullName || 'User'} onMenuClick={() => setSidebarOpen(true)} />
        <HorizontalNav navItems={USER_NAV_ITEMS} />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-white px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}

export default UserLayout
