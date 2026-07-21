import { Truck, FileText, Coins, Scale, AlertTriangle, Clock, Wallet } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { FEATURED_MODULE, GRID_MODULES } from '../../lib/adminDashboardModules.js'

const OVERVIEW_STATS = [
  { label: 'Total Orders', value: 3, icon: Truck, tone: 'yellow' },
  { label: 'Pending Orders', value: 0, icon: FileText, tone: 'blue' },
  { label: 'Total Revenue', value: '$0', icon: Coins, tone: 'pink' },
  { label: 'Payments', value: '$400', icon: Scale, tone: 'teal' },
]

const PENDING_TASKS = [
  { label: 'Disputes', value: 2, icon: AlertTriangle, tone: 'red' },
  { label: 'Pending Suppliers', value: 12, icon: Clock, tone: 'yellow' },
  { label: 'Pending Payout', value: '$0', icon: Wallet, tone: 'teal' },
]

function DashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'Admin'

  return (
    <AdminLayout>
      <PanelDashboard
        panelLabel="Admin Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="Where Smart Inventory Meets Powerful Logistics — track products, orders, suppliers and finances from one place."
        featuredModule={FEATURED_MODULE}
        gridModules={GRID_MODULES}
        overviewStats={OVERVIEW_STATS}
        pendingTasks={PENDING_TASKS}
      />
    </AdminLayout>
  )
}

export default DashboardPage
