import {
  AlertCircle,
  BarChart3,
  Box,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Store,
  Truck,
  User,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Badge from '../ui/Badge.jsx'
import { adminApi, disputeApi, getErrorMessage, mediaUrl, orderApi, productApi } from '../../lib/api.js'
import { badgeToneForStatus, formatReportDate, inDateRange, statusLabel } from '../../lib/reportUtils.js'

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
    const [productsRes, ordersRes, supplierDisputesRes, userDisputesRes, accountsRes] = await Promise.all([
      adminApi.products().catch(() => ({ data: [] })),
      adminApi.orders().catch(() => ({ data: [] })),
      adminApi.supplierDisputes().catch(() => ({ data: [] })),
      adminApi.userComplaints().catch(() => ({ data: [] })),
      adminApi.accounts({ role: 'supplier' }).catch(() => ({ data: [] })),
    ])
    return {
      products: extractArray(productsRes, 'products'),
      orders: extractArray(ordersRes, 'orders'),
      disputes: [...extractArray(supplierDisputesRes), ...extractArray(userDisputesRes)],
      suppliers: extractArray(accountsRes, 'data'),
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
      suppliers: [],
    }
  }

  const [productsRes, ordersRes, disputesRes] = await Promise.all([
    productApi.marketplace().catch(() => ({ data: [] })),
    orderApi.mine().catch(() => ({ data: [] })),
    disputeApi.mine().catch(() => ({ data: [] })),
  ])
  return {
    products: extractArray(productsRes, 'products'),
    orders: extractArray(ordersRes, 'orders'),
    disputes: extractArray(disputesRes, 'disputes'),
    suppliers: [],
  }
}

/**
 * Format deterministic client ID (e.g. WMS-PAK1034) or use explicit supplier clientId.
 */
function getSupplierClientId(entity) {
  if (!entity) return 'WMS-PAK1001'
  if (entity.supplierClientId) return entity.supplierClientId
  if (entity.clientId) return entity.clientId
  if (entity.client) return entity.client
  const idStr = String(entity.id || entity._id || entity.supplierId || '')
  if (idStr.startsWith('WMS-')) return idStr
  if (!idStr) return 'WMS-PAK1001'

  let hash = 0
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i)
    hash |= 0
  }
  const num = 1000 + Math.abs(hash % 9000)
  return `WMS-PAK${num}`
}

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

