import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  Filter,
  Image as ImageIcon,
  Layers,
  Package,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Undo2,
  User,
  Wallet,
  Zap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import { adminApi, disputeApi, getErrorMessage, mediaUrl, orderApi, productApi } from '../../lib/api.js'
import { PRODUCT_STATUS_LABEL } from '../../lib/productStatus.js'
import {
  badgeToneForStatus,
  formatMoney,
  formatReportDate,
  formatReportDateTime,
  inDateRange,
  statusLabel,
} from '../../lib/reportUtils.js'

const FILTER_INPUT =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all'

const PANEL_CONFIG = {
  admin: {
    eyebrow: 'Admin Marketplace',
    title: 'Marketplace SKU Performance & Financials',
    subtitle: 'Comprehensive SKU analytics, sales velocity, WMS platform fees, returns, and profit margins across all marketplace products.',
    primaryEntity: 'Supplier',
  },
  supplier: {
    eyebrow: 'Supplier Portal',
    title: 'My SKU Inventory & Payout Reporting',
    subtitle: 'Track your product sales performance, WMS commission deductions, stock depletion runway, and net payouts.',
    primaryEntity: 'Store',
  },
  user: {
    eyebrow: 'Buyer Sourcing Portal',
    title: 'My Purchased SKUs & Sourcing Intelligence',
    subtitle: 'Track your purchase history, unit sourcing costs, fulfillment tracking, refund claims, and quick re-ordering.',
    primaryEntity: 'Sourcing',
  },
}

function extractArray(res, key = 'data') {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res[key])) return res[key]
  if (Array.isArray(res.products)) return res.products
  if (Array.isArray(res.orders)) return res.orders
  if (Array.isArray(res.suppliers)) return res.suppliers
  if (Array.isArray(res.disputes)) return res.disputes
  return []
}

async function fetchPanelData(panel) {
  if (panel === 'admin') {
    const [productsRes, ordersRes, supplierDisputesRes, userDisputesRes] = await Promise.all([
      adminApi.products().catch(() => ({ data: [] })),
      adminApi.orders().catch(() => ({ data: [] })),
      adminApi.supplierDisputes().catch(() => ({ data: [] })),
      adminApi.userComplaints().catch(() => ({ data: [] })),
    ])
    return {
      products: extractArray(productsRes, 'products'),
      orders: extractArray(ordersRes, 'orders'),
      disputes: [...extractArray(supplierDisputesRes), ...extractArray(userDisputesRes)],
    }
  }

  if (panel === 'supplier') {
    const [productsRes, ordersRes, disputesRes] = await Promise.all([
      productApi.mine().catch(() => ({ data: [] })),
      orderApi.supplier().catch(() => ({ data: [] })),
      disputeApi.mine().catch(() => ({ data: [] })),
    ])
    return {
      products: extractArray(productsRes, 'products'),
      orders: extractArray(ordersRes, 'orders'),
      disputes: extractArray(disputesRes, 'disputes'),
    }
  }

  // User / Buyer panel
  const [productsRes, ordersRes, disputesRes] = await Promise.all([
    productApi.marketplace().catch(() => ({ data: [] })),
    orderApi.mine().catch(() => ({ data: [] })),
    disputeApi.mine().catch(() => ({ data: [] })),
  ])
  return {
    products: extractArray(productsRes, 'products'),
    orders: extractArray(ordersRes, 'orders'),
    disputes: extractArray(disputesRes, 'disputes'),
  }
}

/**
 * Match order to product
 */
function isOrderForProduct(order, product) {
  if (!order || !product) return false
  const prodId = String(product.id || product._id || '').trim()
  const prodSku = String(product.sku || '').trim().toUpperCase()
  const prodName = String(product.name || '').trim().toLowerCase()

  const orderProdId = String(
    order.productId || (typeof order.product === 'object' ? (order.product?.id || order.product?._id) : order.product) || '',
  ).trim()
  const orderProdSku = String(order.productSku || order.sku || (typeof order.product === 'object' ? order.product?.sku : '') || '').trim().toUpperCase()
  const orderProdName = String(order.product || order.productName || (typeof order.product === 'object' ? order.product?.name : '') || '').trim().toLowerCase()

  return (
    (prodId && orderProdId && prodId === orderProdId) ||
    (prodSku && orderProdSku && prodSku === orderProdSku) ||
    (prodName && orderProdName && prodName === orderProdName) ||
    (prodSku && orderProdName && orderProdName.toUpperCase().includes(prodSku))
  )
}

/**
 * Match dispute to product
 */
