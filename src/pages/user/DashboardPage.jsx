import { useCallback, useEffect, useState } from 'react'
import { Truck, FileText, Coins, Scale, AlertTriangle, Clock, Wallet, ArrowUpRight } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { USER_FEATURED_MODULE, USER_GRID_MODULES } from '../../lib/userDashboardModules.js'
import { orderApi, getErrorMessage } from '../../lib/api.js'

const EMPTY_OVERVIEW = [
  { label: 'Total Orders', value: '—', icon: Truck, tone: 'yellow', to: '/user/orders' },
  { label: 'Pending Orders', value: '—', icon: FileText, tone: 'blue', to: '/user/orders' },
  { label: 'Total Spend', value: '—', icon: Coins, tone: 'pink', to: '/user/orders' },
  { label: 'Wallet Balance', value: '—', icon: Scale, tone: 'teal', to: '/user/wallet' },
]

const EMPTY_PENDING = [
  { label: 'In-Process / Pending Orders', value: '—', icon: Clock, tone: 'yellow', to: '/user/orders' },
  { label: 'Open Disputes', value: '—', icon: AlertTriangle, tone: 'red', to: '/user/disputes' },
  { label: 'Pending Top-ups', value: '—', icon: ArrowUpRight, tone: 'blue', to: '/user/wallet' },
  { label: 'Pending Top-up Amount', value: '—', icon: Wallet, tone: 'teal', to: '/user/wallet' },
]

function UserDashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'User'
  const [overviewStats, setOverviewStats] = useState(EMPTY_OVERVIEW)
  const [pendingTasks, setPendingTasks] = useState(EMPTY_PENDING)
  const [monthlyData, setMonthlyData] = useState([])
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
          label: 'Total Orders',
          value: overview.fulfillmentOrders ?? 0,
          icon: Truck,
          tone: 'yellow',
          to: '/user/orders',
        },
        {
          label: 'Pending Orders',
          value: overview.pendingOrders ?? 0,
          icon: FileText,
          tone: 'blue',
          to: '/user/orders',
        },
        {
          label: 'Total Spend',
          value: overview.billingPaidLabel ?? `$${overview.billingPaid ?? 0}`,
          icon: Coins,
          tone: 'pink',
          to: '/user/orders',
        },
        {
          label: 'Wallet Balance',
          value: overview.walletBalanceLabel ?? `$${overview.walletBalance ?? 0}`,
          icon: Scale,
          tone: 'teal',
          to: '/user/wallet',
        },
      ])

      setPendingTasks([
        {
          label: 'In-Process / Pending Orders',
          value: pending.pendingFulfillment ?? 0,
          icon: Clock,
          tone: 'yellow',
          to: '/user/orders',
        },
        {
          label: 'Open Disputes',
          value: pending.disputes ?? 0,
          icon: AlertTriangle,
          tone: 'red',
          to: '/user/disputes',
        },
        {
          label: 'Pending Top-ups',
          value: pending.pendingWalletRequests ?? 0,
          icon: ArrowUpRight,
          tone: 'blue',
          to: '/user/wallet',
        },
        {
          label: 'Pending Top-up Amount',
          value: pending.pendingAmountLabel ?? `$${pending.pendingAmount ?? 0}`,
          icon: Wallet,
          tone: 'teal',
          to: '/user/wallet',
        },
      ])

      if (Array.isArray(data.monthlyData)) {
        setMonthlyData(data.monthlyData)
      }
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
        monthlyData={monthlyData}
        revenueTitle="Monthly Purchases & Spend Overview"
        revenueMetricLabel="Purchases"
        revenueColor="#3d4fe0"
        onPeriodChange={(period) => loadStats(period)}
        statsLoading={statsLoading}
      />
    </UserLayout>
  )
}

export default UserDashboardPage
