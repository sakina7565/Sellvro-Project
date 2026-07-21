import UserLayout from '../../components/layout/UserLayout.jsx'
import BusinessReportingContent from '../../components/products/BusinessReportingContent.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { BUSINESS_PROFILE } from '../../lib/mockBusinessReportData.js'

function BusinessReportingPage() {
  const { user } = useAuth()

  const profile = {
    ...BUSINESS_PROFILE,
    name: user?.fullName || BUSINESS_PROFILE.name,
    email: user?.email || BUSINESS_PROFILE.email,
  }

  return (
    <UserLayout>
      <BusinessReportingContent profile={profile} panel="user" />
    </UserLayout>
  )
}

export default BusinessReportingPage
