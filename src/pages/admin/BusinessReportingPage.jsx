import AdminLayout from '../../components/layout/AdminLayout.jsx'
import BusinessReportingContent from '../../components/products/BusinessReportingContent.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { BUSINESS_PROFILE } from '../../lib/mockBusinessReportData.js'

function AdminBusinessReportingPage() {
  const { user } = useAuth()

  const profile = {
    ...BUSINESS_PROFILE,
    name: user?.fullName || 'Admin',
    email: user?.email || BUSINESS_PROFILE.email,
    ownerId: 'ADM-PAK1001',
    business: 'Sellvro Warehouse',
    status: 'Approved',
  }

  return (
    <AdminLayout>
      <BusinessReportingContent profile={profile} panel="admin" />
    </AdminLayout>
  )
}

export default AdminBusinessReportingPage
