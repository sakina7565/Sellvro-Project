import { Truck, FileText, Coins, Scale, AlertTriangle, Clock, Wallet } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { USER_FEATURED_MODULE, USER_GRID_MODULES } from '../../lib/userDashboardModules.js'

const OVERVIEW_STATS = [
  { label: 'Fulfillment Orders', value: 0, icon: Truck, tone: 'yellow' },
  { label: 'Pending Orders', value: 0, icon: FileText, tone: 'blue' },
  { label: 'Total Invoices', value: 0, icon: Coins, tone: 'pink' },
  { label: 'Billing (Paid)', value: '$0', icon: Scale, tone: 'teal' },
]

const PENDING_TASKS = [
  { label: 'Disputes', value: 0, icon: AlertTriangle, tone: 'red' },
  { label: 'Pending Fulfillment', value: 0, icon: Clock, tone: 'yellow' },
  { label: 'Pending Amount', value: '$0', icon: Wallet, tone: 'teal' },
]

function UserDashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'User'

  return (
    <UserLayout>
      <PanelDashboard
        panelLabel="Client Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="You Are Just A Step Ahead In Finding Your Inventory Control Strategies."
        featuredModule={USER_FEATURED_MODULE}
        gridModules={USER_GRID_MODULES}
        overviewStats={OVERVIEW_STATS}
        pendingTasks={PENDING_TASKS}
      />
    </UserLayout>
  )
}

export default UserDashboardPage
