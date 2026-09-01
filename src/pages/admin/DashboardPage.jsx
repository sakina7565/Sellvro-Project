import { useCallback, useEffect, useState } from 'react'
import { Truck, FileText, Coins, Scale, AlertTriangle, Clock, Wallet } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { FEATURED_MODULE, GRID_MODULES } from '../../lib/adminDashboardModules.js'
import { adminApi, getErrorMessage } from '../../lib/api.js'

const EMPTY_OVERVIEW = [
  { label: 'Total Orders', value: '—', icon: Truck, tone: 'yellow' },
  { label: 'Pending Orders', value: '—', icon: FileText, tone: 'blue' },
  { label: 'Total Revenue', value: '—', icon: Coins, tone: 'pink' },
  { label: 'Payments', value: '—', icon: Scale, tone: 'teal' },
]

const EMPTY_PENDING = [
  { label: 'Disputes', value: '—', icon: AlertTriangle, tone: 'red' },
  { label: 'Pending Suppliers', value: '—', icon: Clock, tone: 'yellow' },
  { label: 'Pending Payout', value: '—', icon: Wallet, tone: 'teal' },
]

function DashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'Admin'
  const [overviewStats, setOverviewStats] = useState(EMPTY_OVERVIEW)
  const [pendingTasks, setPendingTasks] = useState(EMPTY_PENDING)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async (period = 'all') => {
    setStatsLoading(true)
    setError('')
    try {
      const data = await adminApi.dashboardStats(period)
      const overview = data.overview || {}
      const pending = data.pendingTasks || {}

      setOverviewStats([
        { label: 'Total Orders', value: overview.totalOrders ?? 0, icon: Truck, tone: 'yellow' },
        { label: 'Pending Orders', value: overview.pendingOrders ?? 0, icon: FileText, tone: 'blue' },
        {
          label: 'Total Revenue',
          value: overview.totalRevenueLabel ?? `$${overview.totalRevenue ?? 0}`,
          icon: Coins,
          tone: 'pink',
        },
        {
          label: 'Payments',
          value: overview.paymentsLabel ?? `$${overview.payments ?? 0}`,
          icon: Scale,
          tone: 'teal',
        },
      ])
      setPendingTasks([
        { label: 'Disputes', value: pending.disputes ?? 0, icon: AlertTriangle, tone: 'red' },
        {
          label: 'Pending Suppliers',
          value: pending.pendingSuppliers ?? 0,
          icon: Clock,
          tone: 'yellow',
        },
        {
          label: 'Pending Payout',
          value: pending.pendingPayoutLabel ?? `$${pending.pendingPayout ?? 0}`,
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
    <AdminLayout>
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      <PanelDashboard
        panelLabel="Admin Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="Where Smart Inventory Meets Powerful Logistics — track products, orders, suppliers and finances from one place."
        featuredModule={FEATURED_MODULE}
        gridModules={GRID_MODULES}
        overviewStats={overviewStats}
        pendingTasks={pendingTasks}
        onPeriodChange={(period) => loadStats(period)}
        statsLoading={statsLoading}
      />
    </AdminLayout>
  )
}

export default DashboardPage
