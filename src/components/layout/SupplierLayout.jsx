import { useState } from 'react'
import SupplierSidebar from './SupplierSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function SupplierLayout({ children, topbarName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-surface-bg">
      <SupplierSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminTopbar
          name={topbarName || user?.fullName || 'Supplier'}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}

export default SupplierLayout
