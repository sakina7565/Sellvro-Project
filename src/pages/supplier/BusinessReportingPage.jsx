import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import BusinessReportingContent from '../../components/products/BusinessReportingContent.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { BUSINESS_PROFILE } from '../../lib/mockBusinessReportData.js'

function SupplierBusinessReportingPage() {
  const { user } = useAuth()

  const profile = {
    ...BUSINESS_PROFILE,
    name: user?.fullName || 'Supplier',
    email: user?.email || BUSINESS_PROFILE.email,
    ownerId: 'SUP-PAK2001',
    business: 'Supplier Business',
    status: 'Approved',
  }

  return (
    <SupplierLayout>
      <BusinessReportingContent profile={profile} panel="supplier" />
    </SupplierLayout>
  )
}

export default SupplierBusinessReportingPage
