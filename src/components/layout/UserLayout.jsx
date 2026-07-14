import { useState } from 'react'
import UserSidebar from './UserSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function UserLayout({ children, topbarName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-surface-bg">
      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminTopbar name={topbarName || user?.fullName || 'User'} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}

export default UserLayout
