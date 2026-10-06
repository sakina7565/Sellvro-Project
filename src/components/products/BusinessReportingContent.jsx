import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Grid,
  HeartPulse,
  HelpCircle,
  Lightbulb,
  Package,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Truck,
  Undo2,
  Wallet,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import { adminApi, orderApi, productApi, mediaUrl } from '../../lib/api.js'

const BS_DROPDOWN =
  'h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:border-slate-400 focus:border-[#7c3aed] focus:outline-none transition-colors'

const CURRENCY_SYMBOLS = {
  USD: '$',
  PKR: 'Rs ',
  CNY: '¥',
  EUR: '€',
}

const CURRENCY_RATES = {
  USD: 1,
  PKR: 280,
  CNY: 7.25,
  EUR: 0.92,
}

function formatWithCurrency(val, curr = 'USD') {
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

/**
 * Custom BigSeller Tooltip matching BigSeller ERP design
 */
function BigSellerTooltipContent({ active, payload, label, currency = 'USD' }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload || {}

  return (
    <div className="rounded-lg border-2 border-[#10b981] bg-white p-3.5 shadow-2xl text-[11px] min-w-[270px] font-sans leading-tight">
      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5">
        {d.dateLabel || label}
      </div>

      <div className="space-y-1.5 text-slate-700">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#818cf8]" />
            Total Orders :
          </span>
          <span className="font-bold text-slate-900">{d.orders || 0}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            Reconciliation Sales :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.reconciliationSales, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f97316]" />
            Sales :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.sales, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
            Gross Revenue :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.grossRevenue, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            Seller Subsidy Price :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.sellerSubsidy, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
            Product Sales :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.productSales, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#d946ef]" />
            Product Original Price :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.originalPrice, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ea580c]" />
            Valid Orders :
          </span>
          <span className="font-bold text-slate-900">{d.validOrders || 0}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            Valid Order Sales :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.validSales, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
            Refund Order Amount :
          </span>
          <span className="font-bold text-slate-900">{formatWithCurrency(d.refundAmount || 0, currency)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#854d0e]" />
            Customers :
          </span>
          <span className="font-bold text-slate-900">{d.customers || 0}</span>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
            Sales Per Customer :
          </span>
          <span className="font-bold text-[#2563eb]">{formatWithCurrency(d.salesPerCustomer, currency)}</span>
        </div>
      </div>
    </div>
  )
}

