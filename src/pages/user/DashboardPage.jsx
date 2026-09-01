import { useCallback, useEffect, useState } from 'react'
import { Truck, FileText, Coins, Scale, AlertTriangle, Clock, Wallet } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { USER_FEATURED_MODULE, USER_GRID_MODULES } from '../../lib/userDashboardModules.js'
import { orderApi, getErrorMessage } from '../../lib/api.js'

const EMPTY_OVERVIEW = [
  { label: 'Fulfillment Orders', value: '—', icon: Truck, tone: 'yellow' },
  { label: 'Pending Orders', value: '—', icon: FileText, tone: 'blue' },
  { label: 'Total Invoices', value: '—', icon: Coins, tone: 'pink' },
  { label: 'Billing (Paid)', value: '—', icon: Scale, tone: 'teal' },
]

const EMPTY_PENDING = [
  { label: 'Disputes', value: '—', icon: AlertTriangle, tone: 'red' },
  { label: 'Pending Fulfillment', value: '—', icon: Clock, tone: 'yellow' },
  { label: 'Pending Amount', value: '—', icon: Wallet, tone: 'teal' },
]

function UserDashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'User'
  const [overviewStats, setOverviewStats] = useState(EMPTY_OVERVIEW)
  const [pendingTasks, setPendingTasks] = useState(EMPTY_PENDING)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async (period = 'all') => {
    setStatsLoading(true)
    setError('')
    try {
      const data = await orderApi.dashboardStats(period)
      const overview = data.overview || {}
      const pending = data.pendingTasks || {}

      setOverviewStats([
        {
          label: 'Fulfillment Orders',
          value: overview.fulfillmentOrders ?? 0,
          icon: Truck,
          tone: 'yellow',
        },
        { label: 'Pending Orders', value: overview.pendingOrders ?? 0, icon: FileText, tone: 'blue' },
        { label: 'Total Invoices', value: overview.totalInvoices ?? 0, icon: Coins, tone: 'pink' },
        {
          label: 'Billing (Paid)',
          value: overview.billingPaidLabel ?? `$${overview.billingPaid ?? 0}`,
          icon: Scale,
          tone: 'teal',
        },
      ])
      setPendingTasks([
        { label: 'Disputes', value: pending.disputes ?? 0, icon: AlertTriangle, tone: 'red' },
        {
          label: 'Pending Fulfillment',
          value: pending.pendingFulfillment ?? 0,
          icon: Clock,
          tone: 'yellow',
        },
        {
          label: 'Pending Amount',
          value: pending.pendingAmountLabel ?? `$${pending.pendingAmount ?? 0}`,
          icon: Wallet,
          tone: 'teal',
        },
      ])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard stats.'))
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats('all')
  }, [loadStats])

  return (
    <UserLayout>
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      <PanelDashboard
        panelLabel="Client Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="You Are Just A Step Ahead In Finding Your Inventory Control Strategies."
        featuredModule={USER_FEATURED_MODULE}
        gridModules={USER_GRID_MODULES}
        overviewStats={overviewStats}
        pendingTasks={pendingTasks}
        onPeriodChange={(period) => loadStats(period)}
        statsLoading={statsLoading}
      />
    </UserLayout>
  )
}

export default UserDashboardPage
