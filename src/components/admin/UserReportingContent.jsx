import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { adminApi, getErrorMessage, mediaUrl } from '../../lib/api.js'

function getUserDisplayId(user) {
  if (user?.clientId) return user.clientId
  if (user?.id || user?._id) {
    const hex = String(user.id || user._id)
    return `USR-${hex.slice(-6).toUpperCase()}`
  }
  return 'USR-1001'
}

const TRACKING_STAGES = [
  { key: 'placed', label: 'Order Placed', color: 'blue' },
  { key: 'processing', label: 'Processing', color: 'amber' },
  { key: 'in_transit', label: 'In Transit', color: 'indigo' },
  { key: 'out_for_delivery', label: 'Out for Delivery', color: 'purple' },
  { key: 'delivered', label: 'Delivered', color: 'emerald' },
]

function getStageIndex(status) {
  const norm = String(status || '').toLowerCase()
  if (norm === 'delivered') return 4
  if (norm === 'out_for_delivery') return 3
  if (norm === 'in_transit' || norm === 'shipped') return 2
  if (norm === 'processing' || norm === 'in_process') return 1
  return 0
}

function getTrackingBadge(status) {
  const norm = String(status || '').toLowerCase()
  if (norm === 'delivered') return <Badge tone="success">Delivered</Badge>
  if (norm === 'out_for_delivery') return <Badge tone="primary">Out for Delivery</Badge>
  if (norm === 'in_transit' || norm === 'shipped') return <Badge tone="info">In Transit</Badge>
  if (norm === 'processing' || norm === 'in_process') return <Badge tone="warning">Processing</Badge>
  if (norm === 'cancelled') return <Badge tone="danger">Cancelled</Badge>
  return <Badge tone="neutral">Placed</Badge>
}

