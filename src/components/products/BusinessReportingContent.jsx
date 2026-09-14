import {
  AlertTriangle,
  BarChart3,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  Send,
  Truck,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../admin/PageHeader.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  adminApi,
  businessApi,
  disputeApi,
  financeApi,
  getErrorMessage,
  orderApi,
  productApi,
  walletApi,
} from '../../lib/api.js'
import { PRODUCT_STATUS_LABEL } from '../../lib/productStatus.js'
import {
  badgeToneForStatus,
  formatMoney,
  formatReportDate,
  formatReportDateTime,
  inDateRange,
  lastSixMonthBuckets,
  monthKey,
  statusLabel,
} from '../../lib/reportUtils.js'

const FILTER_INPUT =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const PANEL_CONFIG = {
  user: {
    eyebrow: 'Client Portal',
    journeyTitle: 'Client Journey',
    idLabel: 'Owner ID',
    profileLink: '/user/business/detail',
  },
  admin: {
    eyebrow: 'Admin Panel',
    journeyTitle: 'Business Journey',
    idLabel: 'Admin ID',
    profileLink: '/admin/dashboard',
  },
  supplier: {
    eyebrow: 'Supplier Panel',
    journeyTitle: 'Supplier Journey',
    idLabel: 'Supplier ID',
    profileLink: '/supplier/business/details',
  },
}

const ICON_MAP = {
  package: Package,
  layers: Layers,
  truck: Truck,
  download: Download,
  send: Send,
  alert: AlertTriangle,
  box: Box,
  clock: Clock,
  dollar: DollarSign,
  wallet: Wallet,
  alertTriangle: AlertTriangle,
  userPlus: UserPlus,
  fileText: FileText,
  checkCircle: CheckCircle2,
}

const TONE_CLASSES = {
  blue: 'bg-sky-50 text-sky-500',
  green: 'bg-emerald-50 text-emerald-500',
  orange: 'bg-amber-50 text-amber-500',
  red: 'bg-rose-50 text-rose-500',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-violet-50 text-violet-500',
  teal: 'bg-teal-50 text-teal-500',
}

