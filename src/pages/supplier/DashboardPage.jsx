import { useCallback, useEffect, useState } from 'react'
import { Wallet, Box, ShoppingBag, DollarSign, Inbox, BarChart3, Banknote } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUPPLIER_FEATURED_MODULE, SUPPLIER_GRID_MODULES } from '../../lib/supplierDashboardModules.js'
import { financeApi, getErrorMessage } from '../../lib/api.js'

const EMPTY_OVERVIEW = [
  { label: 'Approved', value: '—', icon: Wallet, tone: 'yellow' },
  { label: 'Total Products', value: '—', icon: Box, tone: 'blue' },
  { label: 'Total Orders', value: '—', icon: ShoppingBag, tone: 'pink' },
  { label: 'Total Revenue', value: '—', icon: DollarSign, tone: 'teal' },
]

const EMPTY_PENDING = [
  { label: 'Pending Status', value: '—', icon: Inbox, tone: 'yellow' },
  { label: 'Stock Difference', value: '—', icon: BarChart3, tone: 'red' },
  { label: 'Pending Payout', value: '—', icon: Banknote, tone: 'teal' },
]

function SupplierDashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'Supplier'
  const [overviewStats, setOverviewStats] = useState(EMPTY_OVERVIEW)
  const [pendingTasks, setPendingTasks] = useState(EMPTY_PENDING)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async (period = 'all') => {
    setStatsLoading(true)
    setError('')
    try {
      const data = await financeApi.dashboardStats(period)
      const overview = data.overview || {}
      const pending = data.pendingTasks || {}

      setOverviewStats([
        { label: 'Approved', value: overview.approved ?? 0, icon: Wallet, tone: 'yellow' },
        { label: 'Total Products', value: overview.totalProducts ?? 0, icon: Box, tone: 'blue' },
        { label: 'Total Orders', value: overview.totalOrders ?? 0, icon: ShoppingBag, tone: 'pink' },
        {
          label: 'Total Revenue',
          value: overview.totalRevenueLabel ?? `$${Number(overview.totalRevenue || 0).toFixed(2)}`,
          icon: DollarSign,
          tone: 'teal',
        },
      ])
      setPendingTasks([
        { label: 'Pending Status', value: pending.pendingStatus ?? 0, icon: Inbox, tone: 'yellow' },
        {
          label: 'Stock Difference',
          value: pending.stockDifference ?? 0,
          icon: BarChart3,
          tone: 'red',
        },
        {
          label: 'Pending Payout',
          value: pending.pendingPayoutLabel ?? `$${Number(pending.pendingPayout || 0).toFixed(2)}`,
          icon: Banknote,
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
    <SupplierLayout>
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      <PanelDashboard
        panelLabel="Supplier Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="Track your products, orders, inventory and finances from one powerful supplier dashboard."
        featuredModule={SUPPLIER_FEATURED_MODULE}
        gridModules={SUPPLIER_GRID_MODULES}
        overviewStats={overviewStats}
        pendingTasks={pendingTasks}
        onPeriodChange={(period) => loadStats(period)}
        statsLoading={statsLoading}
      />
    </SupplierLayout>
  )
}

export default SupplierDashboardPage
