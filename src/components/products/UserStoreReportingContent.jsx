import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  Eye,
  Filter,
  HelpCircle,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  businessApi,
  disputeApi,
  getErrorMessage,
  mediaUrl,
  orderApi,
  productApi,
  walletApi,
} from '../../lib/api.js'
import Button from '../ui/Button.jsx'

const CURRENCY_SYMBOLS = {
  USD: '$',
  PKR: 'Rs ',
  EUR: '€',
  CNY: '¥',
}

const CURRENCY_RATES = {
  USD: 1,
  PKR: 280,
  EUR: 0.92,
  CNY: 7.25,
}

function formatCurrency(val, curr = 'USD') {
  const num = (Number(val) || 0) * (CURRENCY_RATES[curr] || 1)
  const sym = CURRENCY_SYMBOLS[curr] || '$'
  return `${sym}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatInt(val) {
  const num = Number(val) || 0
  return num.toLocaleString('en-US')
}

function extractArray(res, key = 'data') {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res[key])) return res[key]
  if (Array.isArray(res.products)) return res.products
  if (Array.isArray(res.orders)) return res.orders
  if (Array.isArray(res.disputes)) return res.disputes
  return []
}

export default function UserStoreReportingContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [storeProfile, setStoreProfile] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [disputes, setDisputes] = useState([])

  // Filters
  const [dateRange, setDateRange] = useState('all')
  const [currency, setCurrency] = useState('USD')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [brandLabelFilter, setBrandLabelFilter] = useState('all')
  const [sortBy, setSortBy] = useState('spend_desc') // 'spend_desc', 'units_desc', 'name_asc', 'recent_desc'

  // Selected Product Drill-down Modal State
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Load Data for User: strictly scoped to logged-in user
  const loadUserData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ordRes, prodRes, bizRes, walRes, dispRes] = await Promise.all([
        orderApi.mine().catch(() => ({ data: [] })),
        productApi.marketplace().catch(() => ({ data: [] })),
        businessApi.getMine().catch(() => ({})),
        walletApi.balance().catch(() => ({ balance: 0 })),
        disputeApi.mine().catch(() => ({ data: [] })),
      ])

      setOrders(extractArray(ordRes, 'orders'))
      setMarketplaceProducts(extractArray(prodRes, 'products'))
      setStoreProfile(bizRes?.profile || null)
      setUserProfile(bizRes?.user || null)
      setWalletBalance(walRes?.balance ?? bizRes?.user?.walletBalance ?? 0)
      setDisputes(extractArray(dispRes, 'disputes'))
    } catch (err) {
      console.error('Failed to load user store report:', err)
      setError(getErrorMessage(err, 'Failed to load store reporting data.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // Filter Orders by Date
  const filteredOrders = useMemo(() => {
    const now = new Date()

    return orders.filter((o) => {
      const rawDate = o.createdAt || o.date
      const orderDate = new Date(rawDate)
      const validDate = !Number.isNaN(orderDate.getTime())

      if (validDate && dateRange !== 'all') {
        if (dateRange === 'today') {
          if (
            orderDate.getDate() !== now.getDate() ||
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getFullYear() !== now.getFullYear()
          ) {
            return false
          }
        } else if (dateRange === 'yesterday') {
          const yesterday = new Date(now)
          yesterday.setDate(yesterday.getDate() - 1)
          if (
            orderDate.getDate() !== yesterday.getDate() ||
            orderDate.getMonth() !== yesterday.getMonth() ||
            orderDate.getFullYear() !== yesterday.getFullYear()
          ) {
            return false
          }
        } else if (dateRange === 'last_7_days') {
          const past7 = new Date(now)
          past7.setDate(past7.getDate() - 7)
          if (orderDate < past7) return false
        } else if (dateRange === 'last_30_days') {
          const past30 = new Date(now)
          past30.setDate(past30.getDate() - 30)
          if (orderDate < past30) return false
        } else if (dateRange === 'this_month') {
          if (
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getFullYear() !== now.getFullYear()
          ) {
            return false
          }
        }
      }

      return true
    })
  }, [orders, dateRange])

  // Overall Store Sourcing & Spend Metrics
  const storeMetrics = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== 'cancelled')
    const totalOrdersCount = filteredOrders.length

    let completedCount = 0
    let inProcessCount = 0
    let placedCount = 0
    let cancelledCount = 0

    filteredOrders.forEach((o) => {
      const s = String(o.status || '').toLowerCase()
      if (s === 'cancelled' || s === 'failed') cancelledCount++
      else if (s === 'delivered' || s === 'completed') completedCount++
      else if (s === 'in_process' || s === 'processing') inProcessCount++
      else placedCount++
    })

    const totalSpend = validOrders.reduce((sum, o) => {
      return sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0))
    }, 0)

    const totalUnitsSourced = validOrders.reduce((sum, o) => {
      return sum + (Number(o.quantity) || 1)
    }, 0)

    const avgOrderValue = validOrders.length > 0 ? totalSpend / validOrders.length : 0

    return {
      totalSpend,
      totalUnitsSourced,
      totalOrdersCount,
      completedCount,
      inProcessCount,
      placedCount,
      cancelledCount,
      avgOrderValue,
    }
  }, [filteredOrders])

  // Marketplace Products Lookup Map
  const marketplaceMap = useMemo(() => {
    const map = new Map()
    marketplaceProducts.forEach((p) => {
      const id = String(p.id || p._id || '').trim()
      const sku = String(p.sku || '').trim().toUpperCase()
      const name = String(p.name || '').trim().toLowerCase()
      if (id) map.set(id, p)
      if (sku) map.set(sku, p)
      if (name) map.set(name, p)
    })
    return map
  }, [marketplaceProducts])

  // Aggregate Products Sourced by this User's Store
  const sourcedProductRows = useMemo(() => {
    const map = new Map()

    filteredOrders.forEach((order) => {
      const pId = String(
        order.productId ||
          (typeof order.product === 'object' ? order.product?.id || order.product?._id : order.product) ||
          '',
      ).trim()
      const pSku = String(
        order.productSku || order.sku || (typeof order.product === 'object' ? order.product?.sku : '') || '',
      ).trim().toUpperCase()
      const pName = String(
        order.product || order.productName || (typeof order.product === 'object' ? order.product?.name : '') || 'Unnamed Product',
      ).trim()

      const key = pSku || pId || pName

      // Check marketplace product details
      const mProd = marketplaceMap.get(pId) || marketplaceMap.get(pSku) || marketplaceMap.get(pName.toLowerCase())

      if (!map.has(key)) {
        map.set(key, {
          key,
          id: pId || mProd?.id || mProd?._id || key,
          name: pName || mProd?.name || 'Product',
          sku: pSku || mProd?.sku || 'SKU-SVRO',
          category: mProd?.category || 'General',
          brand: mProd?.brand || '—',
          image: order.productImage || mProd?.image || (Array.isArray(mProd?.images) ? mProd?.images[0] : ''),
          unitPrice: Number(order.unitPrice || mProd?.price || 0),
          isWms: Boolean(mProd?.inWarehouse || mProd?.fulfillBy === 'warehouse'),
          totalUnitsSourced: 0,
          totalSpent: 0,
          ordersCount: 0,
          deliveredCount: 0,
          inProcessCount: 0,
          cancelledCount: 0,
          lastOrderDate: order.createdAt || order.date,
          ordersList: [],
        })
      }

      const pObj = map.get(key)
      pObj.ordersCount += 1
      pObj.ordersList.push(order)

      const s = String(order.status || '').toLowerCase()
      if (s === 'cancelled' || s === 'failed') {
        pObj.cancelledCount += 1
      } else {
        const qty = Number(order.quantity || 1)
        const amt = Number(order.total) || qty * Number(order.unitPrice || pObj.unitPrice)
        pObj.totalUnitsSourced += qty
        pObj.totalSpent += amt

        if (s === 'delivered' || s === 'completed') pObj.deliveredCount += 1
        else pObj.inProcessCount += 1
      }

      // Track latest date
      if (new Date(order.createdAt || order.date) > new Date(pObj.lastOrderDate)) {
        pObj.lastOrderDate = order.createdAt || order.date
      }
    })

    return Array.from(map.values())
  }, [filteredOrders, marketplaceMap])

  // Fulfillment & Sourcing Distribution Stats
  const distributionStats = useMemo(() => {
    const totalSourcedProducts = sourcedProductRows.length

    let wmsCount = 0
    let wmsUnits = 0
    let supplierDirectCount = 0
    let supplierDirectUnits = 0
    let customBrandedOrdersCount = 0

    sourcedProductRows.forEach((p) => {
      if (p.isWms) {
        wmsCount += 1
        wmsUnits += p.totalUnitsSourced
      } else {
        supplierDirectCount += 1
        supplierDirectUnits += p.totalUnitsSourced
      }
    })

    filteredOrders.forEach((o) => {
      if (o.brandLabel && o.brandLabel.trim() !== '') {
        customBrandedOrdersCount += 1
      }
    })

    const wmsPercent = totalSourcedProducts > 0 ? Math.round((wmsCount / totalSourcedProducts) * 100) : 0
    const directPercent = totalSourcedProducts > 0 ? Math.round((supplierDirectCount / totalSourcedProducts) * 100) : 0

    return {
      totalSourcedProducts,
      wmsCount,
      wmsUnits,
      wmsPercent,
      supplierDirectCount,
      supplierDirectUnits,
      directPercent,
      customBrandedOrdersCount,
      brandedOrderRate: filteredOrders.length > 0 ? Math.round((customBrandedOrdersCount / filteredOrders.length) * 100) : 0,
    }
  }, [sourcedProductRows, filteredOrders])

  // Filtered & Sorted Display Rows
  const displayRows = useMemo(() => {
    let list = [...sourcedProductRows]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    }

    if (statusFilter === 'active_orders') {
      list = list.filter((p) => p.inProcessCount > 0)
    } else if (statusFilter === 'delivered') {
      list = list.filter((p) => p.deliveredCount > 0)
    }

    if (brandLabelFilter === 'branded') {
      list = list.filter((p) => p.ordersList.some((o) => o.brandLabel && o.brandLabel.trim() !== ''))
    }

    list.sort((a, b) => {
      if (sortBy === 'spend_desc') return b.totalSpent - a.totalSpent
      if (sortBy === 'units_desc') return b.totalUnitsSourced - a.totalUnitsSourced
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy === 'recent_desc') return new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
      return 0
    })

    return list
  }, [sourcedProductRows, searchQuery, statusFilter, brandLabelFilter, sortBy])

  // Top 5 Sourced Products Leaderboard
  const topSourced = useMemo(() => {
    return [...sourcedProductRows]
      .filter((p) => p.totalUnitsSourced > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
  }, [sourcedProductRows])

  // Export Store Report to CSV
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,'
    csv += `Client Store Sourcing Report: ${storeProfile?.businessName || userProfile?.fullName || 'My Store'}\n`
    csv += `Generated: ${new Date().toLocaleString()}\n`
    csv += `Total Sourced Spend: ${storeMetrics.totalSpend}\n`
    csv += `Total Sourced Units: ${storeMetrics.totalUnitsSourced}\n`
    csv += `Total Orders: ${storeMetrics.totalOrdersCount}\n\n`

    csv += 'Product Name,SKU,Category,Fulfillment,Units Sourced,Unit Price,Total Spent,Orders Count,Delivered Units\n'
    sourcedProductRows.forEach((p) => {
      const cleanName = `"${p.name.replace(/"/g, '""')}"`
      const fLabel = p.isWms ? 'Sellvro WMS' : 'Direct Supplier'
      csv += `${cleanName},"${p.sku}","${p.category}","${fLabel}",${p.totalUnitsSourced},${p.unitPrice},${p.totalSpent},${p.ordersCount},${p.deliveredCount}\n`
    })

    const encodedUri = encodeURI(csv)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `store_sourcing_report_${storeProfile?.businessName || 'user'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleInspectProduct = (prodRow) => {
    setSelectedProduct(prodRow)
    setIsDrawerOpen(true)
  }

  const storeName = storeProfile?.businessName || userProfile?.fullName || 'My Dropship Store'
  const storeClientId = userProfile?.clientId || `CLT-${userProfile?.id?.slice?.(-4) || '8201'}`

  if (loading) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-[#5932ea]" />
        <p className="text-sm font-semibold text-slate-600">Loading your store sourcing report & orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* ── 1. USER STORE IDENTITY & HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-[#1e293b] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <Store className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{storeName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-400/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Dropshipper Store
                </span>
                <span className="font-mono text-xs rounded-md bg-white/10 px-2 py-0.5 text-slate-300 border border-white/10">
                  ID: {storeClientId}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 flex flex-wrap items-center gap-3">
                <span>{userProfile?.email || 'user@sellvro.com'}</span>
                <span>•</span>
                <span>{storeProfile?.businessCategory || 'Dropshipping & Retail'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Private Store Analytics (Isolated)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons & Wallet Balance */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10 text-right">
              <span className="text-[10px] text-slate-300 uppercase font-bold block">Available Wallet</span>
              <span className="text-lg font-black text-emerald-400">
                {formatCurrency(walletBalance, currency)}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={loadUserData}
              className="bg-[#5932ea] hover:bg-[#4a26cb] text-white border-0 shadow-lg"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 2. GLOBAL FILTERS BAR (DATE RANGE + CURRENCY) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Date Range Quick Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Period:
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last_7_days', label: 'Last 7 Days' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDateRange(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                dateRange === id
                  ? 'bg-[#5932ea] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Currency:</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-[#5932ea] focus:outline-none"
          >
            <option value="USD">USD ($)</option>
            <option value="PKR">PKR (Rs)</option>
            <option value="EUR">EUR (€)</option>
            <option value="CNY">CNY (¥)</option>
          </select>
        </div>
      </div>

      {/* ── 3. TOP STORE SOURCING & SPEND METRICS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Sourced Volume / Spend */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-[#5932ea]">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Total Sourced Spend</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-[#5932ea]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(storeMetrics.totalSpend, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Sourced via Marketplace</span>
            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Active
            </span>
          </div>
        </div>

        {/* Card 2: Total Units Sourced / Ordered */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Total Units Sourced</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatInt(storeMetrics.totalUnitsSourced)} <span className="text-sm font-semibold text-slate-500">Units</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>From Confirmed Orders</span>
            <span className="font-semibold text-amber-600">
              {formatInt(storeMetrics.totalOrdersCount)} Orders
            </span>
          </div>
        </div>

        {/* Card 3: Active Orders in Pipeline */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-purple-500">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Orders in Fulfillment</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700 tracking-tight">
            {storeMetrics.inProcessCount + storeMetrics.placedCount} <span className="text-sm font-semibold text-slate-500">Active</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>In Process: {storeMetrics.inProcessCount}</span>
            <span className="text-amber-600 font-semibold">Placed: {storeMetrics.placedCount}</span>
          </div>
        </div>

        {/* Card 4: Delivered / Completed Orders */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Delivered Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">
            {storeMetrics.completedCount} <span className="text-sm font-semibold text-slate-500">Delivered</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Avg Order Spend</span>
            <span className="font-semibold text-slate-700">{formatCurrency(storeMetrics.avgOrderValue, currency)}</span>
          </div>
        </div>
      </div>

      {/* ── 4. SOURCED INVENTORY & FULFILLMENT DISTRIBUTION (WMS vs SUPPLIER DIRECT) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#5932ea]" />
              Sourced Products & Fulfillment Pipeline
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Overview of products your store has sourced from Sellvro and how they are fulfilled for your customers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/user/products"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5932ea] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#4a26cb]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Browse More Products
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tile 1: Total Unique Products Sourced */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Unique Sourced SKUs</span>
              <Box className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{distributionStats.totalSourcedProducts}</span>
              <span className="text-xs text-slate-500">Distinct Products</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-2">
              <span>Total Store Orders:</span>
              <span className="font-bold text-slate-900">{orders.length}</span>
            </div>
          </div>

          {/* Tile 2: Fulfilled via Sellvro WMS */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 transition-all hover:bg-indigo-50/70">
            <div className="flex items-center justify-between text-xs text-indigo-900">
              <span className="font-bold flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Sellvro WMS Warehouse
              </span>
              <span className="rounded-full bg-indigo-200/70 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                {distributionStats.wmsPercent}% Sourced
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-900">{distributionStats.wmsCount}</span>
              <span className="text-xs font-semibold text-indigo-700">Products in WMS</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-indigo-900 font-semibold border-t border-indigo-100 pt-2">
              <span>Units Sourced from WMS:</span>
              <span className="font-black text-indigo-700">{formatInt(distributionStats.wmsUnits)} Units</span>
            </div>
          </div>

          {/* Tile 3: Direct Supplier Fulfillment */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 transition-all hover:bg-emerald-50/70">
            <div className="flex items-center justify-between text-xs text-emerald-900">
              <span className="font-bold flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-600" />
                Supplier Direct
              </span>
              <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {distributionStats.directPercent}% Sourced
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-900">{distributionStats.supplierDirectCount}</span>
              <span className="text-xs font-semibold text-emerald-700">Products from Vendor</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-emerald-900 font-semibold border-t border-emerald-100 pt-2">
              <span>Units Sourced from Supplier:</span>
              <span className="font-black text-emerald-700">{formatInt(distributionStats.supplierDirectUnits)} Units</span>
            </div>
          </div>

          {/* Tile 4: Custom Dropshipping Brand Labels */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 transition-all hover:bg-purple-50/70">
            <div className="flex items-center justify-between text-xs text-purple-900">
              <span className="font-bold flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-purple-600" />
                Custom Brand Packaging
              </span>
              <span className="rounded-full bg-purple-200/70 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                {distributionStats.brandedOrderRate}% Branded
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-900">{distributionStats.customBrandedOrdersCount}</span>
              <span className="text-xs font-semibold text-purple-700">Branded Orders</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-purple-900 font-semibold border-t border-purple-100 pt-2">
              <span>Custom Label Used:</span>
              <span className="font-black text-purple-700">Active Dropship</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. TOP SOURCED PRODUCTS SPOTLIGHT (LEADERBOARD) ── */}
      {topSourced.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-[#5932ea]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Top Sourced Products for Your Store</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Ranked by spend & volume</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {topSourced.map((item, idx) => (
              <div
                key={item.key}
                onClick={() => handleInspectProduct(item)}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-3 hover:border-[#5932ea] hover:bg-white hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {item.image ? (
                      <img src={mediaUrl(item.image)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 m-auto text-slate-300" />
                    )}
                    <span className="absolute left-0 top-0 rounded-br bg-[#5932ea] px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-bold text-slate-900 group-hover:text-[#5932ea]">
                      {item.name}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">{item.sku}</p>
                    <p className="mt-0.5 text-xs font-extrabold text-emerald-600">
                      {formatCurrency(item.totalSpent, currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                  <span>Sourced: <b>{item.totalUnitsSourced} units</b></span>
                  <span className="text-[#5932ea] font-semibold group-hover:underline flex items-center gap-0.5">
                    View Orders →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. INTERACTIVE PRODUCT-WISE SOURCING & SALES TABLE ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Title & Summary */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#5932ea]" />
              Sourced Products & Order Tracking
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any product to see the full list of orders, shipping addresses, customer delivery statuses, and brand packaging labels.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Showing: <b>{displayRows.length}</b> Sourced Products</span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search product by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="all">All Order Statuses</option>
            <option value="active_orders">In Process Orders</option>
            <option value="delivered">Delivered Orders</option>
          </select>

          {/* Brand Packaging Label Filter */}
          <select
            value={brandLabelFilter}
            onChange={(e) => setBrandLabelFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="all">All Packaging Types</option>
            <option value="branded">With Custom Brand Label</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="spend_desc">Highest Spend First</option>
            <option value="units_desc">Most Units Sourced</option>
            <option value="recent_desc">Recently Ordered First</option>
            <option value="name_asc">Product Name (A-Z)</option>
          </select>
        </div>

        {/* Main Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <th className="px-4 py-3">Product & SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3 text-center">Units Sourced</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Total Spend</th>
                <th className="px-4 py-3 text-center">Orders Count</th>
                <th className="px-4 py-3 text-center">Delivered</th>
                <th className="px-4 py-3 text-center">In Pipeline</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <PackageOpen className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No sourced products found in this period.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Browse Sellvro Marketplace to order products for your store.
                    </p>
                    <Link
                      to="/user/products"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#5932ea] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
                    >
                      Browse Products
                    </Link>
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => (
                  <tr
                    key={row.key}
                    onClick={() => handleInspectProduct(row)}
                    className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                  >
                    {/* 1. Product Thumbnail & SKU */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {row.image ? (
                            <img src={mediaUrl(row.image)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 m-auto text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <span className="font-bold text-slate-900 group-hover:text-[#5932ea] line-clamp-1 block">
                            {row.name}
                          </span>
                          <span className="font-mono text-[11px] text-[#5932ea] font-semibold">{row.sku}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Category */}
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {row.category}
                      </span>
                    </td>

                    {/* 3. Fulfillment */}
                    <td className="px-4 py-3.5">
                      {row.isWms ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                          <Building2 className="h-3 w-3" />
                          Sellvro WMS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <Truck className="h-3 w-3" />
                          Supplier Direct
                        </span>
                      )}
                    </td>

                    {/* 4. Units Sourced */}
                    <td className="px-4 py-3.5 text-center font-extrabold text-amber-700">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 border border-amber-200">
                        {row.totalUnitsSourced}
                      </span>
                    </td>

                    {/* 5. Unit Price */}
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {formatCurrency(row.unitPrice, currency)}
                    </td>

                    {/* 6. Total Spent */}
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {formatCurrency(row.totalSpent, currency)}
                    </td>

                    {/* 7. Orders Count */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-slate-700">{row.ordersCount}</span>
                    </td>

                    {/* 8. Delivered */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                        {row.deliveredCount}
                      </span>
                    </td>

                    {/* 9. In Pipeline */}
                    <td className="px-4 py-3.5 text-center">
                      {row.inProcessCount > 0 ? (
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 font-bold text-purple-700">
                          {row.inProcessCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* 10. Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInspectProduct(row)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#5932ea] hover:text-[#5932ea] transition-all cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        Orders ({row.ordersCount})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. SLIDE-OVER DRAWER: SOURCED ORDERS & SHIPMENT DRILL-DOWN ── */}
      {isDrawerOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity p-0 sm:p-4">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl sm:rounded-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  {selectedProduct.image ? (
                    <img src={mediaUrl(selectedProduct.image)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 m-auto text-slate-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#5932ea]">
                      {selectedProduct.sku}
                    </span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                      {selectedProduct.isWms ? 'Sellvro WMS' : 'Direct Supplier'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{selectedProduct.name}</h3>
                  <p className="text-xs text-slate-500">
                    Sourced: <b>{selectedProduct.totalUnitsSourced} units</b> • Unit Cost: <b>{formatCurrency(selectedProduct.unitPrice, currency)}</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Performance Summary Banner */}
            <div className="grid grid-cols-4 gap-2 bg-[#f8fafc] border-b border-slate-200 p-4 text-center">
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sourced</span>
                <span className="text-base font-black text-amber-600 block mt-0.5">
                  {selectedProduct.totalUnitsSourced} Units
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
                <span className="text-base font-black text-slate-900 block mt-0.5">
                  {formatCurrency(selectedProduct.totalSpent, currency)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivered</span>
                <span className="text-base font-black text-emerald-600 block mt-0.5">
                  {selectedProduct.deliveredCount} Orders
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">In Pipeline</span>
                <span className="text-base font-black text-purple-600 block mt-0.5">
                  {selectedProduct.inProcessCount} Orders
                </span>
              </div>
            </div>

            {/* Orders & Buyer List Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-[#5932ea]" />
                  Orders Placed for this Product ({selectedProduct.ordersList.length} Orders)
                </h4>
                <span className="text-xs text-slate-400">Order and shipment details</span>
              </div>

              {selectedProduct.ordersList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <ShoppingBag className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No orders for this product yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedProduct.ordersList.map((order, oIdx) => {
                    const qty = Number(order.quantity || 1)
                    const totalAmt = Number(order.total) || qty * Number(order.unitPrice || selectedProduct.unitPrice)
                    const shipping = order.shippingAddress || {}
                    const recipientName = shipping.fullName || 'Customer'
                    const destination = [shipping.addressLine, shipping.city, shipping.country].filter(Boolean).join(', ') || '—'
                    const orderDateStr = order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—')

                    return (
                      <div
                        key={order.id || order._id || oIdx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {order.orderNo || `ORD-${oIdx + 1}`}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                order.status === 'delivered' || order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'in_process'
                                  ? 'bg-purple-100 text-purple-800'
                                  : order.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.statusLabel || order.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {orderDateStr}
                          </span>
                        </div>

                        {/* Customer & Shipping Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* Recipient */}
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Shipped To Customer</span>
                            <span className="font-bold text-slate-900 block mt-0.5">{recipientName}</span>
                            {shipping.phone && (
                              <span className="text-[11px] text-slate-500 block">{shipping.phone}</span>
                            )}
                          </div>

                          {/* Quantity & Spend */}
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Quantity & Total</span>
                            <span className="font-extrabold text-[#5932ea] block mt-0.5">
                              {qty} {qty === 1 ? 'Unit' : 'Units'} Sourced
                            </span>
                            <span className="font-semibold text-slate-700 block">
                              Total: {formatCurrency(totalAmt, currency)}
                            </span>
                          </div>

                          {/* Shipping Destination & Brand Label */}
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Address & Packaging</span>
                            <span className="font-medium text-slate-800 block mt-0.5 flex items-start gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{destination}</span>
                            </span>
                            {order.brandLabel && (
                              <span className="mt-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                                Custom Label: {order.brandLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Product SKU: <b className="font-mono text-slate-800">{selectedProduct.sku}</b>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(false)}
                className="bg-white"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
