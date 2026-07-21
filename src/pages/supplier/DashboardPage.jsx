import { Wallet, Box, ShoppingBag, DollarSign, Inbox, BarChart3, Banknote } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUPPLIER_FEATURED_MODULE, SUPPLIER_GRID_MODULES } from '../../lib/supplierDashboardModules.js'

const OVERVIEW_STATS = [
  { label: 'Approved', value: 0, icon: Wallet, tone: 'yellow' },
  { label: 'Total Products', value: 0, icon: Box, tone: 'blue' },
  { label: 'Total Orders', value: 0, icon: ShoppingBag, tone: 'pink' },
  { label: 'Total Revenue', value: '$0.00', icon: DollarSign, tone: 'teal' },
]

const PENDING_TASKS = [
  { label: 'Pending Status', value: 0, icon: Inbox, tone: 'yellow' },
  { label: 'Stock Difference', value: 0, icon: BarChart3, tone: 'red' },
  { label: 'Pending Payout', value: '$0.00', icon: Banknote, tone: 'teal' },
]

function SupplierDashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'Supplier'

  return (
    <SupplierLayout>
      <PanelDashboard
        panelLabel="Supplier Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="Track your products, orders, inventory and finances from one powerful supplier dashboard."
        featuredModule={SUPPLIER_FEATURED_MODULE}
        gridModules={SUPPLIER_GRID_MODULES}
        overviewStats={OVERVIEW_STATS}
        pendingTasks={PENDING_TASKS}
      />
    </SupplierLayout>
  )
}

export default SupplierDashboardPage