function isDisputeForProduct(dispute, product) {
  if (!dispute || !product) return false
  const prodId = String(product.id || product._id || '').trim()
  const prodSku = String(product.sku || '').trim().toUpperCase()
  const prodName = String(product.name || '').trim().toLowerCase()

  const dispProdId = String(
    dispute.productId || dispute.product?.id || dispute.product?._id || dispute.product || '',
  ).trim()
  const dispProdSku = String(dispute.productSku || '').trim().toUpperCase()
  const dispProdName = String(dispute.productName || dispute.product || '').trim().toLowerCase()
  const dispMessage = String(dispute.message || dispute.requests || '').toUpperCase()

  return (
    (prodId && dispProdId && prodId === dispProdId) ||
    (prodSku && dispProdSku && prodSku === dispProdSku) ||
    (prodName && dispProdName && prodName === dispProdName) ||
    (prodSku && dispMessage.includes(prodSku))
  )
}

/**
 * Calculate Sales Velocity & Inventory Runway
 */
function calculateVelocityAndRunway(orders, currentStock) {
  const validOrders = orders
    .filter((o) => o.status !== 'cancelled' && o.createdAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const totalOrders = validOrders.length
  if (totalOrders === 0) {
    return {
      gapLabel: 'No orders yet',
      subtext: '0 sales recorded',
      unitsPerDay: 0,
      daysOfStockLeft: currentStock > 0 ? 999 : 0,
      runwayText: currentStock > 0 ? 'Stock Available' : 'Out of Stock',
      runwayStatus: currentStock > 0 ? 'safe' : 'danger',
    }
  }

  if (totalOrders === 1) {
    const orderDate = new Date(validOrders[0].createdAt)
    const daysAgo = Math.max(0, Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)))
    const unitsPerDay = 1 / Math.max(1, daysAgo || 1)
    const daysLeft = unitsPerDay > 0 ? Math.round(currentStock / unitsPerDay) : 999

    return {
      gapLabel: daysAgo === 0 ? 'Sold today' : `${daysAgo}d ago`,
      subtext: '1 single order',
      unitsPerDay: unitsPerDay.toFixed(1),
      daysOfStockLeft: daysLeft,
      runwayText: currentStock <= 10 ? 'Low Stock Warning' : `~${daysLeft} days left`,
      runwayStatus: currentStock <= 10 ? 'warning' : 'safe',
    }
  }

  const firstDate = new Date(validOrders[0].createdAt).getTime()
  const lastDate = new Date(validOrders[totalOrders - 1].createdAt).getTime()
  const totalDurationMs = Math.max(1000 * 60 * 60 * 24, lastDate - firstDate)
  const totalDurationDays = totalDurationMs / (1000 * 60 * 60 * 24)

  const avgGapHours = (totalDurationDays * 24) / (totalOrders - 1)
  const avgGapDays = avgGapHours / 24

  let gapLabel = ''
  if (avgGapHours < 24) {
    gapLabel = `Every ${avgGapHours.toFixed(1)} hrs`
  } else {
    gapLabel = `Every ${avgGapDays.toFixed(1)} days`
  }

  const totalUnits = validOrders.reduce((acc, o) => acc + (Number(o.quantity) || 1), 0)
  const unitsPerDay = totalDurationDays > 0 ? totalUnits / totalDurationDays : totalUnits
  const daysOfStockLeft = unitsPerDay > 0 ? Math.round(currentStock / unitsPerDay) : 999

  let runwayStatus = 'safe'
  let runwayText = `~${daysOfStockLeft} days of stock`

  if (currentStock === 0) {
    runwayStatus = 'danger'
    runwayText = 'Out of Stock'
  } else if (daysOfStockLeft <= 7 || currentStock <= 10) {
    runwayStatus = 'warning'
    runwayText = `⚠️ Restock Soon (~${daysOfStockLeft}d)`
  }

  return {
    gapLabel,
    subtext: `${totalOrders} orders (${unitsPerDay.toFixed(1)}/day)`,
    unitsPerDay: unitsPerDay.toFixed(1),
    daysOfStockLeft,
    runwayText,
    runwayStatus,
  }
}

/**
 * Filter orders & disputes by timeframe
 */