export default function UserReportingContent() {
  const [searchParams] = useSearchParams()
  const paramUserId = searchParams.get('userId') || searchParams.get('id') || searchParams.get('user')
  const [activeTab, setActiveTab] = useState(paramUserId ? 'user_detail' : 'tracking') // 'tracking' | 'report' | 'user_detail'
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Tracking tab filters
  const [trackingSearch, setTrackingSearch] = useState('')
  const [trackingFilter, setTrackingFilter] = useState('all') // 'all' | 'in_transit' | 'delivered' | 'processing' | 'placed'
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [updatingTracking, setUpdatingTracking] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')

  // Modal tracking update inputs
  const [modalStatus, setModalStatus] = useState('')
  const [modalCarrier, setModalCarrier] = useState('')
  const [modalTrackingNo, setModalTrackingNo] = useState('')
  const [modalEstDelivery, setModalEstDelivery] = useState('')
  const [modalNote, setModalNote] = useState('')
  const [modalLocation, setModalLocation] = useState('')

  // Report tab filters
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersRes, ordersRes] = await Promise.all([
        adminApi.accounts({ role: 'user' }).catch(() => ({ data: [] })),
        adminApi.orders().catch(() => ({ data: [] })),
      ])
      const userList = Array.isArray(usersRes?.data) ? usersRes.data : []
      const orderList = Array.isArray(ordersRes?.data) ? ordersRes.data : Array.isArray(ordersRes) ? ordersRes : []
      setUsers(userList)
      setOrders(orderList)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user reporting data.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // Calculate user-level purchase and sales analytics
  const userReportList = useMemo(() => {
    return users.map((u) => {
      const uId = String(u.id || u._id)
      const uEmail = String(u.email || '').toLowerCase()
      const uName = String(u.fullName || u.name || '').toLowerCase()

      // Purchases made by this user (buyer)
      const userPurchases = orders.filter((o) => {
        const orderBuyerId = String(o.userId || o.user?._id || (typeof o.user === 'string' ? o.user : ''))
        const orderBuyerEmail = String(o.userEmail || o.user?.email || '').toLowerCase()
        const orderBuyerName = String(o.user || o.userName || '').toLowerCase()
        return (
          (orderBuyerId && orderBuyerId === uId) ||
          (orderBuyerEmail && orderBuyerEmail === uEmail) ||
          (orderBuyerName && orderBuyerName === uName)
        )
      })

      // Sales made by this user (if user is seller/supplier in marketplace orders)
      const userSales = orders.filter((o) => {
        const orderSupplierId = String(o.supplierId || o.supplier?._id || (typeof o.supplier === 'string' ? o.supplier : ''))
        const orderSupplierEmail = String(o.supplierEmail || o.supplier?.email || '').toLowerCase()
        const orderSupplierName = String(o.supplier || o.supplierName || '').toLowerCase()
        return (
          (orderSupplierId && orderSupplierId === uId) ||
          (orderSupplierEmail && orderSupplierEmail === uEmail) ||
          (orderSupplierName && orderSupplierName === uName)
        )
      })

      const totalPurchasedAmount = userPurchases.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
      const totalPurchasedItems = userPurchases.reduce((acc, o) => acc + (Number(o.quantity) || 1), 0)
      const totalPurchasedOrders = userPurchases.length

      const totalSalesAmount = userSales.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
      const totalSalesOrders = userSales.length

      const activeParcels = userPurchases.filter((o) => {
        const tStatus = String(o.trackingStatus || o.status || '').toLowerCase()
        return tStatus !== 'delivered' && tStatus !== 'cancelled'
      }).length

      return {
        user: u,
        totalPurchasedAmount,
        totalPurchasedItems,
        totalPurchasedOrders,
        totalSalesAmount,
        totalSalesOrders,
        activeParcels,
        purchases: userPurchases,
        sales: userSales,
      }
    })
  }, [users, orders])

  // Automatically select target user and switch to deep-dive report when navigated via User ID link (?userId=...)
  useEffect(() => {
    if (paramUserId && userReportList.length > 0) {
      const match = userReportList.find((item) => {
        const u = item.user
        const uid = String(u.id || u._id || '')
        const shortId = `USR-${uid.slice(-6).toUpperCase()}`
        return (
          uid === paramUserId ||
          uid.includes(paramUserId) ||
          shortId === paramUserId.toUpperCase() ||
          String(u.email || '').toLowerCase() === paramUserId.toLowerCase()
        )
      })
      if (match) {
        setSelectedUser(match)
        setActiveTab('user_detail')
      }
    }
  }, [paramUserId, userReportList])

  // Summary Metrics
  const summary = useMemo(() => {
    const totalUsersCount = users.length
    const totalPurchasedOverall = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
    const totalOrdersCount = orders.length
    const inTransitCount = orders.filter((o) => {
      const s = String(o.trackingStatus || o.status || '').toLowerCase()
      return s === 'in_transit' || s === 'out_for_delivery' || s === 'processing'
    }).length
    const deliveredCount = orders.filter((o) => {
      const s = String(o.trackingStatus || o.status || '').toLowerCase()
      return s === 'delivered'
    }).length

    return {
      totalUsers: totalUsersCount,
      totalPurchases: totalPurchasedOverall,
      totalOrders: totalOrdersCount,
      inTransit: inTransitCount,
      delivered: deliveredCount,
    }
  }, [users, orders])

  // Filtered parcels for Live Tracking Tab
  const filteredParcels = useMemo(() => {
    return orders.filter((order) => {
      const q = trackingSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        String(order.orderNo || '').toLowerCase().includes(q) ||
        String(order.trackingNumber || '').toLowerCase().includes(q) ||
        String(order.user || '').toLowerCase().includes(q) ||
        String(order.product || '').toLowerCase().includes(q) ||
        String(order.shippingAddress?.city || '').toLowerCase().includes(q)

      if (!matchesSearch) return false

      const tStatus = String(order.trackingStatus || order.status || '').toLowerCase()
      if (trackingFilter === 'in_transit') {
        return tStatus === 'in_transit' || tStatus === 'out_for_delivery'
      }
      if (trackingFilter === 'delivered') {
        return tStatus === 'delivered'
      }
      if (trackingFilter === 'processing') {
        return tStatus === 'processing' || tStatus === 'in_process'
      }
      if (trackingFilter === 'placed') {
        return tStatus === 'placed'
      }
      return true
    })
  }, [orders, trackingSearch, trackingFilter])

  // Filtered users for User Reporting Tab
  const filteredUserReports = useMemo(() => {
    const q = userSearch.toLowerCase().trim()
    if (!q) return userReportList
    return userReportList.filter((item) => {
      const u = item.user
      return (
        String(u.fullName || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.id || '').toLowerCase().includes(q)
      )
    })
  }, [userReportList, userSearch])

  // Open tracking modal for an order
  const handleOpenTrackingModal = (parcel) => {
    setSelectedParcel(parcel)
    setModalStatus(parcel.trackingStatus || (parcel.status === 'in_process' ? 'processing' : 'placed'))
    setModalCarrier(parcel.carrier || 'Sellvro Express')
    setModalTrackingNo(parcel.trackingNumber || `SLV-${parcel.orderNo?.replace('ORD-', '')}`)
    setModalEstDelivery(parcel.estimatedDelivery || '3 - 5 Days')
    setModalNote('')
    setModalLocation(parcel.shippingAddress?.city || 'Karachi Hub')
    setUpdateError('')
    setUpdateSuccess('')
  }

  // Submit tracking update
  const handleSaveTracking = async (e) => {
    e.preventDefault()
    if (!selectedParcel?.id) return
    setUpdatingTracking(true)
    setUpdateError('')
    setUpdateSuccess('')
    try {
      const payload = {
        trackingStatus: modalStatus,
        carrier: modalCarrier,
        trackingNumber: modalTrackingNo,
        estimatedDelivery: modalEstDelivery,
        note: modalNote || `Status updated to ${modalStatus}`,
        location: modalLocation,
      }
      const res = await adminApi.updateOrderTracking(selectedParcel.id, payload)
      setUpdateSuccess('Parcel tracking updated successfully!')
      const updatedOrder = res.order || res
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)))
      setSelectedParcel(updatedOrder)
      setTimeout(() => {
        setUpdateSuccess('')
      }, 3000)
    } catch (err) {
      setUpdateError(getErrorMessage(err, 'Failed to update tracking.'))
    } finally {
      setUpdatingTracking(false)
    }
  }

  // Monthly Chart Data for Selected User Deep Dive
  const selectedUserChartData = useMemo(() => {
    if (!selectedUser) return []
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString('en-US', { month: 'short' })
      months.push({
        name: label,
        month: d.getMonth(),
        year: d.getFullYear(),
        purchases: 0,
        sales: 0,
      })
    }

    selectedUser.purchases.forEach((p) => {
      const d = new Date(p.createdAt || p.date)
      if (Number.isNaN(d.getTime())) return
      const bucket = months.find((m) => m.month === d.getMonth() && m.year === d.getFullYear())
      if (bucket) {
        bucket.purchases += Number(p.total) || 0
      }
    })

    selectedUser.sales.forEach((s) => {
      const d = new Date(s.createdAt || s.date)
      if (Number.isNaN(d.getTime())) return
      const bucket = months.find((m) => m.month === d.getMonth() && m.year === d.getFullYear())
      if (bucket) {
        bucket.sales += Number(s.total) || 0
      }
    })

    return months
  }, [selectedUser])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Users className="h-3.5 w-3.5" /> Customer Analytics & Dispatch
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            User Reporting & Live Parcel Tracking
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Comprehensive reporting of customer purchases, sales volumes, and real-time live parcel tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <button onClick={() => setError('')} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 border border-slate-200 bg-white shadow-soft hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{summary.totalUsers}</span>
            <span className="ml-2 text-xs text-slate-500">registered customers</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-soft hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">User Purchases</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">
              ${summary.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="ml-2 text-xs text-emerald-600 font-medium">({summary.totalOrders} orders)</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-soft hover:border-amber-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live In Transit</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Truck className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600">{summary.inTransit}</span>
            <span className="ml-2 text-xs text-slate-500">active parcel dispatches</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-soft hover:border-teal-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivered Parcels</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-teal-700">{summary.delivered}</span>
            <span className="ml-2 text-xs text-slate-500">successfully received</span>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tracking')
              setSelectedUser(null)
            }}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
              activeTab === 'tracking'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Live Parcel Tracking</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('report')
              setSelectedUser(null)
            }}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
              activeTab === 'report'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>User Purchases & Sales Report</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {users.length}
            </span>
          </button>

          {selectedUser && (
            <button
              type="button"
              onClick={() => setActiveTab('user_detail')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === 'user_detail'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Report: {selectedUser.user.fullName || selectedUser.user.name}</span>
            </button>
          )}
        </nav>
      </div>

      {/* TAB 1: LIVE PARCEL TRACKING */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4 border border-slate-200 bg-white shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tracking #, order #, user, city, product..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {['all', 'in_transit', 'processing', 'delivered', 'placed'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTrackingFilter(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      trackingFilter === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing <strong>{filteredParcels.length}</strong> of {orders.length} parcels
            </span>
          </Card>

          {/* Parcels List */}
          {filteredParcels.length === 0 ? (
            <Card className="p-12 text-center border border-slate-200 bg-white">
              <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-base font-semibold text-slate-800">No parcels match your search</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search criteria or filter to see available parcel shipments.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredParcels.map((parcel) => {
                const stageIdx = getStageIndex(parcel.trackingStatus)
                const isCancelled = String(parcel.trackingStatus || parcel.status).toLowerCase() === 'cancelled'

                return (
                  <Card
                    key={parcel.id}
                    className="overflow-hidden border border-slate-200 bg-white p-5 shadow-soft hover:border-indigo-200 transition"
                  >
                    {/* Top Row: Order info & Status Badge */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">{parcel.orderNo}</span>
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              {parcel.trackingNumber}
                              <button
                                type="button"
                                title="Copy Tracking Number"
                                onClick={() => navigator.clipboard.writeText(parcel.trackingNumber)}
                                className="text-slate-400 hover:text-indigo-600"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Customer:{' '}
                            <strong className="text-slate-700">{parcel.user || 'Customer'}</strong> • Carrier:{' '}
                            <strong className="text-indigo-600">{parcel.carrier || 'Sellvro Express'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getTrackingBadge(parcel.trackingStatus)}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTrackingModal(parcel)}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          <span>Live Tracking Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Middle: Live Step Progress Bar */}
                    {!isCancelled ? (
                      <div className="py-5">
                        <div className="relative flex items-center justify-between">
                          {/* Horizontal Background Line */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-slate-100" />
                          {/* Active Progress Line */}
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-500"
                            style={{ width: `${(stageIdx / (TRACKING_STAGES.length - 1)) * 100}%` }}
                          />

                          {TRACKING_STAGES.map((stage, idx) => {
                            const isCompleted = idx <= stageIdx
                            const isCurrent = idx === stageIdx

                            return (
                              <div key={stage.key} className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                                    isCurrent
                                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100 animate-pulse'
                                      : isCompleted
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-slate-300 bg-white text-slate-400'
                                  }`}
                                >
                                  {isCompleted && !isCurrent ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <span className="text-xs font-bold">{idx + 1}</span>
                                  )}
                                </div>
                                <span
                                  className={`mt-2 text-xs font-medium text-center ${
                                    isCurrent
                                      ? 'font-bold text-indigo-700'
                                      : isCompleted
                                      ? 'text-slate-800'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {stage.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 px-4 my-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> This order shipment was cancelled.
                      </div>
                    )}

                    {/* Bottom Row: Product & Delivery Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400 block font-medium">Product Item:</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {parcel.product} (Qty: {parcel.quantity})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Destination:</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {parcel.shippingAddress?.city
                            ? `${parcel.shippingAddress.city}, ${parcel.shippingAddress.country || 'Pakistan'}`
                            : 'Standard Delivery Address'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Est. Delivery / Date:</span>
                        <span className="font-semibold text-indigo-700 block">
                          {parcel.estimatedDelivery || 'In Transit'} • {parcel.date}
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER PURCHASES & SALES REPORT */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 bg-white shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered user by name, email, or client ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <span className="text-xs text-slate-500">
              Showing <strong>{filteredUserReports.length}</strong> customers
            </span>
          </Card>

          <Card className="overflow-hidden border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">User ID</th>
                    <th className="px-5 py-3.5">Customer Name & Contact</th>
                    <th className="px-5 py-3.5">Total Purchased ($ Spent)</th>
                    <th className="px-5 py-3.5">Total Sales (Store Volume)</th>
                    <th className="px-5 py-3.5">Wallet Balance</th>
                    <th className="px-5 py-3.5">Active Parcels</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUserReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUserReports.map((item) => {
                      const u = item.user
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(item)
                                setActiveTab('user_detail')
                              }}
                              className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg border border-indigo-200 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Click to view full user reporting and parcel tracking"
                            >
                              <Truck className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{getUserDisplayId(u)}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 text-sm">
                                {(u.fullName || u.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{u.fullName || u.name}</span>
                                <span className="text-xs text-slate-400">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Kis User Ne Kitna Purchase Kia */}
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-emerald-700 text-sm block">
                                ${item.totalPurchasedAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-xs text-slate-500 block">
                                {item.totalPurchasedOrders} orders • {item.totalPurchasedItems} items
                              </span>
                            </div>
                          </td>

                          {/* Kitna Sale Kia */}
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-indigo-700 text-sm block">
                                ${item.totalSalesAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-xs text-slate-500 block">
                                {item.totalSalesOrders} orders sold
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-bold text-slate-800">
                            ${Number(u.walletBalance || 0).toFixed(2)} USD
                          </td>

                          <td className="px-5 py-4">
                            {item.activeParcels > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                <Truck className="h-3.5 w-3.5 animate-pulse" />
                                {item.activeParcels} in transit
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">0 active</span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <Badge tone={u.status === 'approved' ? 'success' : 'neutral'}>
                              {u.status || 'Active'}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(item)
                                setActiveTab('user_detail')
                              }}
                              className="inline-flex items-center gap-1 text-xs"
                            >
                              <span>View Full Report</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SINGLE USER DEEP DIVE REPORT */}
      {activeTab === 'user_detail' && selectedUser && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('report')}
              className="inline-flex items-center gap-1 text-slate-600"
            >
              ← Back to All Users Report
            </Button>

            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customer ID: {selectedUser.user.id || selectedUser.user._id}
            </span>
          </div>

          {/* User Profile Header Card */}
          <Card className="p-6 border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-md">
                  {(selectedUser.user.fullName || selectedUser.user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedUser.user.fullName || selectedUser.user.name}</h2>
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                      {getUserDisplayId(selectedUser.user)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedUser.user.email} • Role: {selectedUser.user.role || 'Customer'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Joined: {selectedUser.user.date || selectedUser.user.createdAt ? new Date(selectedUser.user.createdAt).toLocaleDateString() : 'Active'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTrackingSearch(selectedUser.user.fullName || selectedUser.user.name || '')
                    setActiveTab('tracking')
                  }}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <Truck className="h-4 w-4 text-indigo-600" />
                  <span>Live Parcels ({selectedUser.purchases.length})</span>
                </Button>

                <div className="rounded-xl border border-slate-200 bg-white p-3 text-right">
                  <span className="text-xs text-slate-400 block font-medium">Wallet Balance</span>
                  <span className="text-lg font-bold text-emerald-600">
                    ${Number(selectedUser.user.walletBalance || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* User Purchases vs Sales Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 border border-emerald-100 bg-emerald-50/20 shadow-soft">
              <div className="flex items-center justify-between border-b border-emerald-100/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  Total Purchases (Customer Spend)
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {selectedUser.totalPurchasedOrders} Orders
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-emerald-900">
                  ${selectedUser.totalPurchasedAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Total items bought: <strong>{selectedUser.totalPurchasedItems} units</strong> across all marketplace products.
                </p>
              </div>
            </Card>

            <Card className="p-5 border border-indigo-100 bg-indigo-50/20 shadow-soft">
              <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Total Sales (Store Revenue)
                </span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  {selectedUser.totalSalesOrders} Orders
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-indigo-900">
                  ${selectedUser.totalSalesAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Gross volume of products sold through customer store or reselling.
                </p>
              </div>
            </Card>
          </div>

          {/* Purchases vs Sales Monthly Trend Chart */}
          <Card className="p-5 border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Monthly Purchases vs Sales Volume</h3>
                <p className="text-xs text-slate-500">6-Month historical comparative analysis in USD</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedUserChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val, name) => [`$${Number(val).toFixed(2)} USD`, name === 'purchases' ? 'Purchases' : 'Sales']}
                  />
                  <Legend />
                  <Bar dataKey="purchases" fill="#10b981" name="Purchases ($)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sales" fill="#6366f1" name="Sales ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* User's Purchases & Parcels Table */}
          <Card className="overflow-hidden border border-slate-200 bg-white shadow-soft">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Customer Orders & Parcel Deliveries</h3>
              <span className="text-xs text-slate-500">{selectedUser.purchases.length} total orders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Order #</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Qty & Price</th>
                    <th className="px-5 py-3">Tracking #</th>
                    <th className="px-5 py-3">Parcel Status</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedUser.purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                        No purchase orders recorded for this user yet.
                      </td>
                    </tr>
                  ) : (
                    selectedUser.purchases.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{o.orderNo}</td>
                        <td className="px-5 py-3.5 text-slate-700">{o.product}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {o.quantity}x @ ${Number(o.unitPrice || 0).toFixed(2)} ={' '}
                          <strong className="text-slate-900">${Number(o.total || 0).toFixed(2)}</strong>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-indigo-600">
                          {o.trackingNumber || `SLV-${o.orderNo?.replace('ORD-', '')}`}
                        </td>
                        <td className="px-5 py-3.5">{getTrackingBadge(o.trackingStatus)}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{o.date}</td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTrackingModal(o)}
                            className="text-xs"
                          >
                            Track Parcel
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TRACKING DETAILS & DISPATCH UPDATE MODAL */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Live Parcel Dispatch & Tracking Control
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Order {selectedParcel.orderNo} • {selectedParcel.trackingNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
              {updateSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  ✓ {updateSuccess}
                </div>
              )}
              {updateError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                  ⚠ {updateError}
                </div>
              )}

              {/* Live Tracking Visual Steps */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Live Dispatch Status Pipeline
                </span>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {TRACKING_STAGES.map((stage, idx) => {
                    const currentIdx = getStageIndex(selectedParcel.trackingStatus)
                    const isPassed = idx <= currentIdx
                    const isNow = idx === currentIdx

                    return (
                      <div
                        key={stage.key}
                        className={`rounded-lg p-2.5 border transition ${
                          isNow
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold shadow-xs'
                            : isPassed
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold'
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <span className="block text-sm mb-1">{isPassed ? '✓' : idx + 1}</span>
                        <span className="text-[11px] leading-tight block">{stage.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Details Overview */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Recipient / Customer:</span>
                  <span className="font-bold text-slate-800 block text-sm mt-0.5">{selectedParcel.user}</span>
                  <span className="text-slate-500 block">{selectedParcel.shippingAddress?.fullName}</span>
                  <span className="text-slate-500 block">{selectedParcel.shippingAddress?.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Shipping Destination:</span>
                  <span className="font-bold text-slate-800 block text-sm mt-0.5">
                    {selectedParcel.shippingAddress?.city || 'City N/A'}, {selectedParcel.shippingAddress?.country || 'Pakistan'}
                  </span>
                  <span className="text-slate-500 block">{selectedParcel.shippingAddress?.addressLine}</span>
                </div>
              </div>

              {/* Tracking Timeline Log */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Parcel Dispatch Timeline Events
                </span>
                <div className="space-y-3 rounded-xl border border-slate-100 p-3 max-h-48 overflow-y-auto bg-white">
                  {(selectedParcel.trackingTimeline || [
                    {
                      title: 'Order Placed & Verified',
                      location: 'Sellvro Hub',
                      timestamp: selectedParcel.createdAt,
                      note: 'Ready for dispatch.',
                    },
                  ]).map((event, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mt-0.5">
                        <MapPin className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{event.title || event.status}</span>
                          <span className="text-[10px] text-slate-400">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Location: <strong className="text-slate-700">{event.location || 'Local Hub'}</strong> • {event.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Tracking Form */}
              <form onSubmit={handleSaveTracking} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                  Update Parcel Dispatch Status (Admin Action)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tracking Stage *</label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="placed">Placed (Awaiting Dispatch)</option>
                      <option value="processing">Processing (Warehouse Packaging)</option>
                      <option value="in_transit">In Transit (Dispatched with Courier)</option>
                      <option value="out_for_delivery">Out for Delivery (Rider en route)</option>
                      <option value="delivered">Delivered (Successfully Handed Over)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Carrier / Courier Name</label>
                    <input
                      type="text"
                      value={modalCarrier}
                      onChange={(e) => setModalCarrier(e.target.value)}
                      placeholder="e.g. TCS, Leopard, Trax, DHL, Sellvro Express"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={modalTrackingNo}
                      onChange={(e) => setModalTrackingNo(e.target.value)}
                      placeholder="e.g. SLV-TRK891240"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Current Hub Location</label>
                    <input
                      type="text"
                      value={modalLocation}
                      onChange={(e) => setModalLocation(e.target.value)}
                      placeholder="e.g. Karachi Sorting Hub, Lahore Express"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Status Note / Milestone Update</label>
                    <input
                      type="text"
                      value={modalNote}
                      onChange={(e) => setModalNote(e.target.value)}
                      placeholder="e.g. Package arrived at local delivery facility. Rider will deliver today."
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedParcel(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={updatingTracking}>
                    {updatingTracking ? 'Saving Changes…' : 'Save & Broadcast Live Tracking Update'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