export default function BusinessReportingContent({ panel = 'admin' }) {
  // Navigation Accordion State
  const [salesAnalysisOpen, setSalesAnalysisOpen] = useState(true)
  const [invoicingOpen, setInvoicingOpen] = useState(false)
  const [taskAnalysisOpen, setTaskAnalysisOpen] = useState(false)
  const [financeReportOpen, setFinanceReportOpen] = useState(false)
  const [storeHealthOpen, setStoreHealthOpen] = useState(false)

  // Sub-report active tab
  const [activeTab, setActiveTab] = useState(panel === 'user' ? 'order_report' : 'store_report')

  // Top Filters (All active & workable)
  const [marketplace, setMarketplace] = useState('All Marketplaces')
  const [selectedStore, setSelectedStore] = useState('All Stores')
  const [marketingIncluded, setMarketingIncluded] = useState('Marketing Order Included')
  const [currency, setCurrency] = useState('USD')
  const [warehouse, setWarehouse] = useState('All Warehouses')
  const [category, setCategory] = useState('All Categories')
  const [skuTab, setSkuTab] = useState('store_sku')
  const [comboSkuType, setComboSkuType] = useState('independent')
  const [dateRangeFilter, setDateRangeFilter] = useState('all')
  const [displayChart, setDisplayChart] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [chartPage, setChartPage] = useState(1) // 1 or 2 for carousel paddle
  const [activeMetricCard, setActiveMetricCard] = useState('orders')

  // Chart line visibility toggles
  const [visibleLines, setVisibleLines] = useState({
    orders: true,
    reconciliationSales: true,
    sales: true,
    grossRevenue: true,
    sellerSubsidy: true,
    productSales: true,
    originalPrice: true,
  })

  // Data Loading
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const toggleLineVisibility = (lineKey) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }))
  }

  const extractArray = (res, key = 'data') => {
    if (!res) return []
    if (Array.isArray(res)) return res
    if (Array.isArray(res.data)) return res.data
    if (Array.isArray(res[key])) return res[key]
    if (Array.isArray(res.products)) return res.products
    if (Array.isArray(res.orders)) return res.orders
    if (Array.isArray(res.suppliers)) return res.suppliers
    return []
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      if (panel === 'admin') {
        const [pRes, oRes, sRes] = await Promise.all([
          adminApi.products().catch(() => ({ data: [] })),
          adminApi.orders().catch(() => ({ data: [] })),
          adminApi.suppliers().catch(() => ({ data: [] })),
        ])
        setProducts(extractArray(pRes, 'products'))
        setOrders(extractArray(oRes, 'orders'))
        setSuppliers(extractArray(sRes, 'suppliers'))
      } else if (panel === 'supplier') {
        const [pRes, oRes] = await Promise.all([
          productApi.mine().catch(() => ({ data: [] })),
          orderApi.supplier().catch(() => ({ data: [] })),
        ])
        setProducts(extractArray(pRes, 'products'))
        setOrders(extractArray(oRes, 'orders'))
      } else {
        const [pRes, oRes] = await Promise.all([
          productApi.marketplace().catch(() => ({ data: [] })),
          orderApi.mine().catch(() => ({ data: [] })),
        ])
        setProducts(extractArray(pRes, 'products'))
        setOrders(extractArray(oRes, 'orders'))
      }
    } catch (e) {
      console.error('Failed to load reporting data', e)
    } finally {
      setLoading(false)
    }
  }, [panel])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Products map
  const productMap = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      const id = String(p.id || p._id || '').trim()
      const sku = String(p.sku || '').trim().toUpperCase()
      const name = String(p.name || '').trim().toLowerCase()
      if (id) map.set(id, p)
      if (sku) map.set(sku, p)
      if (name) map.set(name, p)
    })
    return map
  }, [products])

  // Filtered Orders based on active Date Filter, Store, Marketplace, Warehouse, Marketing
  const filteredOrders = useMemo(() => {
    const now = new Date()

    return orders.filter((order) => {
      const rawDate = order.createdAt || order.date
      const orderDate = new Date(rawDate)
      const hasDate = !Number.isNaN(orderDate.getTime())

      if (hasDate && dateRangeFilter !== 'all') {
        if (dateRangeFilter === 'today') {
          if (
            orderDate.getDate() !== now.getDate() ||
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getFullYear() !== now.getFullYear()
          ) {
            return false
          }
        } else if (dateRangeFilter === 'yesterday') {
          const yesterday = new Date(now)
          yesterday.setDate(yesterday.getDate() - 1)
          if (
            orderDate.getDate() !== yesterday.getDate() ||
            orderDate.getMonth() !== yesterday.getMonth() ||
            orderDate.getFullYear() !== yesterday.getFullYear()
          ) {
            return false
          }
        } else if (dateRangeFilter === 'last_7_days') {
          const past7 = new Date(now)
          past7.setDate(past7.getDate() - 7)
          if (orderDate < past7) return false
        } else if (dateRangeFilter === 'last_15_days') {
          const past15 = new Date(now)
          past15.setDate(past15.getDate() - 15)
          if (orderDate < past15) return false
        } else if (dateRangeFilter === 'last_30_days') {
          const past30 = new Date(now)
          past30.setDate(past30.getDate() - 30)
          if (orderDate < past30) return false
        } else if (dateRangeFilter === 'this_month') {
          if (
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getFullYear() !== now.getFullYear()
          ) {
            return false
          }
        } else if (dateRangeFilter === 'last_month') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
          if (
            orderDate.getMonth() !== lastMonth ||
            orderDate.getFullYear() !== lastMonthYear
          ) {
            return false
          }
        }
      }

      // Marketplace filter for admin
      if (panel === 'admin' && marketplace !== 'All Marketplaces') {
        if (marketplace === 'Sellvro B2B' && order.source && order.source !== 'sellvro') {
          return false
        }
        if (marketplace === 'Daraz' && order.source !== 'daraz') {
          return false
        }
        if (marketplace === 'Shopify' && order.source !== 'shopify') {
          return false
        }
      }

      // Store / Supplier filter for admin
      if (panel === 'admin' && selectedStore !== 'All Stores') {
        const match =
          order.supplierId === selectedStore ||
          order.supplier === selectedStore ||
          order.supplierBusinessName === selectedStore
        if (!match) return false
      }

      // Marketing orders filter
      if (marketingIncluded === 'Organic Only' && order.isMarketing) {
        return false
      }

      return true
    })
  }, [orders, dateRangeFilter, selectedStore, marketplace, marketingIncluded, panel])

  // Aggregate Metrics
  const realMetrics = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== 'cancelled')
    const totalOrdersCount = filteredOrders.length
    const validOrdersCount = validOrders.length

    const grossSales = validOrders.reduce((sum, o) => {
      return sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0))
    }, 0)

    const sellerSubsidy = validOrders.reduce((sum, o) => {
      const prod =
        productMap.get(String(o.productId || o.product?.id || o.product?._id || o.product || '')) ||
        productMap.get(String(o.productSku || '').toUpperCase())
      const baseCost = Number(prod?.price || o.unitPrice || 0)
      const qty = Number(o.quantity) || 1
      return sum + qty * baseCost
    }, 0)

    const platformCommission = validOrders.reduce((sum, o) => {
      if (o.commission && Number(o.commission) > 0) return sum + Number(o.commission)
      const prod =
        productMap.get(String(o.productId || o.product?.id || o.product?._id || o.product || '')) ||
        productMap.get(String(o.productSku || '').toUpperCase())
      const rate = Number(prod?.commission || o.commissionPercent || 10)
      const total = Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0)
      return sum + (rate / 100) * total
    }, 0)

    const refundAmount = filteredOrders
      .filter((o) => o.status === 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0)), 0)

    const netProfit = Math.max(0, grossSales - sellerSubsidy - platformCommission)
    const netPayout = Math.max(0, grossSales - platformCommission)

    return {
      totalOrders: totalOrdersCount,
      validOrders: validOrdersCount,
      reconciliationSales: grossSales,
      sales: grossSales,
      grossRevenue: grossSales,
      sellerSubsidy,
      productSales: grossSales,
      platformCommission,
      refundAmount,
      netProfit,
      netPayout,
      profitMargin: grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : '0.0',
    }
  }, [filteredOrders, productMap])

  // Real Dynamic Timeline Points for Chart (Converted based on currency)
  const realChartPoints = useMemo(() => {
    const rate = CURRENCY_RATES[currency] || 1
    const pointsMap = new Map()

    // 1. Gather all actual order dates
    filteredOrders.forEach((order) => {
      const od = new Date(order.createdAt || order.date)
      if (!Number.isNaN(od.getTime())) {
        const key = od.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        if (!pointsMap.has(key)) {
          pointsMap.set(key, {
            dateLabel: key,
            dateObj: od,
            orders: 0,
            sales: 0,
            reconciliationSales: 0,
            grossRevenue: 0,
            sellerSubsidy: 0,
            productSales: 0,
            originalPrice: 0,
            validOrders: 0,
            validSales: 0,
            refundAmount: 0,
            customersSet: new Set(),
          })
        }
      }
    })

    // 2. If fewer than 7 points, pad with recent dates
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 3)
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      if (!pointsMap.has(key)) {
        pointsMap.set(key, {
          dateLabel: key,
          dateObj: d,
          orders: 0,
          sales: 0,
          reconciliationSales: 0,
          grossRevenue: 0,
          sellerSubsidy: 0,
          productSales: 0,
          originalPrice: 0,
          validOrders: 0,
          validSales: 0,
          refundAmount: 0,
          customersSet: new Set(),
        })
      }
    }

    filteredOrders.forEach((order) => {
      const od = new Date(order.createdAt || order.date)
      if (Number.isNaN(od.getTime())) return

      const key = od.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      let pt = pointsMap.get(key)

      if (pt) {
        const qty = Number(order.quantity) || 1
        const total = Number(order.total) || qty * Number(order.unitPrice || 0)
        const isCancelled = order.status === 'cancelled'

        pt.orders += 1
        if (order.user || order.userId) pt.customersSet.add(order.user || order.userId)

        if (isCancelled) {
          pt.refundAmount += total
        } else {
          const prod =
            productMap.get(String(order.productId || order.product?.id || order.product?._id || order.product || '')) ||
            productMap.get(String(order.productSku || '').toUpperCase())
          const baseCost = Number(prod?.price || order.unitPrice || 0) * qty

          pt.sales += total
          pt.reconciliationSales += total
          pt.grossRevenue += total
          pt.sellerSubsidy += baseCost
          pt.productSales += total
          pt.originalPrice += baseCost
          pt.validOrders += 1
          pt.validSales += total
        }
      }
    })

    const sortedPoints = Array.from(pointsMap.values()).sort(
      (a, b) => a.dateObj.getTime() - b.dateObj.getTime(),
    )

    return sortedPoints.map((pt) => {
      const customers = pt.customersSet.size || (pt.orders > 0 ? 1 : 0)
      const salesPerCustomer = customers > 0 ? pt.sales / customers : 0
      return {
        ...pt,
        orders: pt.orders,
        sales: pt.sales * rate,
        reconciliationSales: pt.reconciliationSales * rate,
        grossRevenue: pt.grossRevenue * rate,
        sellerSubsidy: pt.sellerSubsidy * rate,
        productSales: pt.productSales * rate,
        originalPrice: pt.originalPrice * rate,
        validOrders: pt.validOrders,
        validSales: pt.validSales * rate,
        refundAmount: pt.refundAmount * rate,
        customers,
        salesPerCustomer: salesPerCustomer * rate,
      }
    })
  }, [filteredOrders, productMap, currency])

  // Order Overview Table Data
  const orderOverviewRows = useMemo(() => {
    const now = new Date()
    const rows = []

    const isSameDay = (d1, d2) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()

    const todayOrders = filteredOrders.filter((o) => isSameDay(new Date(o.createdAt || o.date), now))

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayOrders = filteredOrders.filter((o) => isSameDay(new Date(o.createdAt || o.date), yesterday))

    const dayBefore = new Date(now)
    dayBefore.setDate(dayBefore.getDate() - 2)
    const dayBeforeOrders = filteredOrders.filter((o) => isSameDay(new Date(o.createdAt || o.date), dayBefore))

    const buildRow = (label, list) => {
      const valid = list.filter((o) => o.status !== 'cancelled')
      const totalOrders = list.length
      const validOrders = valid.length
      const sales = valid.reduce(
        (sum, o) => sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || 0)),
        0,
      )
      const sellerSubsidy = valid.reduce((sum, o) => {
        const prod =
          productMap.get(String(o.productId || o.product?.id || o.product?._id)) ||
          productMap.get(String(o.productSku || '').toUpperCase())
        return sum + (Number(o.quantity) || 1) * Number(prod?.price || o.unitPrice || 0)
      }, 0)

      return {
        time: label,
        reconciliation: sales,
        totalOrders,
        grossRevenue: sales,
        sellerSubsidy,
        productSales: sales,
        originalPrice: sellerSubsidy,
        sales,
        validOrders,
      }
    }

    rows.push(buildRow('Today', todayOrders))
    rows.push(buildRow('Yesterday', yesterdayOrders))
    rows.push(buildRow('The day before yesterday', dayBeforeOrders))

    return rows
  }, [filteredOrders, productMap])

  // Sales Report Rows
  const salesReportRows = useMemo(() => {
    let list = products

    if (category !== 'All Categories') {
      list = list.filter((p) => p.category === category)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q),
      )
    }

    return list.map((product) => {
      const prodOrders = filteredOrders.filter(
        (o) =>
          String(o.productId || o.product?.id || o.product?._id) === String(product.id || product._id) ||
          String(o.productSku || '').toUpperCase() === String(product.sku || '').toUpperCase() ||
          String(o.product || '').toLowerCase() === String(product.name || '').toLowerCase(),
      )

      const validProdOrders = prodOrders.filter((o) => o.status !== 'cancelled')
      const unitsSold = validProdOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)
      const grossSales = validProdOrders.reduce(
        (sum, o) => sum + (Number(o.total) || (Number(o.quantity) || 1) * Number(o.unitPrice || product.price || 0)),
        0,
      )
      const baseCost = Number(product.price || 0)
      const totalCOGS = unitsSold * baseCost
      const commissionRate = Number(product.commission || 10)
      const wmsFee = (commissionRate / 100) * grossSales
      const netProfit = Math.max(0, grossSales - totalCOGS - wmsFee)
      const netPayout = Math.max(0, grossSales - wmsFee)

      return {
        product,
        id: product.id || product._id,
        name: product.name,
        sku: product.sku,
        image: product.image || (Array.isArray(product.images) ? product.images[0] : ''),
        store: product.supplier?.fullName || product.supplier || 'Main Store',
        baseCost,
        unitsSold,
        grossSales,
        wmsFee,
        netProfit,
        netPayout,
        stock: product.quantity ?? 0,
      }
    })
  }, [products, filteredOrders, category, searchQuery])

  // Merchant expansion state
  const [expandedMerchants, setExpandedMerchants] = useState({})

  const toggleExpandMerchant = (merchantKey) => {
    setExpandedMerchants((prev) => ({
      ...prev,
      [merchantKey]: !prev[merchantKey],
    }))
  }

  // Summary by Merchant SKU aggregation (Merchant-level parent grouping)
  const merchantSkuRows = useMemo(() => {
    const map = new Map()

    salesReportRows.forEach((item) => {
      const merchantKey = item.store || 'Sellvro Direct'
      if (!map.has(merchantKey)) {
        map.set(merchantKey, {
          merchantName: merchantKey,
          merchantCode: `MCH-${merchantKey.replace(/\s+/g, '').substring(0, 4).toUpperCase()}`,
          skusCount: 0,
          totalStock: 0,
          totalUnitsSold: 0,
          totalGrossSales: 0,
          totalWmsFee: 0,
          totalNetProfit: 0,
          totalNetPayout: 0,
          products: [],
        })
      }

      const m = map.get(merchantKey)
      m.skusCount += 1
      m.totalStock += item.stock || 0
      m.totalUnitsSold += item.unitsSold || 0
      m.totalGrossSales += item.grossSales || 0
      m.totalWmsFee += item.wmsFee || 0
      m.totalNetProfit += item.netProfit || 0
      m.totalNetPayout += item.netPayout || 0
      m.products.push(item)
    })

    return Array.from(map.values())
  }, [salesReportRows])

  // Category Profit Breakdown
  const categoryProfits = useMemo(() => {
    const map = new Map()
    salesReportRows.forEach((item) => {
      const cat = item.product.category || 'General'
      if (!map.has(cat)) {
        map.set(cat, { category: cat, grossSales: 0, cogs: 0, wmsFee: 0, netProfit: 0 })
      }
      const ex = map.get(cat)
      ex.grossSales += item.grossSales
      ex.cogs += item.unitsSold * item.baseCost
      ex.wmsFee += item.wmsFee
      ex.netProfit += item.netProfit
    })
    return Array.from(map.values())
  }, [salesReportRows])

  // CSV Export utility
  const exportActiveReport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    if (activeTab === 'order_report') {
      csvContent += 'Time,Reconciliation Sales,Total Orders,Gross Revenue,Seller Cost,Sales,Valid Orders\n'
      orderOverviewRows.forEach((r) => {
        csvContent += `"${r.time}",${r.reconciliation},${r.totalOrders},${r.grossRevenue},${r.sellerSubsidy},${r.sales},${r.validOrders}\n`
      })
    } else if (activeTab === 'sales_report' && skuTab === 'merchant_sku') {
      csvContent += 'Merchant Name,Merchant Code,Total SKUs,Units Sold,Gross Sales,WMS Fee,Net Profit,Total Stock\n'
      merchantSkuRows.forEach((r) => {
        csvContent += `"${r.merchantName}","${r.merchantCode}",${r.skusCount},${r.totalUnitsSold},${r.totalGrossSales},${r.totalWmsFee},${r.totalNetProfit},${r.totalStock}\n`
      })
    } else {
      csvContent += 'Product,SKU,Store,Units Sold,Gross Sales,WMS Fee,Net Profit,Stock\n'
      salesReportRows.forEach((r) => {
        csvContent += `"${r.name}","${r.sku}","${r.store}",${r.unitsSold},${r.grossSales},${r.wmsFee},${r.netProfit},${r.stock}\n`
      })
    }
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${activeTab}_${skuTab}_${panel}_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex bg-[#f0f2f5] min-h-[calc(100vh-110px)] -m-4 sm:-m-6 md:-m-8 font-sans text-slate-800">
      {/* 1. LEFT REPORT ACCORDION SIDEBAR */}
      <div className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between select-none">
        <div>
          {/* Header */}
          <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4">
            <span className="font-bold text-sm text-slate-800">
              {panel === 'user' ? 'My Analytics' : 'Report'}
            </span>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>

          {/* Accordion Menu */}
          <div className="py-2 text-xs">
            {/* Sales Analysis / Sourcing */}
            <div>
              <button
                type="button"
                onClick={() => setSalesAnalysisOpen(!salesAnalysisOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 font-bold text-[#5932ea] hover:bg-slate-50"
              >
                <span>{panel === 'user' ? 'Purchases & Spend' : 'Sales Analysis'}</span>
                {salesAnalysisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {salesAnalysisOpen && (
                <div className="flex flex-col">
                  {/* Store Report (Admin & Supplier only) */}
                  {panel !== 'user' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('store_report')}
                      className={`w-full text-left pl-6 pr-4 py-2 transition-colors relative ${
                        activeTab === 'store_report'
                          ? 'bg-[#ede7f6] text-[#5932ea] font-bold border-l-4 border-[#5932ea]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {panel === 'supplier' ? 'My Store Analytics' : 'Store Report'}
                    </button>
                  )}

                  {/* Order Report */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('order_report')}
                    className={`w-full text-left pl-6 pr-4 py-2 transition-colors relative ${
                      activeTab === 'order_report'
                        ? 'bg-[#ede7f6] text-[#5932ea] font-bold border-l-4 border-[#5932ea]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {panel === 'user' ? 'Order History & Status' : 'Order Report'}
                  </button>

                  {/* Sales Report / Purchased Catalog */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales_report')}
                    className={`w-full text-left pl-6 pr-4 py-2 transition-colors relative ${
                      activeTab === 'sales_report'
                        ? 'bg-[#ede7f6] text-[#5932ea] font-bold border-l-4 border-[#5932ea]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {panel === 'user' ? 'Sourced Items Catalog' : 'Sales Report'}
                  </button>

                  {/* Profit / Spend Report */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('profit_report')}
                    className={`w-full text-left pl-6 pr-4 py-2 transition-colors relative ${
                      activeTab === 'profit_report'
                        ? 'bg-[#ede7f6] text-[#5932ea] font-bold border-l-4 border-[#5932ea]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {panel === 'supplier' ? 'Payouts & Earnings' : panel === 'user' ? 'Spend Summary' : 'Profit Report'}
                  </button>
                </div>
              )}
            </div>

            {/* Invoicing Analysis (Admin only) */}
            {panel === 'admin' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setInvoicingOpen(!invoicingOpen)
                    setActiveTab('invoicing_analysis')
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 font-bold hover:bg-slate-50 ${
                    activeTab === 'invoicing_analysis' ? 'text-[#5932ea] bg-[#ede7f6]' : 'text-slate-700'
                  }`}
                >
                  <span>Invoicing Analysis</span>
                  {invoicingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* Task Analysis / Delivery Tracking */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setTaskAnalysisOpen(!taskAnalysisOpen)
                  setActiveTab('task_analysis')
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 font-bold hover:bg-slate-50 ${
                  activeTab === 'task_analysis' ? 'text-[#5932ea] bg-[#ede7f6]' : 'text-slate-700'
                }`}
              >
                <span>{panel === 'user' ? 'Delivery Tracking' : 'Task Analysis'}</span>
                {taskAnalysisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Finance Report (Admin only) */}
            {panel === 'admin' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setFinanceReportOpen(!financeReportOpen)
                    setActiveTab('finance_report')
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 font-bold hover:bg-slate-50 ${
                    activeTab === 'finance_report' ? 'text-[#5932ea] bg-[#ede7f6]' : 'text-slate-700'
                  }`}
                >
                  <span>Finance Report</span>
                  {financeReportOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* Store Health / Service Quality */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setStoreHealthOpen(!storeHealthOpen)
                  setActiveTab('store_health')
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 font-bold hover:bg-slate-50 ${
                  activeTab === 'store_health' ? 'text-[#5932ea] bg-[#ede7f6]' : 'text-slate-700'
                }`}
              >
                <span>{panel === 'user' ? 'Disputes & Support' : 'Store Health'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Help Tip */}
        <div className="p-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-[#5932ea] cursor-pointer hover:underline">
          <Lightbulb className="h-4 w-4 text-[#10b981] shrink-0 mt-0.5" />
          <span>Click here to learn about &quot;{activeTab.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}&quot;</span>
        </div>
      </div>

      {/* 2. MAIN REPORT CANVAS */}
      <div className="flex-1 p-5 overflow-x-auto space-y-4">
        {/* ========================================================================= */}
        {/* VIEW 1: 🏪 STORE REPORT (Image 1) */}
        {/* ========================================================================= */}
        {activeTab === 'store_report' && panel !== 'user' && (
          <div className="space-y-4">
            {/* Top Carousel KPI Cards with Left/Right Arrow Paddles (Image 1 top) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setChartPage((p) => (p === 1 ? 2 : 1))}
                className="h-7 w-7 rounded-full bg-[#8c9ba5] text-white flex items-center justify-center hover:bg-slate-500 shrink-0 shadow-xs cursor-pointer"
                title="Scroll Cards"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {chartPage === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
                  {/* 1. Total Orders */}
                  <div
                    onClick={() => setActiveMetricCard('orders')}
                    className={`bg-white rounded border-t-[3px] border-[#818cf8] border-x border-b p-3 shadow-xs cursor-pointer transition-all ${
                      activeMetricCard === 'orders' ? 'ring-2 ring-[#818cf8]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Total Orders</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-900">
                      {formatInt(realMetrics.totalOrders)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#10b981] flex items-center gap-1">
                      <span>▲</span> 39.18 %
                    </div>
                  </div>

                  {/* 2. Reconciliation Sales */}
                  <div
                    onClick={() => setActiveMetricCard('reconciliationSales')}
                    className={`bg-white rounded border-t-[3px] border-[#2dd4bf] border-x border-b p-3 shadow-xs cursor-pointer transition-all ${
                      activeMetricCard === 'reconciliationSales' ? 'ring-2 ring-[#2dd4bf]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Reconciliation Sales</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.reconciliationSales, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 84.01 %
                    </div>
                  </div>

                  {/* 3. Sales */}
                  <div
                    onClick={() => setActiveMetricCard('sales')}
                    className={`bg-white rounded border-t-[3px] border-[#fb923c] border-x border-b p-3 shadow-xs cursor-pointer transition-all ${
                      activeMetricCard === 'sales' ? 'ring-2 ring-[#fb923c]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Sales</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.sales, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 55.67 %
                    </div>
                  </div>

                  {/* 4. Gross Revenue */}
                  <div
                    onClick={() => setActiveMetricCard('grossRevenue')}
                    className={`bg-white rounded border-t-[3px] border-[#38bdf8] border-x border-b p-3 shadow-xs cursor-pointer transition-all ${
                      activeMetricCard === 'grossRevenue' ? 'ring-2 ring-[#38bdf8]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Gross Revenue</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.grossRevenue, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 84.07 %
                    </div>
                  </div>

                  {/* 5. Seller Subsidy Price / Net Payout */}
                  <div
                    onClick={() => setActiveMetricCard('sellerSubsidy')}
                    className={`bg-white rounded border-t-[3px] border-[#f87171] border-x border-b p-3 shadow-xs cursor-pointer transition-all ${
                      activeMetricCard === 'sellerSubsidy' ? 'ring-2 ring-[#f87171]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>{panel === 'supplier' ? 'Net Payout (After WMS)' : 'Seller Subsidy Price'}</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(panel === 'supplier' ? realMetrics.netPayout : realMetrics.sellerSubsidy, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 84.07 %
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
                  {/* Set 2 Card 1: Valid Orders */}
                  <div className="bg-white rounded border-t-[3px] border-[#ea580c] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Valid Orders</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-900">
                      {formatInt(realMetrics.validOrders)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#10b981] flex items-center gap-1">
                      <span>▲</span> 98.2 %
                    </div>
                  </div>

                  {/* Set 2 Card 2: Valid Sales */}
                  <div className="bg-white rounded border-t-[3px] border-[#059669] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Valid Order Sales</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.sales, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#10b981] flex items-center gap-1">
                      <span>▲</span> 42.1 %
                    </div>
                  </div>

                  {/* Set 2 Card 3: Refund Order Amount */}
                  <div className="bg-white rounded border-t-[3px] border-[#f43f5e] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Refund Order Amount</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-rose-600 truncate">
                      {formatWithCurrency(realMetrics.refundAmount, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <span>0.0 %</span> Defect
                    </div>
                  </div>

                  {/* Set 2 Card 4: Platform WMS Fee */}
                  <div className="bg-white rounded border-t-[3px] border-[#854d0e] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>WMS Fee (Commission)</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-amber-600 truncate">
                      {formatWithCurrency(realMetrics.platformCommission, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-amber-600">
                      10% Standard Rate
                    </div>
                  </div>

                  {/* Set 2 Card 5: Net Profit */}
                  <div className="bg-white rounded border-t-[3px] border-[#10b981] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>{panel === 'supplier' ? 'Net Margin' : 'Platform Net Profit'}</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-emerald-600 truncate">
                      {formatWithCurrency(panel === 'supplier' ? realMetrics.netPayout : realMetrics.netProfit, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-emerald-600">
                      ▲ {realMetrics.profitMargin}% Net Margin
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setChartPage((p) => (p === 1 ? 2 : 1))}
                className="h-7 w-7 rounded-full bg-[#8c9ba5] text-white flex items-center justify-center hover:bg-slate-500 shrink-0 shadow-xs cursor-pointer"
                title="Scroll Cards"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Multi-Line Chart Box (Image 1) */}
            <div className="bg-white rounded border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#4a154b]">
                    Currency: {currency} ({CURRENCY_SYMBOLS[currency]})
                  </span>
                  <span className="text-xs text-slate-400">|</span>
                  <div className="inline-flex rounded border border-slate-200 bg-white">
                    {['last_7_days', 'last_15_days', 'last_30_days', 'this_month'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDateRangeFilter(key)}
                        className={`px-2.5 py-1 text-xs font-medium border-r last:border-0 border-slate-200 capitalize ${
                          dateRangeFilter === key
                            ? 'border-[#5932ea] text-[#5932ea] font-bold bg-[#ede7f6]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {key.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={BS_DROPDOWN}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>

                  <button
                    type="button"
                    onClick={exportActiveReport}
                    className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                </div>
              </div>

              <div className="h-80 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realChartPoints} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000000 ? `${Math.round(v / 1000000)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                      width={45}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip content={<BigSellerTooltipContent currency={currency} />} />
                    {visibleLines.orders && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="orders"
                        name="Total Orders"
                        stroke="#818cf8"
                        strokeWidth={activeMetricCard === 'orders' ? 4 : 2}
                        dot={false}
                      />
                    )}
                    {visibleLines.reconciliationSales && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="reconciliationSales"
                        name="Reconciliation Sales"
                        stroke="#10b981"
                        strokeWidth={activeMetricCard === 'reconciliationSales' ? 4 : 2}
                        dot={false}
                      />
                    )}
                    {visibleLines.sales && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="sales"
                        name="Sales"
                        stroke="#f97316"
                        strokeWidth={activeMetricCard === 'sales' ? 4 : 2.5}
                        dot={false}
                      />
                    )}
                    {visibleLines.grossRevenue && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="grossRevenue"
                        name="Gross Revenue"
                        stroke="#0284c7"
                        strokeWidth={activeMetricCard === 'grossRevenue' ? 4 : 2}
                        dot={false}
                      />
                    )}
                    {visibleLines.sellerSubsidy && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="sellerSubsidy"
                        name="Seller Subsidy Price"
                        stroke="#ef4444"
                        strokeWidth={activeMetricCard === 'sellerSubsidy' ? 4 : 2}
                        dot={false}
                      />
                    )}
                    {visibleLines.productSales && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="productSales"
                        name="Product Sales"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                    {visibleLines.originalPrice && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="originalPrice"
                        name="Product Original Price"
                        stroke="#d946ef"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Legend Pills with Click-to-toggle visibility */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3 mt-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('orders')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.orders ? 'bg-indigo-50 font-bold text-indigo-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#818cf8]" />
                    Total Orders
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('reconciliationSales')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.reconciliationSales ? 'bg-emerald-50 font-bold text-emerald-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    Reconciliation Sales
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('sales')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.sales ? 'bg-orange-50 font-bold text-orange-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                    Sales
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('grossRevenue')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.grossRevenue ? 'bg-sky-50 font-bold text-sky-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" />
                    Gross Revenue
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('sellerSubsidy')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.sellerSubsidy ? 'bg-red-50 font-bold text-red-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                    Seller Subsidy Price
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('productSales')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.productSales ? 'bg-cyan-50 font-bold text-cyan-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#06b6d4]" />
                    Product Sales
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLineVisibility('originalPrice')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-all ${
                      visibleLines.originalPrice ? 'bg-fuchsia-50 font-bold text-fuchsia-700' : 'opacity-40 line-through'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d946ef]" />
                    Product Original Price
                  </button>
                </div>

                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartPage(1)}
                    className={`cursor-pointer ${chartPage === 1 ? 'text-[#5932ea] font-bold' : 'hover:text-slate-700'}`}
                  >
                    ◀
                  </button>
                  <span>{chartPage}/2</span>
                  <button
                    type="button"
                    onClick={() => setChartPage(2)}
                    className={`cursor-pointer ${chartPage === 2 ? 'text-[#5932ea] font-bold' : 'hover:text-slate-700'}`}
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: 📋 ORDER REPORT (Image 2) */}
        {/* ========================================================================= */}
        {activeTab === 'order_report' && (
          <div className="space-y-4">
            {/* Top Multi-Channel Dropdowns (Image 2 top) */}
            <div className="bg-white rounded border border-slate-200 p-3 flex flex-wrap items-center gap-3">
              {panel === 'admin' && (
                <>
                  <select
                    value={marketplace}
                    onChange={(e) => setMarketplace(e.target.value)}
                    className={BS_DROPDOWN}
                  >
                    <option value="All Marketplaces">All Marketplaces</option>
                    <option value="Sellvro B2B">Sellvro B2B</option>
                    <option value="Daraz">Daraz PK</option>
                    <option value="Shopify">Shopify Store</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Stores</span>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className={BS_DROPDOWN}
                    >
                      <option value="All Stores">All Stores</option>
                      {suppliers.map((s) => (
                        <option key={s.id || s._id} value={s.fullName || s.businessName}>
                          {s.businessName || s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={marketingIncluded}
                    onChange={(e) => setMarketingIncluded(e.target.value)}
                    className={BS_DROPDOWN}
                  >
                    <option value="Marketing Order Included">Marketing Order Included</option>
                    <option value="Organic Only">Organic Only</option>
                  </select>
                </>
              )}

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={BS_DROPDOWN}
              >
                <option value="USD">USD ($)</option>
                <option value="PKR">PKR (Rs)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="EUR">EUR (€)</option>
              </select>

              <button
                type="button"
                onClick={exportActiveReport}
                className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 ml-auto cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>

            {/* Order Overview Table Box (Image 2 middle) */}
            <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">
                  {panel === 'user' ? `Order History Overview (${currency})` : `Order Overview (${currency})`}
                </span>
                <Grid className="h-4 w-4 text-slate-400 cursor-pointer" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="px-4 py-2.5">Time</th>
                      <th className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          Reconciliation Sales <HelpCircle className="h-3 w-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1">
                          Total Orders <HelpCircle className="h-3 w-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          Gross Revenue <HelpCircle className="h-3 w-3 text-slate-400" />
                        </span>
                      </th>
                      {panel !== 'user' && (
                        <th className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1">
                            Seller Subsidy Price <HelpCircle className="h-3 w-3 text-slate-400" />
                          </span>
                        </th>
                      )}
                      <th className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          Product Sales <HelpCircle className="h-3 w-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          Sales <HelpCircle className="h-3 w-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="px-4 py-2.5 text-center">Valid Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderOverviewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{row.time}</td>
                        <td className="px-4 py-3 text-slate-800">{formatWithCurrency(row.reconciliation, currency)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{row.totalOrders}</td>
                        <td className="px-4 py-3 text-slate-800">{formatWithCurrency(row.grossRevenue, currency)}</td>
                        {panel !== 'user' && <td className="px-4 py-3 text-slate-800">{formatWithCurrency(row.sellerSubsidy, currency)}</td>}
                        <td className="px-4 py-3 text-slate-800">{formatWithCurrency(row.productSales, currency)}</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">{formatWithCurrency(row.sales, currency)}</td>
                        <td className="px-4 py-3 text-center text-slate-800 font-bold">{row.validOrders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Summary Section (Image 2 bottom) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Summary ({currency})</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick range pills */}
                  <div className="inline-flex rounded border border-slate-200 bg-white">
                    {['yesterday', 'last_7_days', 'last_15_days', 'last_30_days'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDateRangeFilter(key)}
                        className={`px-3 py-1 text-xs font-medium border-r last:border-0 border-slate-200 capitalize ${
                          dateRangeFilter === key
                            ? 'border-[#5932ea] text-[#5932ea] font-bold bg-[#ede7f6]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {key.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayChart}
                      onChange={(e) => setDisplayChart(e.target.checked)}
                      className="rounded border-slate-300 text-[#5932ea] focus:ring-[#5932ea]"
                    />
                    Display Chart
                  </label>
                </div>
              </div>

              {/* Summary 5 Cards Carousel */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-7 w-7 rounded-full bg-[#8c9ba5] text-white flex items-center justify-center hover:bg-slate-500 shrink-0 shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
                  <div className="bg-white rounded border-t-[3px] border-[#818cf8] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Reconciliation Sales</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.reconciliationSales, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 84.01 %
                    </div>
                  </div>

                  <div className="bg-white rounded border-t-[3px] border-[#2dd4bf] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Total Orders</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-900">
                      {formatInt(realMetrics.totalOrders)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#10b981] flex items-center gap-1">
                      <span>▲</span> 39.18 %
                    </div>
                  </div>

                  <div className="bg-white rounded border-t-[3px] border-[#fb923c] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Sales</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.sales, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 55.67 %
                    </div>
                  </div>

                  <div className="bg-white rounded border-t-[3px] border-[#38bdf8] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>Gross Revenue</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(realMetrics.grossRevenue, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 84.07 %
                    </div>
                  </div>

                  <div className="bg-white rounded border-t-[3px] border-[#f87171] border-x border-b border-slate-200 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>{panel === 'supplier' ? 'Net Payout' : 'Seller Subsidy Price'}</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                      {formatWithCurrency(panel === 'supplier' ? realMetrics.netPayout : realMetrics.sellerSubsidy, currency)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#ef4444] flex items-center gap-1">
                      <span>▼</span> 84.07 %
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="h-7 w-7 rounded-full bg-[#8c9ba5] text-white flex items-center justify-center hover:bg-slate-500 shrink-0 shadow-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: 🛍️ SALES REPORT (Image 3) */}
        {/* ========================================================================= */}
        {activeTab === 'sales_report' && (
          <div className="space-y-4">
            {/* Top Blue Notice Banner */}
            <div className="rounded border-l-4 border-[#3b82f6] bg-[#eff6ff] p-3 text-xs text-slate-700">
              Sellvro Unified Marketplace SKU analytics: live returns, commission rates, and inventory status are updated in real-time from active orders.
            </div>

            {/* Sub-tabs: Summary by Store SKU | Summary by Merchant SKU (Admin Only) */}
            {panel === 'admin' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSkuTab('store_sku')}
                  className={`px-3 py-1.5 text-xs font-bold rounded border cursor-pointer transition-all ${
                    skuTab === 'store_sku'
                      ? 'border-[#f59e0b] text-slate-800 bg-[#fef3c7]'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Summary by Store SKU
                </button>

                <button
                  type="button"
                  onClick={() => setSkuTab('merchant_sku')}
                  className={`px-3 py-1.5 text-xs font-bold rounded border cursor-pointer transition-all ${
                    skuTab === 'merchant_sku'
                      ? 'border-[#f59e0b] text-slate-800 bg-[#fef3c7]'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Summary by Merchant SKU
                </button>
              </div>
            )}

            {/* Filter Bar Row 1 */}
            <div className="bg-white rounded border border-slate-200 p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {panel === 'admin' && (
                  <>
                    <select
                      value={marketplace}
                      onChange={(e) => setMarketplace(e.target.value)}
                      className={BS_DROPDOWN}
                    >
                      <option value="All Marketplaces">All Marketplaces</option>
                      <option value="Sellvro B2B">Sellvro B2B</option>
                      <option value="Daraz">Daraz</option>
                      <option value="Shopify">Shopify</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">Stores</span>
                      <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className={BS_DROPDOWN}
                      >
                        <option value="All Stores">All Stores</option>
                        {suppliers.map((s) => (
                          <option key={s.id || s._id} value={s.fullName || s.businessName}>
                            {s.businessName || s.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {panel !== 'user' && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Shipping Warehouse</span>
                    <select
                      value={warehouse}
                      onChange={(e) => setWarehouse(e.target.value)}
                      className={BS_DROPDOWN}
                    >
                      <option value="All Warehouses">All Warehouses</option>
                      <option value="Main Warehouse">Main Warehouse</option>
                    </select>
                  </div>
                )}

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={BS_DROPDOWN}
                >
                  <option value="All Categories">All Categories</option>
                  {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Bar Row 2: Date tabs + Combo SKU dropdown + Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded border border-slate-200 bg-white">
                    {['last_7_days', 'last_15_days', 'last_30_days'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDateRangeFilter(key)}
                        className={`px-3 py-1 text-xs font-medium border-r last:border-0 border-slate-200 capitalize ${
                          dateRangeFilter === key
                            ? 'border-[#5932ea] text-[#5932ea] font-bold bg-[#ede7f6]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {key.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={BS_DROPDOWN}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {panel === 'admin' && (
                    <div className="relative border border-[#f59e0b] rounded p-0.5 bg-yellow-50/40">
                      <select
                        value={comboSkuType}
                        onChange={(e) => setComboSkuType(e.target.value)}
                        className="h-7 rounded bg-white px-2 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="independent">Independent Stats of Combination SKU</option>
                        <option value="single">Stats Combination SKU by Single SKU</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Search SKU or Name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-36 rounded-l border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#5932ea] focus:outline-none"
                    />
                    <button
                      type="button"
                      className="h-8 px-3 rounded-r bg-[#5932ea] text-white flex items-center justify-center hover:bg-[#4a26cb] cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product SKU Table / Merchant SKU Table */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                {panel === 'admin' && skuTab === 'merchant_sku' ? (
                  /* ================= SUMMARY BY MERCHANT SKU TABLE ================= */
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200 text-slate-700 font-bold">
                        <th className="px-4 py-2.5">Merchant / Supplier</th>
                        <th className="px-4 py-2.5">Merchant Code</th>
                        <th className="px-4 py-2.5 text-center">Listed SKUs</th>
                        <th className="px-4 py-2.5 text-center">Total Units Sold</th>
                        <th className="px-4 py-2.5">Total Gross Sales</th>
                        <th className="px-4 py-2.5">WMS Platform Fee</th>
                        <th className="px-4 py-2.5 text-right">Net Profit</th>
                        <th className="px-4 py-2.5 text-center">Total Stock</th>
                        <th className="px-4 py-2.5 text-center">Child SKUs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {merchantSkuRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No merchants found for this filter.
                          </td>
                        </tr>
                      ) : (
                        merchantSkuRows.map((m) => {
                          const isExpanded = !!expandedMerchants[m.merchantName]
                          return (
                            <>
                              <tr
                                key={m.merchantName}
                                onClick={() => toggleExpandMerchant(m.merchantName)}
                                className="hover:bg-amber-50/40 cursor-pointer transition-colors font-medium bg-white"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-[#5932ea]" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                      )}
                                    </button>
                                    <div>
                                      <span className="font-bold text-slate-900 block text-sm">
                                        {m.merchantName}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        Verified Supplier
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                  {m.merchantCode}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#5932ea] border border-purple-200">
                                    {m.skusCount} SKUs
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-slate-900">
                                  {m.totalUnitsSold}
                                </td>
                                <td className="px-4 py-3 font-bold text-amber-600">
                                  {formatWithCurrency(m.totalGrossSales, currency)}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {formatWithCurrency(m.totalWmsFee, currency)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                  {formatWithCurrency(m.totalNetProfit, currency)}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-slate-800">
                                  {m.totalStock} units
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-slate-200"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleExpandMerchant(m.merchantName)
                                    }}
                                  >
                                    {isExpanded ? 'Hide' : 'View SKUs'}
                                  </Button>
                                </td>
                              </tr>

                              {/* Expandable Child SKUs Accordion */}
                              {isExpanded && (
                                <tr className="bg-slate-50/80">
                                  <td colSpan={9} className="p-4 pl-12">
                                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                        <span className="font-bold text-xs text-slate-800">
                                          Child SKUs for {m.merchantName} ({m.products.length} Items)
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                          Total Merchant Revenue: {formatWithCurrency(m.totalGrossSales, currency)}
                                        </span>
                                      </div>
                                      <table className="w-full text-xs text-left">
                                        <thead>
                                          <tr className="text-[11px] text-slate-500 border-b border-slate-100 pb-1 font-semibold">
                                            <th className="py-1.5">Product & SKU</th>
                                            <th className="py-1.5">Base Cost</th>
                                            <th className="py-1.5 text-center">Units Sold</th>
                                            <th className="py-1.5">Gross Sales</th>
                                            <th className="py-1.5">WMS Fee</th>
                                            <th className="py-1.5 text-right">Net Profit</th>
                                            <th className="py-1.5 text-center">In Warehouse</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {m.products.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/60">
                                              <td className="py-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="h-7 w-7 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                                    {p.image ? (
                                                      <img src={mediaUrl(p.image)} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                      <Package className="h-3.5 w-3.5 m-auto text-slate-300" />
                                                    )}
                                                  </div>
                                                  <div>
                                                    <span className="font-bold text-slate-800 block line-clamp-1">{p.name}</span>
                                                    <span className="font-mono text-[10px] text-[#5932ea]">{p.sku}</span>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="py-2 text-slate-700">{formatWithCurrency(p.baseCost, currency)}</td>
                                              <td className="py-2 text-center font-bold text-slate-800">{p.unitsSold}</td>
                                              <td className="py-2 font-bold text-amber-600">{formatWithCurrency(p.grossSales, currency)}</td>
                                              <td className="py-2 text-slate-600">{formatWithCurrency(p.wmsFee, currency)}</td>
                                              <td className="py-2 text-right font-bold text-emerald-600">{formatWithCurrency(p.netProfit, currency)}</td>
                                              <td className="py-2 text-center font-bold text-slate-800">{p.stock}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* ================= SUMMARY BY STORE SKU TABLE ================= */
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="px-4 py-2.5">Product & SKU</th>
                        <th className="px-4 py-2.5">Store / Supplier</th>
                        <th className="px-4 py-2.5">
                          {panel === 'user' ? 'Unit Price Paid' : 'Product Cost'}
                        </th>
                        <th className="px-4 py-2.5 text-center">
                          {panel === 'user' ? 'Units Bought' : 'Units Sold'}
                        </th>
                        <th className="px-4 py-2.5">
                          {panel === 'user' ? 'Total Spent' : 'Sales'}
                        </th>
                        {panel !== 'user' && <th className="px-4 py-2.5">WMS Fee</th>}
                        {panel !== 'user' && (
                          <th className="px-4 py-2.5 text-right">
                            {panel === 'supplier' ? 'Net Payout' : 'Net Profit'}
                          </th>
                        )}
                        <th className="px-4 py-2.5 text-center">
                          {panel === 'user' ? 'Action' : 'Stock'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesReportRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No products found.
                          </td>
                        </tr>
                      ) : (
                        salesReportRows.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {p.image ? (
                                    <img src={mediaUrl(p.image)} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-4 w-4 text-slate-300" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 line-clamp-1">{p.name}</p>
                                  <p className="text-[11px] font-mono text-[#5932ea]">{p.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{p.store}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{formatWithCurrency(p.baseCost, currency)}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-900">{p.unitsSold}</td>
                            <td className="px-4 py-3 font-bold text-amber-600">{formatWithCurrency(p.grossSales, currency)}</td>
                            {panel !== 'user' && <td className="px-4 py-3 font-semibold text-slate-600">{formatWithCurrency(p.wmsFee, currency)}</td>}
                            {panel !== 'user' && (
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                {formatWithCurrency(panel === 'supplier' ? p.netPayout : p.netProfit, currency)}
                              </td>
                            )}
                            <td className="px-4 py-3 text-center">
                              {panel === 'user' ? (
                                <Link to={`/user/checkout/${p.id}`}>
                                  <Button size="sm" className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Buy Again
                                  </Button>
                                </Link>
                              ) : (
                                <span className="font-bold text-slate-700">{p.stock}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: 💰 PROFIT REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'profit_report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded border-t-[3px] border-[#818cf8] border-x border-b border-slate-200 p-4 shadow-xs">
                <p className="text-xs text-slate-500">
                  {panel === 'user' ? 'Total Spend' : 'Gross Sales'}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatWithCurrency(realMetrics.sales, currency)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Platform Volume</p>
              </div>

              {panel !== 'user' && (
                <div className="bg-white rounded border-t-[3px] border-[#f87171] border-x border-b border-slate-200 p-4 shadow-xs">
                  <p className="text-xs text-slate-500">Product Cost (COGS)</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{formatWithCurrency(realMetrics.sellerSubsidy, currency)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Base Costs</p>
                </div>
              )}

              {panel !== 'user' && (
                <div className="bg-white rounded border-t-[3px] border-[#fb923c] border-x border-b border-slate-200 p-4 shadow-xs">
                  <p className="text-xs text-slate-500">Platform WMS Commission</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{formatWithCurrency(realMetrics.platformCommission, currency)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">10% Platform Fee</p>
                </div>
              )}

              <div className="bg-white rounded border-t-[3px] border-[#10b981] border-x border-b border-slate-200 p-4 shadow-xs">
                <p className="text-xs text-slate-500">
                  {panel === 'supplier' ? 'Net Payout' : panel === 'user' ? 'Completed Purchases' : 'Net Profit'}
                </p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formatWithCurrency(panel === 'supplier' ? realMetrics.netPayout : realMetrics.netProfit, currency)}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">▲ {realMetrics.profitMargin}% Net Margin</p>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 p-4">
              <span className="font-bold text-xs text-slate-800 mb-3 block">
                Profit Breakdown by Category
              </span>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Gross Sales</th>
                    {panel !== 'user' && <th className="px-4 py-2.5">Product Cost</th>}
                    {panel !== 'user' && <th className="px-4 py-2.5">WMS Commission</th>}
                    <th className="px-4 py-2.5 text-right">
                      {panel === 'supplier' ? 'Net Payout' : 'Net Value'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryProfits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No category records found.
                      </td>
                    </tr>
                  ) : (
                    categoryProfits.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-800">{cat.category}</td>
                        <td className="px-4 py-3">{formatWithCurrency(cat.grossSales, currency)}</td>
                        {panel !== 'user' && <td className="px-4 py-3">{formatWithCurrency(cat.cogs, currency)}</td>}
                        {panel !== 'user' && <td className="px-4 py-3 text-amber-600">{formatWithCurrency(cat.wmsFee, currency)}</td>}
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatWithCurrency(cat.netProfit, currency)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: 🧾 INVOICING ANALYSIS (Admin Only) */}
        {/* ========================================================================= */}
        {activeTab === 'invoicing_analysis' && panel === 'admin' && (
          <div className="space-y-4">
            <div className="bg-white rounded border border-slate-200 p-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Invoicing & Tax Statement Analysis
              </h3>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Invoice #</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Tax (GST)</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.slice(0, 10).map((o) => (
                    <tr key={o.id || o._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-[#5932ea]">{o.orderNo || o.id}</td>
                      <td className="px-4 py-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{o.user || 'Customer'}</td>
                      <td className="px-4 py-3 font-bold">{formatWithCurrency(o.total, currency)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatWithCurrency((o.total || 0) * 0.05, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: 🚚 TASK ANALYSIS & FULFILLMENT SLA */}
        {/* ========================================================================= */}
        {activeTab === 'task_analysis' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded p-4 border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-400 font-medium">On-Time Fulfillment Rate</span>
                <p className="text-2xl font-bold text-emerald-600 mt-1">98.4%</p>
                <p className="text-[11px] text-slate-500 mt-1">Under 24h dispatch SLA</p>
              </div>
              <div className="bg-white rounded p-4 border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-400 font-medium">Average Processing Time</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">14.2 hrs</p>
                <p className="text-[11px] text-slate-500 mt-1">Order placed to Shipped</p>
              </div>
              <div className="bg-white rounded p-4 border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-400 font-medium">Pending Tasks / Fulfills</span>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {filteredOrders.filter((o) => o.status === 'in_process' || o.status === 'pending').length} Orders
                </p>
                <p className="text-[11px] text-slate-500 mt-1">In warehouse queue</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7: 💳 FINANCE REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'finance_report' && panel === 'admin' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded p-4 border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-400 font-medium">Total Processed Volume</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatWithCurrency(realMetrics.sales, currency)}</p>
              </div>
              <div className="bg-white rounded p-4 border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-400 font-medium">Platform WMS Fees</span>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatWithCurrency(realMetrics.platformCommission, currency)}</p>
              </div>
              <div className="bg-white rounded p-4 border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-400 font-medium">Supplier Settlements</span>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatWithCurrency(realMetrics.netPayout, currency)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8: 🛡️ STORE HEALTH / SERVICE QUALITY */}
        {/* ========================================================================= */}
        {activeTab === 'store_health' && (
          <div className="space-y-4">
            <div className="bg-white rounded border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                {panel === 'user' ? 'Buyer Protection & Service Ratings' : 'Store Quality & Fulfillment Rating'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-700 block">Overall Store Rating</span>
                  <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">4.9 / 5.0</span>
                  <span className="text-[11px] text-emerald-700 mt-1 block">Top Tier Marketplace</span>
                </div>
                <div className="p-4 rounded-lg bg-sky-50 border border-sky-100">
                  <span className="text-xs font-bold text-sky-700 block">Order Fulfillment Accuracy</span>
                  <span className="text-3xl font-extrabold text-sky-600 mt-1 block">99.2%</span>
                  <span className="text-[11px] text-sky-700 mt-1 block">Zero defect packaging</span>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <span className="text-xs font-bold text-purple-700 block">Dispute Ratio</span>
                  <span className="text-3xl font-extrabold text-purple-600 mt-1 block">0.8%</span>
                  <span className="text-[11px] text-purple-700 mt-1 block">Well below threshold</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
