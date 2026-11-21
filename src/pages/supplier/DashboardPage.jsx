import { useCallback, useEffect, useState } from 'react'
import {
  Wallet,
  Box,
  ShoppingBag,
  DollarSign,
  Inbox,
  BarChart3,
  Banknote,
  Truck,
  AlertTriangle,
  Star,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PanelDashboard from '../../components/dashboard/PanelDashboard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  SUPPLIER_FEATURED_MODULE,
  SUPPLIER_GRID_MODULES,
} from '../../lib/supplierDashboardModules.js'
import { financeApi, getErrorMessage } from '../../lib/api.js'

const EMPTY_OVERVIEW = [
  { label: 'Active Products', value: '—', icon: Wallet, tone: 'yellow', to: '/supplier/products' },
  { label: 'Total Products', value: '—', icon: Box, tone: 'blue', to: '/supplier/products' },
  { label: 'Total Orders', value: '—', icon: ShoppingBag, tone: 'pink', to: '/supplier/sales/details' },
  { label: 'Total Earnings', value: '—', icon: DollarSign, tone: 'teal', to: '/supplier/finance/index' },
]

const EMPTY_PENDING = [
  { label: 'Pending Approval', value: '—', icon: Inbox, tone: 'yellow', to: '/supplier/products' },
  { label: 'Orders to Fulfill', value: '—', icon: Truck, tone: 'blue', to: '/supplier/sales/details' },
  { label: 'Out of Stock', value: '—', icon: BarChart3, tone: 'red', to: '/supplier/products' },
  { label: 'Open Disputes', value: '—', icon: AlertTriangle, tone: 'orange', to: '/supplier/disputes' },
  { label: 'Pending Payout', value: '—', icon: Banknote, tone: 'teal', to: '/supplier/finance/index' },
]

function SupplierDashboardPage() {
  const { user } = useAuth()
  const displayName = user?.fullName || 'Supplier'
  const [overviewStats, setOverviewStats] = useState(EMPTY_OVERVIEW)
  const [pendingTasks, setPendingTasks] = useState(EMPTY_PENDING)
  const [monthlyData, setMonthlyData] = useState([])
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
        {
          label: 'Active Products',
          value: overview.approved ?? 0,
          icon: Wallet,
          tone: 'yellow',
          to: '/supplier/products',
        },
        {
          label: 'Total Products',
          value: overview.totalProducts ?? 0,
          icon: Box,
          tone: 'blue',
          to: '/supplier/products',
        },
        {
          label: 'Total Orders',
          value: overview.totalOrders ?? 0,
          icon: ShoppingBag,
          tone: 'pink',
          to: '/supplier/sales/details',
        },
        {
          label: 'Total Earnings',
          value: overview.totalRevenueLabel ?? `$${Number(overview.totalRevenue || 0).toFixed(2)}`,
          icon: DollarSign,
          tone: 'teal',
          to: '/supplier/finance/index',
        },
      ])

      setPendingTasks([
        {
          label: 'Pending Approval',
          value: pending.pendingStatus ?? 0,
          icon: Inbox,
          tone: 'yellow',
          to: '/supplier/products',
        },
        {
          label: 'Orders to Fulfill',
          value: pending.pendingFulfillments ?? 0,
          icon: Truck,
          tone: 'blue',
          to: '/supplier/sales/details',
        },
        {
          label: 'Out of Stock',
          value: pending.stockDifference ?? 0,
          icon: BarChart3,
          tone: 'red',
          to: '/supplier/products',
        },
        {
          label: 'Open Disputes',
          value: pending.openDisputes ?? 0,
          icon: AlertTriangle,
          tone: 'orange',
          to: '/supplier/disputes',
        },
        {
          label: 'Pending Payout',
          value: pending.pendingPayoutLabel ?? `$${Number(pending.pendingPayout || 0).toFixed(2)}`,
          icon: Banknote,
          tone: 'teal',
          to: '/supplier/finance/index',
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
    <SupplierLayout>
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Account Standing & Performance Health Widget */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs ${
                user?.status === 'suspended'
                  ? 'bg-rose-600 text-white'
                  : (user?.warningsCount || 0) > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {user?.status === 'suspended' ? (
                <ShieldAlert className="h-6 w-6" />
              ) : (user?.warningsCount || 0) > 0 ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account Standing
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                    user?.status === 'suspended'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : (user?.warningsCount || 0) > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {user?.status === 'suspended'
                    ? 'Suspended'
                    : (user?.warningsCount || 0) > 0
                    ? `${user.warningsCount}/3 Warnings`
                    : 'Good Standing'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">
                {user?.status === 'suspended'
                  ? `Marketplace selling locked. Reason: ${user.suspensionReason || 'Performance policy'}`
                  : (user?.warningsCount || 0) > 0
                  ? 'Policy alert: 3 warnings will result in automatic marketplace suspension.'
                  : 'Account fully operational with 0 performance warnings.'}
              </p>
            </div>
          </div>

          {/* Real-time Quality & Delivery Ratings */}
          <div className="flex items-center gap-5 text-xs border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-5">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Buyer Rating</span>
              {user?.ratings?.reviewsCount > 0 ? (
                <span className="flex items-center font-bold text-amber-500 text-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1" />
                  {Number(user.ratings.averageRating || 0).toFixed(1)}/5
                  <span className="text-[11px] text-slate-400 font-normal ml-1">
                    ({user.ratings.reviewsCount})
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 text-xs italic">No ratings yet</span>
              )}
            </div>

            <div className="border-l border-slate-100 pl-5">
              <span className="block text-[10px] uppercase font-bold text-slate-400">On-Time Delivery</span>
              {user?.ratings?.onTimeDeliveryPercent !== null && user?.ratings?.onTimeDeliveryPercent !== undefined ? (
                <span className="flex items-center font-bold text-emerald-700 text-sm">
                  <Truck className="h-3.5 w-3.5 mr-1" />
                  {user.ratings.onTimeDeliveryPercent}%
                </span>
              ) : (
                <span className="text-slate-400 text-xs italic">Pending orders</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <PanelDashboard
        panelLabel="Supplier Panel"
        displayName={displayName}
        welcomeTitle={`Hi! ${displayName}, Manage your Warehouse With Ease!`}
        welcomeSubtitle="Track your products, orders, inventory and finances from one powerful supplier dashboard."
        featuredModule={SUPPLIER_FEATURED_MODULE}
        gridModules={SUPPLIER_GRID_MODULES}
        overviewStats={overviewStats}
        pendingTasks={pendingTasks}
        monthlyData={monthlyData}
        revenueTitle="Monthly Supplier Earnings & Revenue"
        revenueMetricLabel="Net Earnings"
        revenueColor="#10b981"
        onPeriodChange={(period) => loadStats(period)}
        statsLoading={statsLoading}
      />
    </SupplierLayout>
  )
}

export default SupplierDashboardPage