function MetricCard({ icon, tone, value, label }) {
  const Icon = ICON_MAP[icon] || Package
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function ReportTable({ title, count, columns, rows, emptyMessage, renderRow }) {
  return (
    <Card className="overflow-hidden border border-slate-200 shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
          {count}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-5 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-400">
                  <Package className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => renderRow(row, index))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

async function fetchBusinessReportData(panel) {
  if (panel === 'admin') {
    const [productsRes, ordersRes, supplierDisputesRes, userDisputesRes, statsRes] = await Promise.all([
      adminApi.products(),
      adminApi.orders(),
      adminApi.supplierDisputes().catch(() => ({ data: [] })),
      adminApi.userComplaints().catch(() => ({ data: [] })),
      adminApi.dashboardStats('all').catch(() => null),
    ])
    return {
      products: productsRes.data || [],
      orders: ordersRes.data || [],
      disputes: [...(supplierDisputesRes.data || []), ...(userDisputesRes.data || [])],
      walletBalance: null,
      finance: null,
      stats: statsRes,
      businessProfile: null,
    }
  }

  if (panel === 'supplier') {
    const [productsRes, ordersRes, disputesRes, businessRes, financeRes, statsRes] = await Promise.all([
      productApi.mine(),
      orderApi.supplier(),
      disputeApi.mine().catch(() => ({ data: [] })),
      businessApi.getMine().catch(() => null),
      financeApi.supplier().catch(() => null),
      financeApi.dashboardStats('all').catch(() => null),
    ])
    return {
      products: productsRes.data || [],
      orders: ordersRes.data || [],
      disputes: disputesRes.data || [],
      walletBalance: null,
      finance: financeRes,
      stats: statsRes,
      businessProfile: businessRes?.profile || null,
      businessUser: businessRes?.user || null,
    }
  }

  const [ordersRes, disputesRes, businessRes, walletRes, statsRes] = await Promise.all([
    orderApi.mine(),
    disputeApi.mine().catch(() => ({ data: [] })),
    businessApi.getMine().catch(() => null),
    walletApi.balance().catch(() => null),
    orderApi.dashboardStats('all').catch(() => null),
  ])

  return {
    products: [],
    orders: ordersRes.data || [],
    disputes: disputesRes.data || [],
    walletBalance: walletRes?.balance ?? walletRes?.walletBalance ?? null,
    finance: null,
    stats: statsRes,
    businessProfile: businessRes?.profile || null,
    businessUser: businessRes?.user || null,
  }
}

function buildProfile(panel, authUser, businessProfile, businessUser) {
  const user = businessUser || authUser || {}
  const status = statusLabel(user.status || businessProfile?.status || 'approved')
  const locationParts = [
    businessProfile?.city,
    businessProfile?.country,
    businessProfile?.businessAddress,
  ].filter(Boolean)

  return {
    name: user.fullName || authUser?.fullName || (panel === 'admin' ? 'Admin' : 'User'),
    email: businessProfile?.businessEmail || user.email || authUser?.email || '—',
    phone: businessProfile?.businessPhone || '—',
    business: businessProfile?.businessName || (panel === 'admin' ? 'Sellvro Warehouse' : '—'),
    ownerId: String(user.id || authUser?.id || '—').slice(-8).toUpperCase() || '—',
    status,
    location: locationParts.length ? locationParts.join(', ') : '—',
    registered: formatReportDateTime(user.createdAt || authUser?.createdAt),
  }
}

function buildJourney(panel, profile, businessProfile, authUser, firstProduct, firstOrder) {
  const registeredAt = authUser?.createdAt
  const submittedAt = businessProfile?.updatedAt || businessProfile?.createdAt
  const approved =
    String(authUser?.status || '').toLowerCase() === 'approved' ||
    String(businessProfile?.status || '').toLowerCase() === 'approved'

  const items = [
    {
      title: 'Account Registered',
      description:
        panel === 'admin'
          ? 'Admin account is active on the platform.'
          : 'Your account was created successfully.',
      date: formatReportDateTime(registeredAt),
      icon: 'userPlus',
    },
  ]

  if (panel !== 'admin') {
    items.push({
      title: 'Business Profile Submitted',
      description: businessProfile
        ? 'Business details submitted for admin review.'
        : 'Business details have not been submitted yet.',
      date: formatReportDateTime(submittedAt),
      icon: 'fileText',
    })
    items.push({
      title: 'Business Approved',
      description: approved
        ? 'Your business profile has been approved.'
        : `Current status: ${profile.status}.`,
      date: approved ? formatReportDateTime(submittedAt || registeredAt) : '—',
      icon: 'checkCircle',
    })
  }

  if (firstProduct) {
    items.push({
      title: 'First Inventory Received',
      description: `${firstProduct.name} (${firstProduct.sku}) added to catalog.`,
      date: formatReportDateTime(firstProduct.createdAt),
      icon: 'package',
    })
  } else if (firstOrder) {
    items.push({
      title: 'First Fulfillment',
      description: `Order ${firstOrder.orderNo} placed.`,
      date: formatReportDateTime(firstOrder.createdAt),
      icon: 'package',
    })
  }

  return items
}

/**
 * Shared My Reporting / Business Reporting content for admin, supplier and user.
 */
function BusinessReportingContent({ profile: profileOverride, panel = 'user' }) {
  const { user: authUser } = useAuth()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [reportReady, setReportReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [disputes, setDisputes] = useState([])
  const [walletBalance, setWalletBalance] = useState(null)
  const [finance, setFinance] = useState(null)
  const [stats, setStats] = useState(null)
  const [businessProfile, setBusinessProfile] = useState(null)
  const [businessUser, setBusinessUser] = useState(null)

  const config = PANEL_CONFIG[panel] || PANEL_CONFIG.user

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchBusinessReportData(panel)
      setProducts(data.products)
      setOrders(data.orders)
      setDisputes(data.disputes)
      setWalletBalance(data.walletBalance)
      setFinance(data.finance)
      setStats(data.stats)
      setBusinessProfile(data.businessProfile)
      setBusinessUser(data.businessUser || null)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load business reporting data.'))
      setProducts([])
      setOrders([])
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }, [panel])

  useEffect(() => {
    loadData()
  }, [loadData])

  const profile = useMemo(() => {
    const live = buildProfile(panel, authUser, businessProfile, businessUser)
    if (!profileOverride) return live
    return {
      ...live,
      ...Object.fromEntries(
        Object.entries(profileOverride).filter(([, value]) => value !== undefined && value !== null && value !== ''),
      ),
    }
  }, [panel, authUser, businessProfile, businessUser, profileOverride])

  const handleLoadReport = () => {
    setAppliedFrom(fromDate)
    setAppliedTo(toDate)
    setReportReady(true)
  }

  const handleClear = () => {
    setFromDate('')
    setToDate('')
    setAppliedFrom('')
    setAppliedTo('')
    setReportReady(true)
  }

  const filteredProducts = useMemo(
    () => products.filter((product) => inDateRange(product.createdAt, appliedFrom, appliedTo)),
    [products, appliedFrom, appliedTo],
  )

  const filteredOrders = useMemo(
    () => orders.filter((order) => inDateRange(order.createdAt, appliedFrom, appliedTo)),
    [orders, appliedFrom, appliedTo],
  )

  const filteredDisputes = useMemo(
    () => disputes.filter((dispute) => inDateRange(dispute.createdAt, appliedFrom, appliedTo)),
    [disputes, appliedFrom, appliedTo],
  )

  const unitsDispatched = useMemo(
    () =>
      filteredOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.quantity) || 0), 0),
    [filteredOrders],
  )

  const unitsReceived = useMemo(
    () => filteredProducts.reduce((sum, product) => sum + (Number(product.quantity) || 0), 0) + unitsDispatched,
    [filteredProducts, unitsDispatched],
  )

  const activeSkus = useMemo(
    () =>
      panel === 'user'
        ? new Set(filteredOrders.map((order) => order.productId || order.productSku).filter(Boolean)).size
        : filteredProducts.filter((product) => product.status === 'active').length,
    [panel, filteredOrders, filteredProducts],
  )

  const outOfStock = useMemo(
    () => filteredProducts.filter((product) => Number(product.quantity) === 0).length,
    [filteredProducts],
  )

  const pendingOrders = useMemo(
    () => filteredOrders.filter((order) => ['pending', 'placed', 'in_process'].includes(order.status)).length,
    [filteredOrders],
  )

  const totalPaid = useMemo(() => {
    if (panel === 'user') {
      return filteredOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    }
    if (panel === 'supplier') {
      return (
        finance?.summary?.processedTotal ??
        stats?.overview?.totalRevenue ??
        filteredOrders
          .filter((order) => order.status !== 'cancelled')
          .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
      )
    }
    return (
      stats?.overview?.payments ??
      stats?.overview?.totalRevenue ??
      filteredOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    )
  }, [panel, filteredOrders, finance, stats])

  const pendingAmount = useMemo(() => {
    if (panel === 'user') {
      return walletBalance == null ? 0 : Number(walletBalance) || 0
    }
    if (panel === 'supplier') {
      return finance?.summary?.pendingAmount ?? stats?.pendingTasks?.pendingPayout ?? 0
    }
    return stats?.pendingTasks?.pendingPayout ?? 0
  }, [panel, walletBalance, finance, stats])

  const metrics = useMemo(
    () => [
      {
        label: 'Products',
        value: panel === 'user' ? activeSkus : filteredProducts.length,
        tone: 'blue',
        icon: 'package',
      },
      { label: 'Active SKUs', value: activeSkus, tone: 'green', icon: 'layers' },
      {
        label: 'Shipments',
        value: filteredProducts.filter((p) => Number(p.quantity) > 0).length || (unitsReceived > 0 ? 1 : 0),
        tone: 'blue',
        icon: 'truck',
      },
      { label: 'Units Received', value: unitsReceived, tone: 'green', icon: 'download' },
      { label: 'Units Dispatched', value: unitsDispatched, tone: 'teal', icon: 'send' },
      { label: 'Shortage', value: 0, tone: 'orange', icon: 'alert' },
      {
        label: 'In-Transit',
        value: filteredOrders.filter((order) => order.status === 'in_process').length,
        tone: 'purple',
        icon: 'truck',
      },
      { label: 'Out Of Stock', value: outOfStock, tone: 'red', icon: 'box' },
      { label: 'Pending', value: pendingOrders, tone: 'yellow', icon: 'clock' },
      { label: 'Total Paid', value: formatMoney(totalPaid), tone: 'green', icon: 'dollar' },
      {
        label: panel === 'user' ? 'Wallet Balance' : 'Pending Amount',
        value: formatMoney(pendingAmount),
        tone: 'orange',
        icon: 'wallet',
      },
      { label: 'Disputes', value: filteredDisputes.length, tone: 'red', icon: 'alertTriangle' },
    ],
    [
      panel,
      filteredProducts,
      activeSkus,
      unitsReceived,
      unitsDispatched,
      outOfStock,
      pendingOrders,
      totalPaid,
      pendingAmount,
      filteredDisputes.length,
      filteredOrders,
    ],
  )

  const journey = useMemo(() => {
    const sortedProducts = [...products].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    )
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    )
    return buildJourney(
      panel,
      profile,
      businessProfile,
      businessUser || authUser,
      sortedProducts[0],
      sortedOrders[0],
    )
  }, [panel, profile, businessProfile, businessUser, authUser, products, orders])

  const monthlyData = useMemo(() => {
    const buckets = lastSixMonthBuckets()

    filteredProducts.forEach((product) => {
      const key = monthKey(product.createdAt)
      const bucket = buckets.find((item) => item.key === key)
      if (bucket) bucket.received += Number(product.quantity) || 0
    })

    filteredOrders.forEach((order) => {
      if (order.status === 'cancelled') return
      const key = monthKey(order.createdAt)
      const bucket = buckets.find((item) => item.key === key)
      if (bucket) bucket.dispatched += Number(order.quantity) || 0
    })

    return buckets
  }, [filteredProducts, filteredOrders])

  const productRows = useMemo(() => {
    if (panel === 'user') {
      const byProduct = new Map()
      filteredOrders.forEach((order) => {
        const key = order.productId || order.productSku || order.product
        if (!key || byProduct.has(key)) return
        byProduct.set(key, {
          id: key,
          date: order.date || formatReportDate(order.createdAt),
          product: order.product || '—',
          sku: order.productSku || '—',
          category: '—',
          price: formatMoney(order.unitPrice),
          status: order.statusLabel || statusLabel(order.status),
          tone: badgeToneForStatus(order.status),
        })
      })
      return [...byProduct.values()]
    }

    return filteredProducts.map((product) => ({
      id: product.id,
      date: formatReportDate(product.createdAt),
      product: product.name,
      sku: product.sku,
      category: product.category || '—',
      price: formatMoney(product.price),
      status: PRODUCT_STATUS_LABEL[product.status] || statusLabel(product.status),
      tone: badgeToneForStatus(product.status),
    }))
  }, [panel, filteredOrders, filteredProducts])

  const fulfillmentRows = useMemo(
    () =>
      filteredOrders.map((order) => ({
        id: order.id,
        date: order.date || formatReportDate(order.createdAt),
        sku: order.productSku || order.product || '—',
        qty: order.quantity ?? order.items ?? 0,
        shipper: order.supplier || order.user || '—',
        tracking: order.orderNo || '—',
        status: order.statusLabel || statusLabel(order.status),
        tone: badgeToneForStatus(order.status),
      })),
    [filteredOrders],
  )

  const shipmentRows = useMemo(
    () =>
      filteredProducts
        .filter((product) => Number(product.quantity) > 0)
        .map((product) => ({
          id: product.id,
          date: formatReportDate(product.createdAt),
          shipmentNo: `STOCK-${product.sku}`,
          carrier: product.inWarehouse ? 'warehouse' : 'manual',
          tracking: '—',
          warehouse: product.quantity,
          receivedBy: product.supplier || profile.name,
          status: 'received',
        })),
    [filteredProducts, profile.name],
  )

  const inventoryRows = useMemo(() => {
    const rows = []
    filteredProducts.forEach((product) => {
      rows.push({
        id: `recv-${product.id}`,
        date: formatReportDate(product.createdAt),
        sku: product.sku,
        change: `+${Number(product.quantity) || 0}`,
        previous: 0,
        newQty: Number(product.quantity) || 0,
        type: 'received',
      })
    })
    filteredOrders
      .filter((order) => order.status !== 'cancelled')
      .forEach((order) => {
        rows.push({
          id: `out-${order.id}`,
          date: order.date || formatReportDate(order.createdAt),
          sku: order.productSku || '—',
          change: `-${Number(order.quantity) || 0}`,
          previous: '—',
          newQty: '—',
          type: 'dispatched',
        })
      })
    return rows
  }, [filteredProducts, filteredOrders])

  const activityRows = useMemo(() => {
    const rows = []
    filteredProducts.forEach((product) => {
      rows.push({
        id: `prod-${product.id}`,
        date: formatReportDate(product.createdAt),
        type: 'Stock',
        event: 'Product added',
        details: `${product.sku} — qty ${product.quantity ?? 0}`,
        status: PRODUCT_STATUS_LABEL[product.status] || statusLabel(product.status),
        tone: badgeToneForStatus(product.status),
      })
    })
    filteredOrders.forEach((order) => {
      rows.push({
        id: `ord-${order.id}`,
        date: order.date || formatReportDate(order.createdAt),
        type: 'Fulfillment',
        event: 'Order placed',
        details: `${order.orderNo} — ${order.product}`,
        status: order.statusLabel || statusLabel(order.status),
        tone: badgeToneForStatus(order.status),
      })
    })
    filteredDisputes.forEach((dispute) => {
      rows.push({
        id: `dis-${dispute.id}`,
        date: dispute.date || formatReportDate(dispute.createdAt),
        type: 'Dispute',
        event: dispute.type || 'Dispute opened',
        details: dispute.message || dispute.requests || '—',
        status: statusLabel(dispute.status),
        tone: badgeToneForStatus(dispute.status),
      })
    })
    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [filteredProducts, filteredOrders, filteredDisputes])

  const invoiceRows = useMemo(
    () =>
      filteredOrders
        .filter((order) => order.status !== 'cancelled')
        .map((order) => ({
          id: order.id,
          date: order.date || formatReportDate(order.createdAt),
          invoice: order.orderNo,
          amount: formatMoney(order.total),
          paid: formatMoney(order.total),
          status: order.statusLabel || statusLabel(order.status),
          phone: order.userEmail || profile.phone || '—',
          tone: badgeToneForStatus(order.status),
        })),
    [filteredOrders, profile.phone],
  )

  const disputeRows = useMemo(
    () =>
      filteredDisputes.map((dispute) => ({
        id: dispute.id,
        date: dispute.date || formatReportDate(dispute.createdAt),
        type: dispute.type || 'Dispute',
        message: dispute.message || dispute.requests || '—',
        status: statusLabel(dispute.status),
        tone: badgeToneForStatus(dispute.status),
      })),
    [filteredDisputes],
  )

  return (
    <>
      <PageHeader eyebrow={config.eyebrow} title="My Business Reporting" className="mb-5" />

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card className="mb-5 border border-slate-200 p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-from" className="mb-1.5 block text-xs font-medium text-slate-500">
                From
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="biz-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="biz-to" className="mb-1.5 block text-xs font-medium text-slate-500">
                To
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="biz-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-10"
              onClick={handleLoadReport}
              disabled={loading}
            >
              <BarChart3 className="h-4 w-4" />
              Load Report
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 border border-slate-200 bg-white"
              onClick={handleClear}
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
        {loading && <p className="mt-3 text-xs text-slate-400">Loading live reporting data…</p>}
      </Card>

      <Card className="mb-5 border border-slate-200 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-50">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
                <Badge tone={badgeToneForStatus(profile.status)}>{profile.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                <span>
                  <span className="text-slate-400">{config.idLabel}:</span> {profile.ownerId}
                </span>
                <span>
                  <span className="text-slate-400">Business:</span> {profile.business}
                </span>
                <span>
                  <span className="text-slate-400">Email:</span> {profile.email}
                </span>
                <span>
                  <span className="text-slate-400">Phone:</span> {profile.phone}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-400">Location:</span> {profile.location}
                </span>
                <span>
                  <span className="text-slate-400">Registered:</span> {profile.registered}
                </span>
              </div>
            </div>
          </div>
          <Button
            as={Link}
            to={config.profileLink}
            variant="outline"
            size="sm"
            className="shrink-0 border border-slate-200 bg-white"
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </Card>

      {reportReady && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <Card className="mb-6 border border-slate-200 p-5 shadow-soft">
            <h3 className="mb-4 text-sm font-bold text-slate-900">{config.journeyTitle}</h3>
            <div className="space-y-4">
              {journey.map((item) => {
                const Icon = ICON_MAP[item.icon] || Package
                return (
                  <div
                    key={item.title}
                    className="flex flex-col gap-2 border-b border-slate-50 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-slate-400 sm:pl-4">{item.date}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="mb-6 border border-slate-200 p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Monthly In vs Out</h3>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  Received
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Dispatched
                </span>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ display: 'none' }} />
                  <Bar dataKey="received" fill="#3d4fe0" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="dispatched" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="flex flex-col gap-5">
            <ReportTable
              title="All Activity"
              count={activityRows.length}
              columns={['DATE', 'TYPE', 'EVENT', 'DETAILS', 'STATUS']}
              rows={activityRows}
              emptyMessage="No activity found"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
                      {row.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-800">{row.event}</td>
                  <td className="px-5 py-3.5 text-slate-600">{row.details}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                </tr>
              )}
            />

            <ReportTable
              title="Products"
              count={productRows.length}
              columns={['DATE', 'PRODUCT', 'SKU', 'CATEGORY', 'PRICE', 'STATUS']}
              rows={productRows}
              emptyMessage="No products found"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">{row.product}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.sku}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.category}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.price}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                </tr>
              )}
            />

            <ReportTable
              title="Shipments"
              count={shipmentRows.length}
              columns={['DATE', 'SHIPMENT #', 'CARRIER', 'TRACKING', 'WAREHOUSE', 'RECEIVED BY', 'STATUS']}
              rows={shipmentRows}
              emptyMessage="No shipments found"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.shipmentNo}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.carrier}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.tracking}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.warehouse}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.receivedBy}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone="success">{row.status}</Badge>
                  </td>
                </tr>
              )}
            />

            <ReportTable
              title="Fulfillments"
              count={fulfillmentRows.length}
              columns={['DATE', 'SKU', 'QTY', 'SHIPPER', 'TRACKING', 'STATUS']}
              rows={fulfillmentRows}
              emptyMessage="No fulfillments"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.sku}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.qty}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.shipper}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.tracking}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                </tr>
              )}
            />

            <ReportTable
              title="Inventory Movements"
              count={inventoryRows.length}
              columns={['DATE', 'SKU', 'CHANGE', 'PREVIOUS', 'NEW', 'TYPE']}
              rows={inventoryRows}
              emptyMessage="No inventory movements found"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.sku}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        String(row.change).startsWith('+')
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {row.change}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.previous}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.newQty}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.type}</td>
                </tr>
              )}
            />

            <ReportTable
              title="Invoices & Payments"
              count={invoiceRows.length}
              columns={['DATE', 'INVOICE', 'AMOUNT', 'PAID', 'STATUS', 'PHONE']}
              rows={invoiceRows}
              emptyMessage="No invoices"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.invoice}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.amount}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.paid}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.phone}</td>
                </tr>
              )}
            />

            <ReportTable
              title="Disputes"
              count={disputeRows.length}
              columns={['DATE', 'TYPE', 'MESSAGE', 'STATUS']}
              rows={disputeRows}
              emptyMessage="No disputes"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-800">{row.type}</td>
                  <td className="max-w-xs truncate px-5 py-3.5 text-slate-600">{row.message}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                </tr>
              )}
            />
          </div>
        </>
      )}
    </>
  )
}

export default BusinessReportingContent
