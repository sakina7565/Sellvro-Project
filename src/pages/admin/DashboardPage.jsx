import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Truck,
  FileText,
  Coins,
  Scale,
  AlertTriangle,
  Clock,
  Wallet,
  Users,
  Package,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { ADMIN_DASHBOARD_MODULES } from '../../lib/adminDashboardModules.js'
import { canAccessAdminPath, isSuperAdmin } from '../../lib/permissions.js'
import { adminApi, getErrorMessage } from '../../lib/api.js'

const EMPTY_OVERVIEW = [
  { label: 'Total Orders', value: '—', icon: Truck, tone: 'yellow', to: '/admin/sales' },
  { label: 'Pending Orders', value: '—', icon: FileText, tone: 'blue', to: '/admin/sales' },
  { label: 'Total Revenue', value: '—', icon: Coins, tone: 'pink', to: '/admin/sales' },
  { label: 'Payments', value: '—', icon: Scale, tone: 'teal', to: '/admin/wallets/requests' },
]

const EMPTY_PENDING = [
  { label: 'Disputes', value: '—', icon: AlertTriangle, tone: 'red', to: '/admin/supplier/disputes' },
  { label: 'Pending Suppliers', value: '—', icon: Clock, tone: 'yellow', to: '/admin/suppliers/pending' },
  { label: 'Pending Users', value: '—', icon: Users, tone: 'blue', to: '/admin/users/pending' },
  { label: 'Pending Products', value: '—', icon: Package, tone: 'purple', to: '/admin/products' },
  { label: 'Pending Payout', value: '—', icon: Wallet, tone: 'teal', to: '/admin/supplier/payouts' },
]

function DashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'Admin'
  const [overviewStats, setOverviewStats] = useState(EMPTY_OVERVIEW)
  const [pendingTasks, setPendingTasks] = useState(EMPTY_PENDING)
  const [monthlyData, setMonthlyData] = useState([])
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
        {
          label: 'Total Orders',
          value: overview.totalOrders ?? 0,
          icon: Truck,
          tone: 'yellow',
          to: '/admin/sales',
        },
        {
          label: 'Pending Orders',
          value: overview.pendingOrders ?? 0,
          icon: FileText,
          tone: 'blue',
          to: '/admin/sales',
        },
        {
          label: 'Total Revenue',
          value: overview.totalRevenueLabel ?? `$${Number(overview.totalRevenue || 0).toFixed(2)}`,
          icon: Coins,
          tone: 'pink',
          to: '/admin/sales',
        },
        {
          label: 'Payments',
          value: overview.paymentsLabel ?? `$${Number(overview.payments || 0).toFixed(2)}`,
          icon: Scale,
          tone: 'teal',
          to: '/admin/wallets/requests',
        },
      ])

      setPendingTasks([
        {
          label: 'Open Disputes',
          value: pending.disputes ?? 0,
          icon: AlertTriangle,
          tone: 'red',
          to: '/admin/supplier/disputes',
        },
        {
          label: 'Pending Suppliers',
          value: pending.pendingSuppliers ?? 0,
          icon: Clock,
          tone: 'yellow',
          to: '/admin/suppliers/pending',
        },
        {
          label: 'Pending Buyers',
          value: pending.pendingUsers ?? 0,
          icon: Users,
          tone: 'blue',
          to: '/admin/users/pending',
        },
        {
          label: 'Pending Products',
          value: pending.pendingProducts ?? 0,
          icon: Package,
          tone: 'purple',
          to: '/admin/products',
        },
        {
          label: 'Pending Payout',
          value: pending.pendingPayoutLabel ?? `$${Number(pending.pendingPayout || 0).toFixed(2)}`,
          icon: Wallet,
          tone: 'teal',
          to: '/admin/supplier/payouts',
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

  const filteredModules = useMemo(() => {
    if (isSuperAdmin(user)) return ADMIN_DASHBOARD_MODULES

    return ADMIN_DASHBOARD_MODULES.map((module) => {
      const allowedLinks = (module.links || []).filter((link) =>
        canAccessAdminPath(user, link.to),
      )
      if (allowedLinks.length === 0) return null
      return { ...module, links: allowedLinks }
    }).filter(Boolean)
  }, [user])

  const featuredModule = useMemo(() => {
    return filteredModules.find((m) => m.featured) || filteredModules[0] || null
  }, [filteredModules])

  const gridModules = useMemo(() => {
    return filteredModules.filter((m) => m !== featuredModule)
  }, [filteredModules, featuredModule])

  return (
    <AdminLayout>
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      <PanelDashboard
        panelLabel={user?.adminRoleName ? `${user.adminRoleName} Portal` : 'Admin Panel'}
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Assigned Modules!`}
        welcomeSubtitle="Access all warehouse logistics, orders, products and operations according to your assigned permissions."
        featuredModule={featuredModule}
        gridModules={gridModules}
        overviewStats={overviewStats}
        pendingTasks={pendingTasks}
        monthlyData={monthlyData}
        revenueTitle="Monthly Platform Revenue & Sales"
        revenueMetricLabel="Platform Sales"
        revenueColor="#3d4fe0"
        onPeriodChange={(period) => loadStats(period)}
        statsLoading={statsLoading}
      />
    </AdminLayout>
  )
}

export default DashboardPage
