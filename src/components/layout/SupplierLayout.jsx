import { useState } from 'react'
import SupplierSidebar from './SupplierSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import HorizontalNav from './HorizontalNav.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUPPLIER_NAV_ITEMS } from '../../lib/supplierNav.js'

function SupplierLayout({ children, topbarName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-white">
      <SupplierSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col bg-white">
        <AdminTopbar
          name={topbarName || user?.fullName || 'Supplier'}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <HorizontalNav navItems={SUPPLIER_NAV_ITEMS} />
        <main className="flex-1 bg-white px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}

export default SupplierLayout