function filterByTimeframe(items, timeframe, selectedMonth, selectedYear, fromDate, toDate) {
  if (!Array.isArray(items)) return []

  return items.filter((item) => {
    const rawDate = item.createdAt || item.date
    if (!rawDate) return timeframe === 'overall'

    const d = new Date(rawDate)
    if (Number.isNaN(d.getTime())) return false

    if (timeframe === 'overall') return true

    if (timeframe === 'monthly') {
      if (!selectedMonth) return true
      const [yearStr, monthStr] = selectedMonth.split('-')
      return d.getFullYear() === parseInt(yearStr, 10) && d.getMonth() === parseInt(monthStr, 10) - 1
    }

    if (timeframe === 'annually') {
      if (!selectedYear) return true
      return d.getFullYear() === parseInt(selectedYear, 10)
    }

    if (timeframe === 'custom') {
      return inDateRange(rawDate, fromDate, toDate)
    }

    return true
  })
}

/**
 * Generate chart breakdown
 */
function buildChartData(orders, product, timeframe, selectedYear, panel) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  const activeYear = timeframe === 'annually' && selectedYear ? parseInt(selectedYear, 10) : now.getFullYear()
  const commissionRate = Number(product?.commission || 10)
  const baseCost = Number(product?.price || 0)

  if (timeframe === 'monthly') {
    const weeks = [
      { name: 'Week 1', sales: 0, wmsFee: 0, payout: 0, units: 0, delivered: 0 },
      { name: 'Week 2', sales: 0, wmsFee: 0, payout: 0, units: 0, delivered: 0 },
      { name: 'Week 3', sales: 0, wmsFee: 0, payout: 0, units: 0, delivered: 0 },
      { name: 'Week 4', sales: 0, wmsFee: 0, payout: 0, units: 0, delivered: 0 },
    ]

    orders.forEach((o) => {
      if (o.status === 'cancelled') return
      const d = new Date(o.createdAt)
      const weekIndex = Math.min(3, Math.floor((d.getDate() - 1) / 7))
      const qty = Number(o.quantity) || 1
      const total = Number(o.total) || qty * Number(o.unitPrice || baseCost)
      const fee = Number(o.commission) || (commissionRate / 100) * total
      const payout = Math.max(0, total - fee)

      weeks[weekIndex].sales += total
      weeks[weekIndex].wmsFee += fee
      weeks[weekIndex].payout += payout
      weeks[weekIndex].units += qty
      if (o.status === 'placed' || o.status === 'delivered') weeks[weekIndex].delivered += qty
    })

    return weeks
  }

  const monthlyBuckets = months.map((m, idx) => ({
    name: m,
    monthIdx: idx,
    sales: 0,
    wmsFee: 0,
    payout: 0,
    units: 0,
    delivered: 0,
  }))

  orders.forEach((o) => {
    if (o.status === 'cancelled') return
    const d = new Date(o.createdAt)
    if (timeframe === 'annually' && d.getFullYear() !== activeYear) return

    const mIdx = d.getMonth()
    if (mIdx >= 0 && mIdx < 12) {
      const qty = Number(o.quantity) || 1
      const total = Number(o.total) || qty * Number(o.unitPrice || baseCost)
      const fee = Number(o.commission) || (commissionRate / 100) * total
      const payout = Math.max(0, total - fee)

      monthlyBuckets[mIdx].sales += total
      monthlyBuckets[mIdx].wmsFee += fee
      monthlyBuckets[mIdx].payout += payout
      monthlyBuckets[mIdx].units += qty
      if (o.status === 'placed' || o.status === 'delivered') monthlyBuckets[mIdx].delivered += qty
    }
  })

  return monthlyBuckets
}