function formatAddedDate(dateStr) {
  if (!dateStr) return '15 Oct 2024'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '15 Oct 2024'
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function generateLast6MonthsData(orders = []) {
  const months = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`
    months.push({
      name: label,
      month: d.getMonth(),
      year: d.getFullYear(),
      received: 0,
      dispatched: 0,
    })
  }

  orders.forEach((o) => {
    if (o.status === 'cancelled') return
    const orderDate = new Date(o.createdAt || o.date)
    if (Number.isNaN(orderDate.getTime())) return
    const oMonth = orderDate.getMonth()
    const oYear = orderDate.getFullYear()

    const bucket = months.find((m) => m.month === oMonth && m.year === oYear)
    if (bucket) {
      const qty = Number(o.quantity) || 1
      bucket.dispatched += qty
    }
  })

  return months
}

function SkuReportingContent({ panel = 'admin', defaultMode = 'sku' }) {
  const [searchParams] = useSearchParams()
  // Mode: 'sku' (single SKU product report) or 'supplier' (Supplier Store & SKU Lookup)
  const [activeMode, setActiveMode] = useState(() => {
    if (defaultMode === 'supplier') return 'supplier'
    if (typeof window !== 'undefined' && window.location.pathname.includes('sku-lookup')) return 'supplier'
    return 'sku'
  })

  // SKU Mode State
  const [skuQuery, setSkuQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Supplier Lookup Mode State
  const [supplierQuery, setSupplierQuery] = useState('')
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierSkuFilter, setSupplierSkuFilter] = useState('')
  const [supplierError, setSupplierError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Global Data
  const [products, setProducts] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [allDisputes, setAllDisputes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const skuDropdownRef = useRef(null)
  const supplierDropdownRef = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPanelData(panel)
      setProducts(data.products)
      setAllOrders(data.orders)
      setAllDisputes(data.disputes)
      setSuppliers(data.suppliers || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load SKU reporting data.'))
    } finally {
      setLoading(false)
    }
  }, [panel])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle URL params like ?sku=... or ?supplier=...
  useEffect(() => {
    const paramSku = searchParams.get('sku') || searchParams.get('id')
    if (paramSku && products.length > 0 && !selectedProduct) {
      const q = paramSku.trim().toLowerCase()
      const match = products.find(
        (p) =>
          String(p.sku || '').toLowerCase() === q ||
          String(p.id || p._id || '').toLowerCase() === q ||
          String(p.name || '').toLowerCase() === q,
      )
      if (match) {
        setSelectedProduct(match)
        setSkuQuery(match.sku || match.name)
        setActiveMode('sku')
      }
    }

    const paramSupplier = searchParams.get('supplier')
    if (paramSupplier && suppliers.length > 0 && !selectedSupplier) {
      const q = paramSupplier.trim().toLowerCase()
      const match = suppliers.find(
        (s) =>
          String(s.id || s._id || '').toLowerCase() === q ||
          String(s.fullName || '').toLowerCase() === q ||
          getSupplierClientId(s).toLowerCase() === q,
      )
      if (match) {
        setSelectedSupplier(match)
        setSupplierQuery(getSupplierClientId(match))
        setActiveMode('supplier')
      }
    }
  }, [searchParams, products, suppliers, selectedProduct, selectedSupplier])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (skuDropdownRef.current && !skuDropdownRef.current.contains(event.target)) {
        setShowSkuSuggestions(false)
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Comprehensive Supplier Directory List (combining accounts & products)
  const allSuppliersList = useMemo(() => {
    const map = new Map()

    suppliers.forEach((s) => {
      const sId = String(s.id || s._id || '')
      const clientId = getSupplierClientId(s)
      map.set(sId, {
        id: sId,
        clientId,
        fullName: s.fullName || 'Supplier',
        businessName: s.businessProfile?.businessName || s.fullName || 'Store',
        email: s.email || '',
        phone: s.businessProfile?.businessPhone || s.phone || '—',
        location:
          s.businessProfile?.location ||
          [s.businessProfile?.city, s.businessProfile?.country].filter(Boolean).join(', ') ||
          '—',
        status: s.status || 'Approved',
        joined: s.joined || '—',
        account: s,
      })
    })

    products.forEach((p) => {
      const sId = String(p.supplierId || '')
      if (sId && !map.has(sId)) {
        const clientId = getSupplierClientId(p)
        map.set(sId, {
          id: sId,
          clientId,
          fullName: p.supplier || 'Supplier',
          businessName: p.supplierBusinessName || p.supplier || 'Store',
          email: p.supplierEmail || '',
          phone: p.supplierPhone || '—',
          location: p.location || '—',
          status: 'Approved',
          joined: '—',
          account: null,
        })
      }
    })

    return Array.from(map.values())
  }, [suppliers, products])

  // Filtered Suppliers for autocomplete
  const filteredSupplierSuggestions = useMemo(() => {
    if (!allSuppliersList.length) return []
    const q = (supplierQuery || '').trim().toLowerCase()
    if (!q) return allSuppliersList.slice(0, 10)
    return allSuppliersList
      .filter(
        (s) =>
          s.clientId.toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          s.businessName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      )
      .slice(0, 10)
  }, [allSuppliersList, supplierQuery])

  // Products belonging to the selected supplier
  const selectedSupplierProducts = useMemo(() => {
    if (!selectedSupplier) return []
    const sId = String(selectedSupplier.id || '').toLowerCase()
    const sClientId = String(selectedSupplier.clientId || '').toLowerCase()
    const sName = String(selectedSupplier.fullName || '').toLowerCase()
    const sBiz = String(selectedSupplier.businessName || '').toLowerCase()

    let list = products.filter((p) => {
      const pSupId = String(p.supplierId || '').toLowerCase()
      const pClientId = getSupplierClientId(p).toLowerCase()
      const pSupName = String(p.supplier || '').toLowerCase()
      const pBiz = String(p.supplierBusinessName || '').toLowerCase()

      return (
        (sId && pSupId && sId === pSupId) ||
        (sClientId && pClientId && sClientId === pClientId) ||
        (sName && pSupName && sName === pSupName) ||
        (sBiz && pBiz && sBiz === pBiz)
      )
    })

    if (supplierSkuFilter.trim()) {
      const q = supplierSkuFilter.trim().toLowerCase()
      list = list.filter(
        (p) =>
          String(p.sku || '').toLowerCase().includes(q) ||
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.category || '').toLowerCase().includes(q),
      )
    }

    return list
  }, [selectedSupplier, products, supplierSkuFilter])

  // Total stock for selected supplier
  const supplierTotalStock = useMemo(() => {
    return selectedSupplierProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
  }, [selectedSupplierProducts])

  // Filter orders by From/To date
  const filteredOrders = useMemo(() => {
    if (!fromDate && !toDate) return allOrders
    return allOrders.filter((o) => inDateRange(o.createdAt || o.date, fromDate, toDate))
  }, [allOrders, fromDate, toDate])

  const filteredDisputes = useMemo(() => {
    if (!fromDate && !toDate) return allDisputes
    return allDisputes.filter((d) => inDateRange(d.createdAt || d.date, fromDate, toDate))
  }, [allDisputes, fromDate, toDate])

  // Suggestions for SKU autocomplete
  const filteredSkuSuggestions = useMemo(() => {
    if (!products.length) return []
    const q = (skuQuery || '').trim().toLowerCase()

    // Find SKUs this user/supplier has ordered or listed
    const userOrderedSkus = new Set(
      allOrders
        .map((o) => (o.productSku || (typeof o.product === 'object' ? o.product?.sku : '') || '').toUpperCase())
        .filter(Boolean),
    )

    let candidateList = products
    if (panel === 'user' && !q && userOrderedSkus.size > 0) {
      // Prioritize products the user actually ordered for their store
      candidateList = [
        ...products.filter((p) => p.sku && userOrderedSkus.has(p.sku.toUpperCase())),
        ...products.filter((p) => !p.sku || !userOrderedSkus.has(p.sku.toUpperCase())),
      ]
    }

    if (!q) return candidateList.slice(0, 10)
    return candidateList
      .filter((p) => (p.sku && p.sku.toLowerCase().includes(q)) || (p.name && p.name.toLowerCase().includes(q)))
      .slice(0, 10)
  }, [products, skuQuery, panel, allOrders])

  // Orders for current selected product
  const selectedProductOrders = useMemo(() => {
    if (!selectedProduct) return []
    return filteredOrders.filter((o) => isOrderForProduct(o, selectedProduct))
  }, [filteredOrders, selectedProduct])

  // Disputes for current selected product
  const selectedProductDisputes = useMemo(() => {
    if (!selectedProduct) return []
    return filteredDisputes.filter((d) => isDisputeForProduct(d, selectedProduct))
  }, [filteredDisputes, selectedProduct])

  // Calculated Stats matching the screenshot cards
  const stats = useMemo(() => {
    if (!selectedProduct) {
      return {
        currentStock: 0,
        newUnits: 0,
        unitsReturned: 0,
        unitsInspected: 0,
        disputes: 0,
        damagedUnits: 0,
        missingUnits: 0,
        fulfillments: 0,
        pendingFulfillments: 0,
        fulfillmentByAdmin: 0,
        fulfillmentByClient: 0,
      }
    }

    const currentStock = Number(selectedProduct.quantity ?? 0)
    const validOrders = selectedProductOrders.filter((o) => o.status !== 'cancelled')
    const fulfillments = validOrders.length
    const pendingFulfillments = validOrders.filter((o) => o.status === 'pending' || o.status === 'in_process').length

    // Categorized fulfillments
    const fulfillmentByAdmin = validOrders.filter((o) => o.brandLabel === 'Sellvro' || !o.brandLabel).length
    const fulfillmentByClient = validOrders.filter((o) => o.brandLabel && o.brandLabel !== 'Sellvro').length

    // Returns & Disputes
    const disputesCount = selectedProductDisputes.length
    const unitsReturned = selectedProductDisputes.filter((d) => String(d.type || '').toLowerCase().includes('return')).length
    const damagedUnits = selectedProductDisputes.filter((d) => String(d.type || '').toLowerCase().includes('damage')).length
    const missingUnits = selectedProductDisputes.filter((d) => String(d.type || '').toLowerCase().includes('missing')).length

    return {
      currentStock,
      newUnits: 0,
      unitsReturned,
      unitsInspected: currentStock,
      disputes: disputesCount,
      damagedUnits,
      missingUnits,
      fulfillments,
      pendingFulfillments,
      fulfillmentByAdmin,
      fulfillmentByClient,
    }
  }, [selectedProduct, selectedProductOrders, selectedProductDisputes])

  // Chart data for Last 6 Months (Received vs Dispatched)
  const chartData = useMemo(() => {
    return generateLast6MonthsData(selectedProductOrders)
  }, [selectedProductOrders])

  // Load Report Action (SKU Mode)
  const handleLoadReport = () => {
    setShowSkuSuggestions(false)
    const query = (skuQuery || '').trim().toLowerCase()
    if (!query) {
      setSearchError('Please type or select a SKU / Product name.')
      return
    }

    let match = products.find((p) => String(p.sku || '').toLowerCase() === query)
    if (!match) {
      match = products.find((p) => String(p.name || '').toLowerCase() === query)
    }
    if (!match) {
      match = products.find((p) => String(p.sku || '').toLowerCase().includes(query))
    }
    if (!match) {
      match = products.find((p) => String(p.name || '').toLowerCase().includes(query))
    }

    if (match) {
      setSelectedProduct(match)
      setSkuQuery(match.sku || match.name)
      setSearchError('')
    } else {
      setSearchError(`No product found matching "${skuQuery}". Please select a valid SKU from suggestions.`)
    }
  }

  // Clear Action (SKU Mode)
  const handleClear = () => {
    setSkuQuery('')
    setFromDate('')
    setToDate('')
    setSelectedProduct(null)
    setSearchError('')
    setShowSkuSuggestions(false)
  }

  // Load Supplier Action (Supplier Lookup Mode)
  const handleLoadSupplier = () => {
    setShowSupplierSuggestions(false)
    const query = (supplierQuery || '').trim().toLowerCase()
    if (!query) {
      setSupplierError('Please enter a Supplier ID (e.g. WMS-PAK1001), Store Name, or Supplier Name.')
      return
    }

    let match = allSuppliersList.find((s) => s.clientId.toLowerCase() === query)
    if (!match) {
      match = allSuppliersList.find((s) => s.fullName.toLowerCase() === query || s.businessName.toLowerCase() === query)
    }
    if (!match) {
      match = allSuppliersList.find(
        (s) =>
          s.clientId.toLowerCase().includes(query) ||
          s.fullName.toLowerCase().includes(query) ||
          s.businessName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query),
      )
    }

    if (match) {
      setSelectedSupplier(match)
      setSupplierQuery(match.clientId)
      setSupplierError('')
    } else {
      setSupplierError(`No supplier found matching "${supplierQuery}". Please check the Supplier ID or pick from the list.`)
    }
  }

  // Clear Supplier Action
  const handleClearSupplier = () => {
    setSupplierQuery('')
    setSelectedSupplier(null)
    setSupplierSkuFilter('')
    setSupplierError('')
    setShowSupplierSuggestions(false)
  }

  // Impersonate / Jump to Supplier Panel
  const handleImpersonateSupplier = async (supplier) => {
    if (!supplier) return
    const confirmed = window.confirm(
      `Login as "${supplier.businessName || supplier.fullName || 'Supplier'}" (Supplier)?\n\nYou will be redirected to the supplier dashboard in Admin Impersonation Mode.`,
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await adminApi.impersonate(supplier.id)
      window.location.href = res.redirectUrl || '/supplier/dashboard'
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to switch to supplier panel.'))
      setActionLoading(false)
    }
  }

  // Select a product from supplier list to view its SKU report
  const handleSelectProductFromSupplier = (prod) => {
    setSelectedProduct(prod)
    setSkuQuery(prod.sku || prod.name)
    setActiveMode('sku')
  }

  const supplierClientId = getSupplierClientId(selectedProduct)
  const productImage = selectedProduct?.image || (Array.isArray(selectedProduct?.images) ? selectedProduct.images[0] : '')

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {panel === 'supplier' ? 'SUPPLIER PORTAL' : panel === 'user' ? 'STORE CLIENT PORTAL' : 'ADMIN PANEL'}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {activeMode === 'sku'
              ? (panel === 'supplier' ? 'My Store SKU Report' : panel === 'user' ? 'My Store SKU Report' : 'SKU Product Report')
              : 'Supplier Store & SKU Lookup'}
          </h1>
        </div>

        {/* Feature Switcher Tabs */}
        {panel === 'admin' && (
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMode('sku')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                activeMode === 'sku'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              SKU Report
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('supplier')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                activeMode === 'supplier'
                  ? 'bg-[#05004e] text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Supplier Store & SKU Lookup
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
          Loading SKU reporting data…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: SKU REPORT (Matches Screenshot) */}
      {/* ======================================================== */}
      {activeMode === 'sku' && (
        <>
          {/* Search & Filter Bar: Matching Screenshot */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* SKU Search Input with Autocomplete */}
              <div ref={skuDropdownRef} className="relative flex-1 min-w-[260px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type or select a SKU / Product name..."
                    value={skuQuery}
                    onChange={(e) => {
                      setSkuQuery(e.target.value)
                      setShowSkuSuggestions(true)
                      setSearchError('')
                    }}
                    onFocus={() => setShowSkuSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLoadReport()
                      }
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>

                {/* Suggestions Dropdown */}
                {showSkuSuggestions && filteredSkuSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {filteredSkuSuggestions.map((item) => (
                      <button
                        key={item.id || item._id}
                        type="button"
                        onClick={() => {
                          setSkuQuery(item.sku || item.name)
                          setSelectedProduct(item)
                          setShowSkuSuggestions(false)
                          setSearchError('')
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center">
                          {item.image || (Array.isArray(item.images) && item.images[0]) ? (
                            <img
                              src={mediaUrl(item.image || item.images[0])}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#05004e]">{item.sku}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate text-xs font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{item.category || 'General'}</span>
                            <span>•</span>
                            <span>Stock: {item.quantity ?? 0}</span>
                            <span>•</span>
                            <span>Client: {getSupplierClientId(item)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* From Date */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-normal text-slate-500">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>

              {/* To Date */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-normal text-slate-500">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>

              {/* Load Report Button */}
              <button
                type="button"
                onClick={handleLoadReport}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#05004e] px-5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#09026b] transition-all cursor-pointer"
              >
                <BarChart3 className="h-4 w-4" />
                Load Report
              </button>

              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-10 items-center justify-center gap-1.5 px-3 text-xs sm:text-sm font-normal text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                Clear
              </button>
            </div>

            {searchError && (
              <p className="mt-2 text-xs font-medium text-amber-600">
                {searchError}
              </p>
            )}
          </div>

          {/* SKU BODY */}
          {!selectedProduct ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-28 text-center select-none">
              <div className="mb-4 flex items-center justify-center">
                <svg
                  width="76"
                  height="76"
                  viewBox="0 0 76 76"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto"
                >
                  <polygon points="38,16 60,28 38,40 16,28" fill="#E2E8F0" />
                  <polygon points="38,22 52,30 38,38 24,30" fill="#CBD5E1" opacity="0.6" />
                  <polygon points="16,28 5,20 25,10 38,16" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.2" strokeLinejoin="round" />
                  <polygon points="60,28 71,20 51,10 38,16" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.2" strokeLinejoin="round" />
                  <polygon points="16,28 38,40 38,64 16,52" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.2" strokeLinejoin="round" />
                  <polygon points="38,40 60,28 60,52 38,64" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.2" strokeLinejoin="round" />
                  <polygon points="16,28 27,34 38,40 16,28" fill="#FFFFFF" opacity="0.4" />
                  <polygon points="60,28 49,34 38,40 60,28" fill="#CBD5E1" opacity="0.4" />
                </svg>
              </div>
              <p className="text-sm font-normal text-slate-400">
                Enter a SKU above to load its complete reporting history
              </p>
            </div>
          ) : (
            /* LOADED SKU REPORT: Exact Structure from Screenshot */
            <div className="flex flex-col gap-4">
              {/* 1. Product Banner Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {productImage ? (
                      <img
                        src={mediaUrl(productImage)}
                        alt={selectedProduct.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {selectedProduct.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>
                        <strong className="font-semibold text-slate-700">SKU:</strong>{' '}
                        <span className="font-mono text-slate-800">{selectedProduct.sku}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        <strong className="font-semibold text-slate-700">Category:</strong>{' '}
                        {selectedProduct.category || 'Other Leather Products'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        <strong className="font-semibold text-slate-700">Brand:</strong>{' '}
                        {selectedProduct.brand || '-'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        <strong className="font-semibold text-slate-700">Client:</strong>{' '}
                        <button
                          type="button"
                          onClick={() => {
                            const supMatch = allSuppliersList.find(
                              (s) =>
                                s.clientId.toLowerCase() === supplierClientId.toLowerCase() ||
                                String(s.id).toLowerCase() === String(selectedProduct.supplierId || '').toLowerCase(),
                            )
                            if (supMatch) {
                              setSelectedSupplier(supMatch)
                              setSupplierQuery(supMatch.clientId)
                              setActiveMode('supplier')
                            }
                          }}
                          title="Click to view Supplier Store & all SKUs"
                          className="font-mono text-indigo-600 hover:underline font-bold"
                        >
                          {supplierClientId}
                        </button>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        <strong className="font-semibold text-slate-700">Vendor:</strong>{' '}
                        <span className="font-medium text-slate-800">
                          {selectedProduct.vendorName ||
                            selectedProduct.supplierBusinessName ||
                            (selectedProduct.supplier && selectedProduct.supplier !== '—'
                              ? selectedProduct.supplier
                              : '') ||
                            '—'}
                        </span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        <strong className="font-semibold text-slate-700">Price:</strong> Rs.{' '}
                        {selectedProduct.price || 0}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        <strong className="font-semibold text-slate-700">Added:</strong>{' '}
                        {formatAddedDate(selectedProduct.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {selectedProduct.status || 'approved'}
                  </span>
                </div>
              </div>

              {/* 2. Metric Stat Cards Grid */}
              {/* Row 1: 7 Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
                {/* CURRENT STOCK */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Box className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.currentStock}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    CURRENT STOCK
                  </p>
                </div>

                {/* NEW UNITS */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.newUnits}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    NEW UNITS
                  </p>
                </div>

                {/* UNITS RETURNED */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.unitsReturned}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    UNITS RETURNED
                  </p>
                </div>

                {/* UNITS INSPECTED */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.unitsInspected}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    UNITS INSPECTED
                  </p>
                </div>

                {/* DISPUTES */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.disputes}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    DISPUTES
                  </p>
                </div>

                {/* DAMAGED UNITS */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.damagedUnits}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    DAMAGED UNITS
                  </p>
                </div>

                {/* MISSING UNITS */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.missingUnits}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    MISSING UNITS
                  </p>
                </div>
              </div>

              {/* Row 2: 4 Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* FULFILLMENTS */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Truck className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.fulfillments}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    FULFILLMENTS
                  </p>
                </div>

                {/* PENDING FULFILLMENTS */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.pendingFulfillments}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    PENDING FULFILL...
                  </p>
                </div>

                {/* FULFILLMENT BY ADMIN */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.fulfillmentByAdmin}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    FULFILLMENT BY ADMIN
                  </p>
                </div>

                {/* FULFILLMENT BY CLIENT */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <User className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stats.fulfillmentByClient}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    FULFILLMENT BY CLIENT
                  </p>
                </div>
              </div>

              {/* 3. Monthly In vs Out Chart Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-800">
                      Monthly In vs Out (Last 6 months)
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Received
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Dispatched
                    </span>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="received" name="Received" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="dispatched" name="Dispatched" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 4. Table 1: Shipments Timeline */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
                  <Package className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800">Shipments Timeline</h3>
                  <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    0
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">DATE</th>
                    <th className="px-4 py-3">SHIPMENT #</th>
                    <th className="px-4 py-3">COURIER</th>
                    <th className="px-4 py-3 text-center">EXPECTED</th>
                    <th className="px-4 py-3 text-center">RECEIVED</th>
                    <th className="px-4 py-3 text-center">DAMAGED</th>
                    <th className="px-4 py-3 text-center">MISSING</th>
                    <th className="px-5 py-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                      <Package className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                      No shipments found
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Table 2: Fulfillment Requests */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800">Fulfillment Requests</h3>
              <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {selectedProductOrders.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">DATE</th>
                    <th className="px-4 py-3">TRACKING #</th>
                    <th className="px-4 py-3 text-center">QUANTITY</th>
                    <th className="px-4 py-3">SOURCE</th>
                    <th className="px-4 py-3">LOCATION</th>
                    <th className="px-5 py-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProductOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                        <Package className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                        No fulfillment requests found
                      </td>
                    </tr>
                  ) : (
                    selectedProductOrders.map((o) => (
                      <tr key={o.id || o._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600">{formatReportDate(o.createdAt)}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{o.orderNo || o.id}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-900">{o.quantity || 1}</td>
                        <td className="px-4 py-3.5 text-slate-700">{o.brandLabel || 'Customer Direct'}</td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {o.shippingAddress?.city ? `${o.shippingAddress.city}, ${o.shippingAddress.country || 'PK'}` : 'Local Hub'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Badge tone={badgeToneForStatus(o.status)}>
                            {o.statusLabel || statusLabel(o.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Table 3: Disputes */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-800">Disputes</h3>
              <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {selectedProductDisputes.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">DATE</th>
                    <th className="px-4 py-3">TYPE</th>
                    <th className="px-4 py-3">MESSAGE</th>
                    <th className="px-4 py-3">RAISED BY</th>
                    <th className="px-5 py-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProductDisputes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                        <Package className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                        No disputes found
                      </td>
                    </tr>
                  ) : (
                    selectedProductDisputes.map((d) => (
                      <tr key={d.id || d._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600">{formatReportDate(d.createdAt)}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{d.type || 'Quality Issue'}</td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{d.message || d.requests || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {d.raisedByName || (typeof d.user === 'object' ? d.user?.fullName : d.user) || 'Customer'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Badge tone={badgeToneForStatus(d.status)}>
                            {d.statusLabel || statusLabel(d.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* ======================================================== */}
      {/* MODE 2: SUPPLIER STORE & SKU LOOKUP (New Feature) */}
      {/* ======================================================== */}
      {activeMode === 'supplier' && (
        <div className="flex flex-col gap-5">
          {/* Supplier Search Bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div ref={supplierDropdownRef} className="relative flex-1 min-w-[280px]">
                <div className="relative">
                  <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter Supplier ID (e.g. WMS-PAK1001), Store Name, or Supplier Name..."
                    value={supplierQuery}
                    onChange={(e) => {
                      setSupplierQuery(e.target.value)
                      setShowSupplierSuggestions(true)
                      setSupplierError('')
                    }}
                    onFocus={() => setShowSupplierSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLoadSupplier()
                      }
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>

                {/* Autocomplete suggestions for suppliers */}
                {showSupplierSuggestions && filteredSupplierSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {filteredSupplierSuggestions.map((sup) => (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => {
                          setSelectedSupplier(sup)
                          setSupplierQuery(sup.clientId)
                          setShowSupplierSuggestions(false)
                          setSupplierError('')
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-700 text-xs">
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#05004e]">{sup.clientId}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate text-xs font-semibold text-slate-800">{sup.businessName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>Owner: {sup.fullName}</span>
                            <span>•</span>
                            <span>{sup.location}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Supplier Button */}
              <button
                type="button"
                onClick={handleLoadSupplier}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#05004e] px-5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#09026b] transition-all cursor-pointer"
              >
                <Search className="h-4 w-4" />
                Find Store & SKUs
              </button>

              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClearSupplier}
                className="inline-flex h-10 items-center justify-center gap-1.5 px-3 text-xs sm:text-sm font-normal text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                Clear
              </button>
            </div>

            {supplierError && (
              <p className="mt-2 text-xs font-medium text-amber-600">
                {supplierError}
              </p>
            )}
          </div>

          {/* Supplier View: Empty State OR Loaded Store Details & SKUs */}
          {!selectedSupplier ? (
            <div className="flex flex-col items-center justify-center py-24 text-center select-none">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Store className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Supplier Selected</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Enter a Supplier ID (e.g. WMS-PAK1001) or Store name above to view their store profile, total inventory, and inspect all their SKUs.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Supplier Store Profile Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 shadow-inner">
                      <Store className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-bold text-slate-900">
                          {selectedSupplier.businessName || selectedSupplier.fullName}
                        </h2>
                        <span className="font-mono text-xs font-bold bg-[#05004e] text-white px-2.5 py-0.5 rounded-md">
                          {selectedSupplier.clientId}
                        </span>
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                          {selectedSupplier.status || 'Approved'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Owner: <strong className="text-slate-700">{selectedSupplier.fullName}</strong> • Email: {selectedSupplier.email || '—'} • Phone: {selectedSupplier.phone || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Option to Go to Supplier Panel (Impersonate / Switch) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleImpersonateSupplier(selectedSupplier)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {actionLoading ? 'Switching...' : 'Go to Supplier Panel'}
                    </button>
                  </div>
                </div>

                {/* Key Store Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Active SKUs</span>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">{selectedSupplierProducts.length} Products</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Warehouse Stock</span>
                    <p className="mt-1 text-xl font-extrabold text-indigo-600">{supplierTotalStock} Units</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Location / City</span>
                    <p className="mt-1 text-sm font-bold text-slate-800 truncate">{selectedSupplier.location || 'Local Warehouse'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Joined Date</span>
                    <p className="mt-1 text-sm font-bold text-slate-800">{selectedSupplier.joined || 'Active'}</p>
                  </div>
                </div>
              </div>

              {/* Supplier Products & SKUs Explorer */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      All Products & SKUs ({selectedSupplierProducts.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &ldquo;View SKU Report&rdquo; to load the complete reporting history for any product.
                    </p>
                  </div>

                  {/* Filter within this supplier's SKUs */}
                  <div className="relative w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter by SKU or name..."
                      value={supplierSkuFilter}
                      onChange={(e) => setSupplierSkuFilter(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">PRODUCT TITLE & SKU</th>
                        <th className="px-4 py-3">CATEGORY</th>
                        <th className="px-4 py-3 text-center">WAREHOUSE STOCK</th>
                        <th className="px-4 py-3 text-right">UNIT PRICE</th>
                        <th className="px-4 py-3 text-center">STATUS</th>
                        <th className="px-5 py-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSupplierProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                            <Package className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                            No products found for this supplier.
                          </td>
                        </tr>
                      ) : (
                        selectedSupplierProducts.map((p) => {
                          const img = p.image || (Array.isArray(p.images) ? p.images[0] : '')
                          return (
                            <tr key={p.id || p._id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    {img ? (
                                      <img src={mediaUrl(img)} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <Package className="h-4 w-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{p.name}</p>
                                    <p className="font-mono text-xs font-bold text-[#05004e] mt-0.5">
                                      {p.sku}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-slate-600">{p.category || 'General'}</td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  (p.quantity ?? 0) > 0 ? 'bg-slate-100 text-slate-800' : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {p.quantity ?? 0}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                                Rs. {p.price || 0}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  {p.status || 'approved'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleSelectProductFromSupplier(p)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#05004e] hover:bg-[#09026b] text-white px-3 py-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  View SKU Report
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SkuReportingContent
