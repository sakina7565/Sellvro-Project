import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  Filter,
  HelpCircle,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  businessApi,
  disputeApi,
  getErrorMessage,
  mediaUrl,
  orderApi,
  productApi,
} from '../../lib/api.js'
import Badge from '../ui/Badge.jsx'
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

function isOrderForProduct(order, product) {
  if (!order || !product) return false
  const pId = String(product.id || product._id || '').trim()
  const pSku = String(product.sku || '').trim().toUpperCase()
  const pName = String(product.name || '').trim().toLowerCase()

  const oProdId = String(
    order.productId ||
      (typeof order.product === 'object' ? order.product?.id || order.product?._id : order.product) ||
      '',
  ).trim()
  const oProdSku = String(
    order.productSku || order.sku || (typeof order.product === 'object' ? order.product?.sku : '') || '',
  ).trim().toUpperCase()
  const oProdName = String(
    order.product || order.productName || (typeof order.product === 'object' ? order.product?.name : '') || '',
  ).trim().toLowerCase()

  return (
    (pId && oProdId && pId === oProdId) ||
    (pSku && oProdSku && pSku === oProdSku) ||
    (pName && oProdName && pName === oProdName)
  )
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

export default function SupplierStoreReportingContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [disputes, setDisputes] = useState([])
  const [storeProfile, setStoreProfile] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // Filters
  const [dateRange, setDateRange] = useState('all')
  const [currency, setCurrency] = useState('USD')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all') // 'all', 'warehouse', 'self'
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'low', 'out'
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('sales_desc') // 'sales_desc', 'units_desc', 'stock_asc', 'name_asc'

  // Selected Product Drill-down Modal State
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Load Data: strictly scoped to logged-in supplier
  const loadStoreData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [prodRes, ordRes, bizRes, dispRes] = await Promise.all([
        productApi.mine().catch(() => ({ data: [] })),
        orderApi.supplier().catch(() => ({ data: [] })),
        businessApi.getMine().catch(() => ({})),
        disputeApi.mine().catch(() => ({ data: [] })),
      ])

      setProducts(extractArray(prodRes, 'products'))
      setOrders(extractArray(ordRes, 'orders'))
      setStoreProfile(bizRes?.profile || null)
      setUserProfile(bizRes?.user || null)
      setDisputes(extractArray(dispRes, 'disputes'))
    } catch (err) {
      console.error('Failed to load supplier store report:', err)
      setError(getErrorMessage(err, 'Failed to load store reporting data.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStoreData()
  }, [loadStoreData])

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

  // Store Summary Metrics
  const storeMetrics = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== 'cancelled')
    const totalOrdersCount = filteredOrders.length

    // Order status counts
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

    // Total gross sales & units sold
    const grossSales = validOrders.reduce((sum, o) => {
      const val = Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0)
      return sum + val
    }, 0)

    const totalUnitsSold = validOrders.reduce((sum, o) => {
      return sum + (Number(o.quantity) || 1)
    }, 0)

    // Platform commissions deducted
    const totalCommission = validOrders.reduce((sum, o) => {
      if (o.commission && Number(o.commission) > 0) return sum + Number(o.commission)
      const commRate = Number(o.commissionPercent || 10)
      const orderTotal = Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0)
      return sum + (commRate / 100) * orderTotal
    }, 0)

    const netEarnings = Math.max(0, grossSales - totalCommission)
    const avgOrderValue = validOrders.length > 0 ? grossSales / validOrders.length : 0

    return {
      grossSales,
      netEarnings,
      totalUnitsSold,
      totalOrdersCount,
      completedCount,
      inProcessCount,
      placedCount,
      cancelledCount,
      totalCommission,
      avgOrderValue,
    }
  }, [filteredOrders])

  // Products Inventory Breakdown (WMS vs Self, Overall Listed, Stock status)
  const productInventoryBreakdown = useMemo(() => {
    const totalListed = products.length

    let inWmsCount = 0
    let inWmsStock = 0
    let selfCount = 0
    let selfStock = 0

    let activeCount = 0
    let pendingCount = 0
    let draftCount = 0
    let rejectedCount = 0

    let totalStockUnits = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    products.forEach((p) => {
      const isWms = Boolean(p.inWarehouse || p.fulfillBy === 'warehouse')
      const stock = Number(p.quantity || 0)
      totalStockUnits += stock

      if (isWms) {
        inWmsCount += 1
        inWmsStock += stock
      } else {
        selfCount += 1
        selfStock += stock
      }

      if (stock === 0) outOfStockCount += 1
      else if (stock <= 5) lowStockCount += 1

      const st = String(p.status || '').toLowerCase()
      if (st === 'active' || st === 'approved') activeCount += 1
      else if (st === 'pending_approval') pendingCount += 1
      else if (st === 'draft') draftCount += 1
      else if (st === 'rejected') rejectedCount += 1
      else activeCount += 1
    })

    const wmsPercentage = totalListed > 0 ? Math.round((inWmsCount / totalListed) * 100) : 0
    const selfPercentage = totalListed > 0 ? Math.round((selfCount / totalListed) * 100) : 0

    return {
      totalListed,
      inWmsCount,
      inWmsStock,
      wmsPercentage,
      selfCount,
      selfStock,
      selfPercentage,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
      activeCount,
      pendingCount,
      draftCount,
      rejectedCount,
    }
  }, [products])

  // Calculate Product-Specific Performance Rows
  const productPerformanceRows = useMemo(() => {
    return products.map((product) => {
      // Find all orders for this specific product in the filtered period
      const productOrders = filteredOrders.filter((o) => isOrderForProduct(o, product))
      const validOrders = productOrders.filter((o) => o.status !== 'cancelled')

      const unitsSold = validOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)
      const grossSales = validOrders.reduce((sum, o) => {
        return sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || product.price || 0))
      }, 0)

      const commissionRate = Number(product.commission || 10)
      const platformFee = validOrders.reduce((sum, o) => {
        if (o.commission && Number(o.commission) > 0) return sum + Number(o.commission)
        const total = Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || product.price || 0)
        return sum + (commissionRate / 100) * total
      }, 0)

      const netEarnings = Math.max(0, grossSales - platformFee)

      // Unique buyers
      const buyerSet = new Set()
      validOrders.forEach((o) => {
        const uid = o.userId || o.userEmail || o.user
        if (uid) buyerSet.add(uid)
      })

      const isWms = Boolean(product.inWarehouse || product.fulfillBy === 'warehouse')
      const stock = Number(product.quantity || 0)

      // Check disputes for this product
      const productDisputes = disputes.filter((d) => {
        const dProdId = String(d.productId || d.product?.id || d.product?._id || d.product || '').trim()
        const pId = String(product.id || product._id || '').trim()
        return dProdId && pId && dProdId === pId
      })

      return {
        product,
        id: product.id || product._id,
        name: product.name,
        sku: product.sku,
        category: product.category || 'General',
        brand: product.brand || '—',
        image: product.image || (Array.isArray(product.images) ? product.images[0] : ''),
        price: Number(product.price || 0),
        stock,
        isWms,
        fulfillmentLabel: isWms ? 'WMS Warehouse' : 'Self (With Supplier)',
        unitsSold,
        grossSales,
        netEarnings,
        ordersCount: productOrders.length,
        validOrdersCount: validOrders.length,
        uniqueBuyersCount: buyerSet.size,
        status: product.status || 'active',
        disputesCount: productDisputes.length,
        ordersList: productOrders,
      }
    })
  }, [products, filteredOrders, disputes])

  // Filtered & Sorted Product Rows for display
  const displayProductRows = useMemo(() => {
    let list = [...productPerformanceRows]

    // Search query (SKU or Name)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase())
    }

    // Fulfillment filter (WMS vs Self)
    if (fulfillmentFilter === 'warehouse') {
      list = list.filter((p) => p.isWms)
    } else if (fulfillmentFilter === 'self') {
      list = list.filter((p) => !p.isWms)
    }

    // Stock filter
    if (stockFilter === 'low') {
      list = list.filter((p) => p.stock > 0 && p.stock <= 5)
    } else if (stockFilter === 'out') {
      list = list.filter((p) => p.stock === 0)
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'sales_desc') return b.grossSales - a.grossSales
      if (sortBy === 'units_desc') return b.unitsSold - a.unitsSold
      if (sortBy === 'stock_asc') return a.stock - b.stock
      if (sortBy === 'stock_desc') return b.stock - a.stock
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      return 0
    })

    return list
  }, [productPerformanceRows, searchQuery, categoryFilter, fulfillmentFilter, stockFilter, statusFilter, sortBy])

  // Top 5 Best Sellers Leaderboard
  const topSellers = useMemo(() => {
    return [...productPerformanceRows]
      .filter((p) => p.unitsSold > 0)
      .sort((a, b) => b.grossSales - a.grossSales)
      .slice(0, 5)
  }, [productPerformanceRows])

  // Monthly Sales Chart Data (Last 6 Months)
  const salesChartData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString('en-US', { month: 'short' })
      months.push({
        name: label,
        month: d.getMonth(),
        year: d.getFullYear(),
        sales: 0,
        orders: 0,
        units: 0,
      })
    }

    orders.forEach((o) => {
      if (o.status === 'cancelled') return
      const oDate = new Date(o.createdAt || o.date)
      if (Number.isNaN(oDate.getTime())) return

      const bucket = months.find((m) => m.month === oDate.getMonth() && m.year === oDate.getFullYear())
      if (bucket) {
        const val = Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0)
        bucket.sales += val * (CURRENCY_RATES[currency] || 1)
        bucket.orders += 1
        bucket.units += Number(o.quantity) || 1
      }
    })

    return months
  }, [orders, currency])

  // Handle open drill-down modal for a product
  const handleInspectProduct = (prodRow) => {
    setSelectedProduct(prodRow)
    setIsDrawerOpen(true)
  }

  // Export Store Report to CSV
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,'
    csv += `Store Report: ${storeProfile?.businessName || userProfile?.fullName || 'My Store'}\n`
    csv += `Generated: ${new Date().toLocaleString()}\n`
    csv += `Total Products Listed: ${productInventoryBreakdown.totalListed}\n`
    csv += `In WMS Warehouse: ${productInventoryBreakdown.inWmsCount} (${productInventoryBreakdown.inWmsStock} units)\n`
    csv += `Self Fulfilled: ${productInventoryBreakdown.selfCount} (${productInventoryBreakdown.selfStock} units)\n`
    csv += `Total Sales: ${storeMetrics.grossSales}\n`
    csv += `Total Units Sold: ${storeMetrics.totalUnitsSold}\n\n`

    csv += 'Product Name,SKU,Category,Fulfillment,Stock,Unit Price,Units Sold,Gross Sales,Net Earnings,Unique Buyers,Status\n'
    productPerformanceRows.forEach((p) => {
      const cleanName = `"${p.name.replace(/"/g, '""')}"`
      csv += `${cleanName},"${p.sku}","${p.category}","${p.fulfillmentLabel}",${p.stock},${p.price},${p.unitsSold},${p.grossSales},${p.netEarnings},${p.uniqueBuyersCount},"${p.status}"\n`
    })

    const encodedUri = encodeURI(csv)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `store_report_${storeProfile?.businessName || 'supplier'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Categories list
  const allCategories = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  const storeName = storeProfile?.businessName || userProfile?.fullName || 'My Store'
  const storeClientId = userProfile?.clientId || userProfile?.supplierCode || `WMS-PAK${userProfile?.id?.slice?.(-4) || '1021'}`

  if (loading) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-[#5932ea]" />
        <p className="text-sm font-semibold text-slate-600">Loading your store report & sales data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* ── 1. STORE HEADER & IDENTITY BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-[#31104b] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <Store className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{storeName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Store
                </span>
                <span className="font-mono text-xs rounded-md bg-white/10 px-2 py-0.5 text-slate-300 border border-white/10">
                  ID: {storeClientId}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 flex flex-wrap items-center gap-3">
                <span>{userProfile?.email || 'supplier@sellvro.com'}</span>
                <span>•</span>
                <span>{storeProfile?.businessCategory || 'Supplier Catalog'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Store Analytics (Isolated)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
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
              onClick={loadStoreData}
              className="bg-[#5932ea] hover:bg-[#4a26cb] text-white border-0 shadow-lg shadow-purple-900/40"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
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

      {/* ── 3. TOP SALES & FINANCIAL KPI CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Gross Sales */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-[#5932ea]">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Total Store Sales</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-[#5932ea]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(storeMetrics.grossSales, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Period Sales Value</span>
            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Active
            </span>
          </div>
        </div>

        {/* Card 2: Net Supplier Earnings (After Platform Fee) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Net Payout (Earnings)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(storeMetrics.netEarnings, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>After WMS Platform Fee</span>
            <span className="font-semibold text-slate-600">
              Fee: {formatCurrency(storeMetrics.totalCommission, currency)}
            </span>
          </div>
        </div>

        {/* Card 3: Total Units Sold */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Total Units Sold</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatInt(storeMetrics.totalUnitsSold)} <span className="text-sm font-semibold text-slate-500">Units</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>From Confirmed Orders</span>
            <span className="font-semibold text-amber-600">
              {formatInt(storeMetrics.totalOrdersCount)} Orders
            </span>
          </div>
        </div>

        {/* Card 4: Orders Breakdown & AOV */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md border-t-4 border-t-sky-500">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Avg Order Value (AOV)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-sky-700 tracking-tight">
            {formatCurrency(storeMetrics.avgOrderValue, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Delivered: {storeMetrics.completedCount}</span>
            <span className="text-purple-600 font-semibold">In Process: {storeMetrics.inProcessCount}</span>
          </div>
        </div>
      </div>

      {/* ── 4. PRODUCT LISTING & WAREHOUSE INVENTORY BREAKDOWN (WMS vs SELF) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#5932ea]" />
              Product Catalog & Fulfillment Distribution
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Overview of how many total products you have listed and where your stock is stored (Sellvro Warehouse vs Self-Fulfilled).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/supplier/product/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5932ea] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#4a26cb]"
            >
              <Package className="h-3.5 w-3.5" />
              + Add New Product
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tile 1: Total Products Listed Overall */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Total Products Listed</span>
              <Box className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{productInventoryBreakdown.totalListed}</span>
              <span className="text-xs text-slate-500">Total SKUs</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                {productInventoryBreakdown.activeCount} Active
              </span>
              {productInventoryBreakdown.pendingCount > 0 && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                  {productInventoryBreakdown.pendingCount} Pending
                </span>
              )}
              {productInventoryBreakdown.draftCount > 0 && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-bold text-slate-700">
                  {productInventoryBreakdown.draftCount} Draft
                </span>
              )}
            </div>
          </div>

          {/* Tile 2: Sellvro Warehouse (WMS) Breakdown */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 transition-all hover:bg-indigo-50/70">
            <div className="flex items-center justify-between text-xs text-indigo-900">
              <span className="font-bold flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Sellvro Warehouse (WMS)
              </span>
              <span className="rounded-full bg-indigo-200/70 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                {productInventoryBreakdown.wmsPercentage}% of Catalog
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-900">{productInventoryBreakdown.inWmsCount}</span>
              <span className="text-xs font-semibold text-indigo-700">Products in WMS</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-indigo-900 font-semibold border-t border-indigo-100 pt-2">
              <span>WMS Warehouse Stock:</span>
              <span className="font-black text-indigo-700">{formatInt(productInventoryBreakdown.inWmsStock)} Units</span>
            </div>
          </div>

          {/* Tile 3: With Supplier (Self) Breakdown */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 transition-all hover:bg-emerald-50/70">
            <div className="flex items-center justify-between text-xs text-emerald-900">
              <span className="font-bold flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-600" />
                With Supplier (Self-Fulfilled)
              </span>
              <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {productInventoryBreakdown.selfPercentage}% of Catalog
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-900">{productInventoryBreakdown.selfCount}</span>
              <span className="text-xs font-semibold text-emerald-700">Products In-House</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-emerald-900 font-semibold border-t border-emerald-100 pt-2">
              <span>Supplier Location Stock:</span>
              <span className="font-black text-emerald-700">{formatInt(productInventoryBreakdown.selfStock)} Units</span>
            </div>
          </div>

          {/* Tile 4: Stock Health & Low-Stock Alerts */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Total Available Stock</span>
              <PackageCheck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {formatInt(productInventoryBreakdown.totalStockUnits)}
              </span>
              <span className="text-xs text-slate-500">Total Units</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-200 pt-2">
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Low Stock (≤5): <b>{productInventoryBreakdown.lowStockCount}</b>
              </span>
              <span className="text-rose-700 font-semibold">
                Out of Stock: <b>{productInventoryBreakdown.outOfStockCount}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. TOP SELLING PRODUCTS SPOTLIGHT (LEADERBOARD) ── */}
      {topSellers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Top Selling Products in Your Store</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Ranked by revenue</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {topSellers.map((item, idx) => (
              <div
                key={item.id}
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
                      {formatCurrency(item.grossSales, currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                  <span>Sold: <b>{item.unitsSold} units</b></span>
                  <span className="text-[#5932ea] font-semibold group-hover:underline flex items-center gap-0.5">
                    View Buyers →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. INTERACTIVE PRODUCT-BY-PRODUCT SALES TABLE (CORE REQUIREMENT) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Title & Summary */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#5932ea]" />
              Product-Wise Sales & Buyer Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any product to see which buyers purchased it, quantity purchased, order dates, and shipping destinations.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Showing: <b>{displayProductRows.length}</b> of {products.length} Products</span>
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

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Fulfillment Location Dropdown */}
          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="all">All Inventory Locations</option>
            <option value="warehouse">Sellvro Warehouse (WMS) Only</option>
            <option value="self">With Supplier (Self) Only</option>
          </select>

          {/* Stock Filter Dropdown */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="all">All Stock Statuses</option>
            <option value="low">Low Stock (≤ 5 Units)</option>
            <option value="out">Out of Stock (0 Units)</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-[#5932ea] focus:outline-none"
          >
            <option value="sales_desc">Highest Sales First</option>
            <option value="units_desc">Most Units Sold</option>
            <option value="stock_desc">Highest Stock First</option>
            <option value="stock_asc">Lowest Stock First</option>
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
                <th className="px-4 py-3">Fulfillment Location</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3 text-center">Units Sold</th>
                <th className="px-4 py-3">Total Sales</th>
                <th className="px-4 py-3">Net Payout</th>
                <th className="px-4 py-3 text-center">Unique Buyers</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayProductRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <PackageOpen className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No products match your filter.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or filters.</p>
                  </td>
                </tr>
              ) : (
                displayProductRows.map((row) => (
                  <tr
                    key={row.id}
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

                    {/* 3. Fulfillment Location (WMS vs Self) */}
                    <td className="px-4 py-3.5">
                      {row.isWms ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                          <Building2 className="h-3 w-3" />
                          Sellvro WMS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <Truck className="h-3 w-3" />
                          Self-Fulfilled
                        </span>
                      )}
                    </td>

                    {/* 4. Stock */}
                    <td className="px-4 py-3.5 text-center">
                      {row.stock === 0 ? (
                        <span className="inline-block rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-800 text-[11px]">
                          0 (Out)
                        </span>
                      ) : row.stock <= 5 ? (
                        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800 text-[11px]">
                          {row.stock} (Low)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800">{row.stock}</span>
                      )}
                    </td>

                    {/* 5. Unit Price */}
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {formatCurrency(row.price, currency)}
                    </td>

                    {/* 6. Units Sold */}
                    <td className="px-4 py-3.5 text-center">
                      {row.unitsSold > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-50 px-2.5 py-0.5 font-extrabold text-amber-700 border border-amber-200">
                          {row.unitsSold}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* 7. Total Sales */}
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {formatCurrency(row.grossSales, currency)}
                    </td>

                    {/* 8. Net Payout */}
                    <td className="px-4 py-3.5 font-bold text-emerald-600">
                      {formatCurrency(row.netEarnings, currency)}
                    </td>

                    {/* 9. Unique Buyers */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 font-bold text-purple-700">
                        <Users className="h-3 w-3" />
                        {row.uniqueBuyersCount}
                      </span>
                    </td>

                    {/* 10. Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          row.status === 'active' || row.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : row.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* 11. Actions */}
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
                        Buyers ({row.ordersCount})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. SLIDE-OVER DRAWER: BUYER & PURCHASE HISTORY DRILL-DOWN ── */}
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
                      {selectedProduct.fulfillmentLabel}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{selectedProduct.name}</h3>
                  <p className="text-xs text-slate-500">
                    Stock Available: <b>{selectedProduct.stock} units</b> • Price: <b>{formatCurrency(selectedProduct.price, currency)}</b>
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sold</span>
                <span className="text-base font-black text-amber-600 block mt-0.5">
                  {selectedProduct.unitsSold} Units
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Sales</span>
                <span className="text-base font-black text-slate-900 block mt-0.5">
                  {formatCurrency(selectedProduct.grossSales, currency)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Earnings</span>
                <span className="text-base font-black text-emerald-600 block mt-0.5">
                  {formatCurrency(selectedProduct.netEarnings, currency)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Buyers</span>
                <span className="text-base font-black text-purple-600 block mt-0.5">
                  {selectedProduct.uniqueBuyersCount} Users
                </span>
              </div>
            </div>

            {/* Orders & Buyer List Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#5932ea]" />
                  Buyer Purchase History ({selectedProduct.ordersList.length} Orders)
                </h4>
                <span className="text-xs text-slate-400">Chronological history</span>
              </div>

              {selectedProduct.ordersList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <ShoppingBag className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No buyers for this product yet.</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    This product is active in your catalog. When buyers purchase it, order references and quantities will appear right here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedProduct.ordersList.map((order, oIdx) => {
                    const buyerId = order.userId
                      ? `BYR-${String(order.userId).slice(-6).toUpperCase()}`
                      : `BYR-${oIdx + 101}`
                    const qty = Number(order.quantity || 1)
                    const totalAmt = Number(order.total) || qty * Number(order.unitPrice || selectedProduct.price)
                    const shipping = order.shippingAddress || {}
                    const destination = [shipping.city, shipping.country].filter(Boolean).join(', ') || '—'
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

                        {/* Buyer Info & Quantity Purchased */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* Buyer Column: Privacy Protected (Buyer ID only) */}
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Buyer Reference</span>
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 rounded px-2 py-0.5 inline-block mt-1">
                              {buyerId}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Verified Dropshipper
                            </span>
                          </div>

                          {/* Quantity & Amount */}
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Quantity & Total</span>
                            <span className="font-extrabold text-[#5932ea] block mt-0.5">
                              {qty} {qty === 1 ? 'Unit' : 'Units'} Purchased
                            </span>
                            <span className="font-semibold text-slate-700 block">
                              Total: {formatCurrency(totalAmt, currency)}
                            </span>
                          </div>

                          {/* Shipping Destination */}
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Shipping To</span>
                            <span className="font-medium text-slate-800 block mt-0.5 flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              {destination}
                            </span>
                            {order.brandLabel && (
                              <span className="text-[10px] text-indigo-600 block truncate font-medium">
                                Label: {order.brandLabel}
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