function SkuReportingContent({ panel = 'admin' }) {
  const navigate = useNavigate()
  const [skuQuery, setSkuQuery] = useState('')
  const [timeframe, setTimeframe] = useState('overall')

  const currentMonthStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const currentYearStr = useMemo(() => String(new Date().getFullYear()), [])

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr)
  const [selectedYear, setSelectedYear] = useState(currentYearStr)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [products, setProducts] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [allDisputes, setAllDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)

  const config = PANEL_CONFIG[panel] || PANEL_CONFIG.admin

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPanelData(panel)
      setProducts(data.products)
      setAllOrders(data.orders)
      setAllDisputes(data.disputes)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load SKU reporting data.'))
    } finally {
      setLoading(false)
    }
  }, [panel])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredOrders = useMemo(() => {
    return filterByTimeframe(allOrders, timeframe, selectedMonth, selectedYear, fromDate, toDate)
  }, [allOrders, timeframe, selectedMonth, selectedYear, fromDate, toDate])

  const filteredDisputes = useMemo(() => {
    return filterByTimeframe(allDisputes, timeframe, selectedMonth, selectedYear, fromDate, toDate)
  }, [allDisputes, timeframe, selectedMonth, selectedYear, fromDate, toDate])

  // Calculated Product Summary List
  const productsSummary = useMemo(() => {
    // If User panel, filter products to those they have purchased (or all available)
    let baseList = products

    return baseList.map((prod) => {
      const prodOrders = filteredOrders.filter((o) => isOrderForProduct(o, prod) && o.status !== 'cancelled')
      const prodDisputes = filteredDisputes.filter((d) => isDisputeForProduct(d, prod))

      const baseCost = Number(prod.price || 0)
      const commissionPercent = Number(prod.commission || 10)

      const unitsSold = prodOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)
      const totalSales = prodOrders.reduce(
        (sum, o) => sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || baseCost)),
        0,
      )
      const totalCost = unitsSold * baseCost

      // Platform WMS Fee
      const wmsFee = prodOrders.reduce((sum, o) => {
        if (o.commission && Number(o.commission) > 0) return sum + Number(o.commission)
        const orderTotal = Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || baseCost)
        return sum + (commissionPercent / 100) * orderTotal
      }, 0)

      // Net Payout (Supplier) / Net Margin
      const netPayout = Math.max(0, totalSales - wmsFee)
      const returnsCount = prodDisputes.length
      const returnRate = unitsSold > 0 ? ((returnsCount / unitsSold) * 100).toFixed(1) : '0'

      // Delivered / In-transit counts for buyer
      const deliveredUnits = prodOrders
        .filter((o) => o.status === 'placed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)
      const inTransitUnits = prodOrders
        .filter((o) => o.status === 'in_process' || o.status === 'pending')
        .reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)

      const currentStock = prod.quantity ?? 0
      const velocity = calculateVelocityAndRunway(prodOrders, currentStock)

      return {
        product: prod,
        id: prod.id || prod._id,
        name: prod.name,
        sku: prod.sku,
        image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : ''),
        category: prod.category || 'General',
        supplierName: prod.supplier?.fullName || prod.supplier || prod.supplierBusinessName || 'Supplier',
        baseCost,
        commissionPercent,
        unitsSold,
        totalSales,
        totalCost,
        wmsFee,
        netPayout,
        returnsCount,
        returnRate,
        deliveredUnits,
        inTransitUnits,
        velocity,
        stock: currentStock,
        status: prod.status || 'active',
      }
    })
  }, [products, filteredOrders, filteredDisputes])

  // Filtered Products for Display
  const displayedProducts = useMemo(() => {
    if (!skuQuery.trim()) return productsSummary
    const q = skuQuery.trim().toLowerCase()
    return productsSummary.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [productsSummary, skuQuery])

  // Selected Product Statistics
  const selectedProductStats = useMemo(() => {
    if (!selectedProduct) return null
    return (
      productsSummary.find(
        (p) =>
          String(p.id) === String(selectedProduct.id || selectedProduct._id) ||
          String(p.sku).toUpperCase() === String(selectedProduct.sku).toUpperCase(),
      ) || null
    )
  }, [selectedProduct, productsSummary])

  const [showMasterChart, setShowMasterChart] = useState(true)

  // Category vs Total Sales / Spend Chart Data (Category on X-axis, Total Sales/Spend on Y-axis) across Admin, Supplier, and User
  const categoryChartData = useMemo(() => {
    const catMap = new Map()

    displayedProducts.forEach((p) => {
      const cat = p.category || 'General'
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          name: cat,
          category: cat,
          sales: 0,
          wmsFee: 0,
          payout: 0,
          units: 0,
        })
      }
      const entry = catMap.get(cat)
      entry.sales += p.totalSales || 0
      entry.wmsFee += p.wmsFee || 0
      entry.payout += p.netPayout || 0
      entry.units += p.unitsSold || 0
    })

    return Array.from(catMap.values())
  }, [displayedProducts])

  // Top SKUs comparison chart data for deep fallback
  const topSkusChartData = useMemo(() => {
    return displayedProducts
      .slice(0, 8)
      .map((p) => ({
        name: p.sku || p.name.substring(0, 10),
        fullName: p.name,
        category: p.category || 'General',
        sales: p.totalSales,
        wmsFee: p.wmsFee,
        units: p.unitsSold,
        payout: p.netPayout,
      }))
  }, [displayedProducts])

  // CSV Export utility for SKU report
  const exportSkuReport = () => {
    let csv = 'data:text/csv;charset=utf-8,Product Name,SKU,Category,Base Cost,Units,Total Amount,WMS Fee,Net Payout,Stock,Status\n'
    displayedProducts.forEach((p) => {
      csv += `"${p.name.replace(/"/g, '""')}","${p.sku}","${p.category}",${p.baseCost},${p.unitsSold},${p.totalSales},${p.wmsFee},${p.netPayout},${p.stock},"${p.status}"\n`
    })
    const encoded = encodeURI(csv)
    const link = document.createElement('a')
    link.setAttribute('href', encoded)
    link.setAttribute('download', `sku_reporting_${panel}_${timeframe}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const selectedProductOrders = useMemo(() => {
    if (!selectedProduct) return []
    return filteredOrders.filter((o) => isOrderForProduct(o, selectedProduct))
  }, [filteredOrders, selectedProduct])

  const selectedProductDisputes = useMemo(() => {
    if (!selectedProduct) return []
    return filteredDisputes.filter((d) => isDisputeForProduct(d, selectedProduct))
  }, [filteredDisputes, selectedProduct])

  const chartData = useMemo(() => {
    if (!selectedProduct) return []
    return buildChartData(selectedProductOrders, selectedProduct, timeframe, selectedYear, panel)
  }, [selectedProductOrders, selectedProduct, timeframe, selectedYear, panel])

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary">
              {config.eyebrow}
            </span>
            <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">{config.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-slate-200 bg-white text-xs font-semibold"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {panel === 'supplier' && (
            <Link to="/supplier/product/create">
              <Button size="sm" className="h-9 text-xs font-semibold shadow-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add New SKU
              </Button>
            </Link>
          )}
          {panel === 'user' && (
            <Link to="/user/products">
              <Button size="sm" className="h-9 text-xs font-semibold shadow-xs">
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                Browse Catalog
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Top Filter Bar: Timeframe Selection & SKU Search */}
      <Card className="border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Reporting Period
              </span>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {['overall', 'monthly', 'annually', 'custom'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimeframe(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    timeframe === mode
                      ? 'bg-white text-primary shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'overall' ? 'Overall (Lifetime)' : mode}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5">
              <label htmlFor="sku-search" className="mb-1.5 block text-xs font-medium text-slate-500">
                Search SKU or Product
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="sku-search"
                  type="search"
                  placeholder="Enter SKU, Product name, or Category…"
                  value={skuQuery}
                  onChange={(e) => setSkuQuery(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>

            {timeframe === 'monthly' && (
              <div className="md:col-span-4">
                <label htmlFor="month-picker" className="mb-1.5 block text-xs font-medium text-slate-500">
                  Select Month
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="month-picker"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className={`${FILTER_INPUT} pl-10`}
                  />
                </div>
              </div>
            )}

            {timeframe === 'annually' && (
              <div className="md:col-span-4">
                <label htmlFor="year-picker" className="mb-1.5 block text-xs font-medium text-slate-500">
                  Select Year
                </label>
                <select
                  id="year-picker"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={FILTER_INPUT}
                >
                  {[2026, 2025, 2024].map((y) => (
                    <option key={y} value={String(y)}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {timeframe === 'custom' && (
              <div className="grid grid-cols-2 gap-2 md:col-span-4">
                <div>
                  <label htmlFor="from-date" className="mb-1.5 block text-xs font-medium text-slate-500">
                    From
                  </label>
                  <input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={FILTER_INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="to-date" className="mb-1.5 block text-xs font-medium text-slate-500">
                    To
                  </label>
                  <input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={FILTER_INPUT}
                  />
                </div>
              </div>
            )}

            {timeframe === 'overall' && (
              <div className="hidden md:block md:col-span-4">
                <div className="flex h-10 items-center rounded-lg bg-slate-50 px-3 text-xs text-slate-500 border border-slate-100">
                  <Clock className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                  Showing lifetime all-time SKU intelligence
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 md:col-span-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-full border-slate-200 bg-white font-semibold"
                onClick={() => {
                  setSkuQuery('')
                  setSelectedProduct(null)
                  setTimeframe('overall')
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Reset Filter
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* MAIN VIEW: 1) Master Overview Table OR 2) Single SKU Deep Dive */}
      {!selectedProduct ? (
        <Card className="overflow-hidden border border-slate-200 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {panel === 'supplier'
                  ? 'My Products SKU Performance'
                  : panel === 'user'
                  ? 'My Purchased SKUs & Sourcing History'
                  : 'Marketplace All SKUs Overview'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {panel === 'supplier'
                  ? 'Review product sales, WMS commission, stock runway, and net earnings.'
                  : panel === 'user'
                  ? 'Review items sourced, total spend, fulfillment progress, and re-order frequency.'
                  : 'Platform-wide SKU sales, velocity, commission, and profit metrics.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold bg-white border-slate-200"
                onClick={() => setShowMasterChart(!showMasterChart)}
              >
                <BarChart3 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                {showMasterChart ? 'Hide Visual Chart' : 'Show Visual Chart'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold bg-white border-slate-200"
                onClick={exportSkuReport}
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Export CSV
              </Button>

              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">
                {displayedProducts.length} SKUs
              </span>
            </div>
          </div>

          {/* Visual Category vs Total Sales / Spend Chart (Category on X-axis, Total Sales on Y-axis) */}
          {showMasterChart && categoryChartData.length > 0 && (
            <div className="border-b border-slate-100 bg-slate-50/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold text-slate-800">
                  {panel === 'user'
                    ? `Category Performance: Category (X) vs Total Spend / Sourced ($) (Y) (${timeframe.toUpperCase()})`
                    : panel === 'supplier'
                    ? `Category Sales Breakdown: Category (X) vs Total Sales ($) (Y) (${timeframe.toUpperCase()})`
                    : `Marketplace Category Analytics: Category (X) vs Gross Sales ($) (Y) (${timeframe.toUpperCase()})`}
                </span>
                <div className="flex items-center gap-4 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {panel === 'user' ? 'Total Spend ($)' : 'Gross Sales ($)'}
                  </span>
                  {panel !== 'user' && (
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      WMS Fee ($)
                    </span>
                  )}
                  {panel === 'supplier' && (
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                      Net Payout ($)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Units {panel === 'user' ? 'Sourced' : 'Sold'}
                  </span>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                    <Tooltip
                      formatter={(val, name) => [name.includes('Units') ? val : formatMoney(val), name]}
                      contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 11 }}
                    />
                    <Bar dataKey="sales" name={panel === 'user' ? 'Total Spend ($)' : 'Gross Sales ($)'} fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={26} />
                    {panel !== 'user' && (
                      <Bar dataKey="wmsFee" name="WMS Fee ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={26} />
                    )}
                    {panel === 'supplier' && (
                      <Bar dataKey="payout" name="Net Payout ($)" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={26} />
                    )}
                    <Bar dataKey="units" name={panel === 'user' ? 'Units Sourced' : 'Units Sold'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Product & SKU</th>
                  <th className="px-4 py-3.5">
                    {panel === 'user' ? 'Unit Price Paid' : 'Product Cost'}
                  </th>
                  <th className="px-4 py-3.5 text-center">
                    {panel === 'user' ? 'Units Bought' : 'Units Sold'}
                  </th>
                  <th className="px-4 py-3.5">
                    {panel === 'user' ? 'Total Spent' : 'Gross Sales'}
                  </th>
                  {panel !== 'user' && <th className="px-4 py-3.5">WMS Fee</th>}
                  <th className="px-4 py-3.5">
                    {panel === 'supplier'
                      ? 'Stock Runway / Alert'
                      : panel === 'user'
                      ? 'Delivery Progress'
                      : 'Sales Velocity'}
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    {panel === 'supplier' ? 'Net Payout' : panel === 'user' ? 'Disputes / Claims' : 'Net Profit'}
                  </th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No products found for this criteria.
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Product Thumbnail & SKU */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {item.image ? (
                              <img
                                src={mediaUrl(item.image)}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors text-sm">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs mt-0.5">
                              <span className="font-mono font-semibold text-primary">{item.sku}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{item.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Base Cost / Price */}
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{formatMoney(item.baseCost)}</p>
                        <p className="text-[10px] text-slate-400">
                          {panel === 'user' ? 'Per unit' : 'Supplier cost'}
                        </p>
                      </td>

                      {/* Units Sold / Bought */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-800">
                          {item.unitsSold}
                        </span>
                      </td>

                      {/* Total Sales / Spend */}
                      <td className="px-4 py-4">
                        <p className="font-bold text-emerald-600 text-sm">
                          {formatMoney(item.totalSales)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {panel === 'user' ? 'Wallet deduction' : `${item.unitsSold} orders`}
                        </p>
                      </td>

                      {/* WMS Fee (Commission) for Admin/Supplier */}
                      {panel !== 'user' && (
                        <td className="px-4 py-4">
                          <p className="font-semibold text-amber-600">{formatMoney(item.wmsFee)}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.commissionPercent}% platform cut
                          </p>
                        </td>
                      )}

                      {/* Runway / Velocity / Delivery Status */}
                      <td className="px-4 py-4">
                        {panel === 'supplier' ? (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                item.velocity.runwayStatus === 'danger'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : item.velocity.runwayStatus === 'warning'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {item.velocity.runwayText}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Stock: {item.stock} in warehouse
                            </p>
                          </div>
                        ) : panel === 'user' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-[11px] font-bold">
                              <Truck className="h-3 w-3" />
                              {item.deliveredUnits} Delivered / {item.inTransitUnits} In-Transit
                            </span>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-800">{item.velocity.gapLabel}</p>
                            <p className="text-[10px] text-slate-400">{item.velocity.subtext}</p>
                          </div>
                        )}
                      </td>

                      {/* Net Payout / Disputes */}
                      <td className="px-4 py-4 text-right">
                        {panel === 'supplier' ? (
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">
                              {formatMoney(item.netPayout)}
                            </p>
                            <p className="text-[10px] text-emerald-600 font-semibold">Net Earnings</p>
                          </div>
                        ) : panel === 'user' ? (
                          <div>
                            {item.returnsCount > 0 ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                                {item.returnsCount} Claims
                              </span>
                            ) : (
                              <span className="text-slate-400">0 Claims</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-900">{formatMoney(item.netPayout)}</p>
                            <p className="text-[10px] text-emerald-600">After WMS cut</p>
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold hover:border-primary hover:bg-primary-50 hover:text-primary transition-all"
                            onClick={() => setSelectedProduct(item.product)}
                          >
                            <BarChart3 className="mr-1 h-3.5 w-3.5 text-primary" />
                            Report
                          </Button>

                          {panel === 'user' && (
                            <Link to={`/user/checkout/${item.id}`}>
                              <Button
                                size="sm"
                                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              >
                                <Zap className="mr-1 h-3.5 w-3.5" />
                                Re-Order
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* SINGLE SKU DEEP DIVE ANALYTICS */
        <div className="flex flex-col gap-6">
          {/* Top Banner Card */}
          <Card className="border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                {selectedProductStats?.image ? (
                  <img
                    src={mediaUrl(selectedProductStats.image)}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">{selectedProduct.name}</h2>
                      <Badge tone={badgeToneForStatus(selectedProduct.status)}>
                        {PRODUCT_STATUS_LABEL[selectedProduct.status] || statusLabel(selectedProduct.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold text-primary tracking-wide">
                      SKU: {selectedProduct.sku}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold border-slate-200"
                      onClick={() => setSelectedProduct(null)}
                    >
                      <Layers className="mr-1.5 h-3.5 w-3.5" />
                      Back to SKU List
                    </Button>
                    {panel === 'user' && (
                      <Link to={`/user/checkout/${selectedProduct.id || selectedProduct._id}`}>
                        <Button size="sm" className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                          Buy Again
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 text-xs text-slate-600">
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Category:</span>
                    <strong className="text-slate-800">{selectedProduct.category || 'General'}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Supplier:</span>
                    <strong className="text-slate-800 truncate block">
                      {selectedProductStats?.supplierName}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Base Price:</span>
                    <strong className="text-slate-900 font-bold">{formatMoney(selectedProduct.price)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">In Warehouse:</span>
                    <strong className="text-slate-800">{selectedProduct.quantity ?? 0} units</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">WMS Commission:</span>
                    <strong className="text-primary font-bold">{selectedProduct.commission ?? 10}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 6 Tailored KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* 1. Volume */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {panel === 'user' ? 'Total Sourced' : 'Units Sold'}
              </p>
              <p className="text-xl font-extrabold text-slate-900">
                {selectedProductStats?.unitsSold || 0} Units
              </p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                {formatMoney(selectedProductStats?.totalSales || 0)}
              </p>
            </div>

            {/* 2. Sourcing / Unit Cost */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Coins className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {panel === 'user' ? 'Unit Price Paid' : 'Product Base Cost'}
              </p>
              <p className="text-xl font-extrabold text-slate-900">
                {formatMoney(selectedProductStats?.baseCost || 0)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Total COGS: {formatMoney(selectedProductStats?.totalCost || 0)}
              </p>
            </div>

            {/* 3. WMS Fee / Fulfillment */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {panel === 'user' ? 'Delivery Status' : 'WMS Fee (Admin Cut)'}
              </p>
              <p className="text-xl font-extrabold text-amber-600">
                {panel === 'user'
                  ? `${selectedProductStats?.deliveredUnits || 0} Delivered`
                  : formatMoney(selectedProductStats?.wmsFee || 0)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {panel === 'user'
                  ? `${selectedProductStats?.inTransitUnits || 0} in-transit`
                  : `@${selectedProductStats?.commissionPercent || 10}% rate`}
              </p>
            </div>

            {/* 4. Runway / Velocity */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {panel === 'supplier' ? 'Stock Depletion Runway' : 'Order Frequency'}
              </p>
              <p className="text-base font-extrabold text-slate-900 truncate">
                {selectedProductStats?.velocity?.runwayText || selectedProductStats?.velocity?.gapLabel}
              </p>
              <p className="mt-1 text-[11px] text-violet-600 truncate">
                {selectedProductStats?.velocity?.subtext}
              </p>
            </div>

            {/* 5. Return & Defect Rate */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Undo2 className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {panel === 'user' ? 'Refund Claims' : 'Defects & Returns'}
              </p>
              <p className="text-xl font-extrabold text-rose-600">
                {selectedProductStats?.returnsCount || 0}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Return rate: {selectedProductStats?.returnRate || '0'}%
              </p>
            </div>

            {/* 6. Net Payout / Total Value */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {panel === 'supplier'
                  ? 'Net Payout Balance'
                  : panel === 'user'
                  ? 'Total Spend'
                  : 'Net Margin'}
              </p>
              <p className="text-xl font-extrabold text-teal-600">
                {formatMoney(selectedProductStats?.netPayout || 0)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {panel === 'supplier' ? 'After WMS Fee' : 'Wallet Deductions'}
              </p>
            </div>
          </div>

          {/* Interactive Chart */}
          <Card className="border border-slate-200 bg-white p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {panel === 'supplier'
                    ? 'Sales, WMS Fee & Net Payout Trend'
                    : panel === 'user'
                    ? 'Purchasing & Delivery Trend'
                    : 'Performance & Revenue Trend'}
                </h3>
                <p className="text-xs text-slate-400">
                  {timeframe === 'monthly'
                    ? `Weekly performance breakdown for ${selectedMonth}`
                    : timeframe === 'annually'
                    ? `Monthly performance breakdown for ${selectedYear}`
                    : 'All-time timeline'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  {panel === 'user' ? 'Total Spend' : 'Sales GMV'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  {panel === 'user' ? 'Delivered' : 'WMS Fee'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {panel === 'supplier' ? 'Net Payout' : 'Units'}
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={50} />
                  <Tooltip formatter={(val) => formatMoney(val)} contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="sales" name={panel === 'user' ? 'Total Spend' : 'Sales GMV'} fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="wmsFee" name={panel === 'user' ? 'Delivered Qty' : 'WMS Fee'} fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="payout" name={panel === 'supplier' ? 'Net Payout' : 'Net Value'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Orders Breakdown Table */}
          <Card className="overflow-hidden border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">
                {panel === 'user' ? 'Purchase & Order History' : 'Orders & Fulfillment Logs'}
              </h3>
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary">
                {selectedProductOrders.length} Orders
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Order #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">{panel === 'user' ? 'Supplier' : 'Customer'}</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3">Unit Price</th>
                    <th className="px-4 py-3">Total Amount</th>
                    {panel !== 'user' && <th className="px-4 py-3">WMS Fee</th>}
                    {panel !== 'user' && <th className="px-4 py-3">Net Payout</th>}
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProductOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No orders recorded in this timeframe.
                      </td>
                    </tr>
                  ) : (
                    selectedProductOrders.map((order) => {
                      const qty = Number(order.quantity) || 1
                      const unitPrice = Number(order.unitPrice || selectedProduct.price || 0)
                      const total = Number(order.total) || qty * unitPrice
                      const fee = Number(order.commission) || ((selectedProduct.commission || 10) / 100) * total
                      const payout = Math.max(0, total - fee)

                      return (
                        <tr key={order.id || order._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-primary">
                            {order.orderNo || order.id}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{formatReportDateTime(order.createdAt)}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-800">
                            {panel === 'user' ? order.supplier || 'Supplier' : order.user || 'Customer'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-900">{qty}</td>
                          <td className="px-4 py-3.5 text-slate-600">{formatMoney(unitPrice)}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">{formatMoney(total)}</td>
                          {panel !== 'user' && <td className="px-4 py-3.5 font-semibold text-amber-600">{formatMoney(fee)}</td>}
                          {panel !== 'user' && <td className="px-4 py-3.5 font-bold text-emerald-600">{formatMoney(payout)}</td>}
                          <td className="px-5 py-3.5 text-right">
                            <Badge tone={badgeToneForStatus(order.status)}>
                              {order.statusLabel || statusLabel(order.status)}
                            </Badge>
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
    </div>
  )
}

export default SkuReportingContent
