import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Hourglass,
  Image as ImageIcon,
  Package,
  RotateCcw,
  Search,
  Send,
  Target,
  Truck,
  User,
  UserCog,
  Warehouse,
} from 'lucide-react'
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
import { adminApi, disputeApi, getErrorMessage, mediaUrl, orderApi, productApi } from '../../lib/api.js'
import { PRODUCT_STATUS_LABEL } from '../../lib/productStatus.js'
import {
  badgeToneForStatus,
  formatMoney,
  formatReportDate,
  inDateRange,
  lastSixMonthBuckets,
  monthKey,
  statusLabel,
} from '../../lib/reportUtils.js'

const ICON_MAP = {
  warehouse: Warehouse,
  truck: Truck,
  download: Download,
  truckOut: Truck,
  alert: AlertTriangle,
  target: Target,
  alertCircle: AlertCircle,
  send: Send,
  hourglass: Hourglass,
  userCog: UserCog,
  user: User,
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

const FILTER_INPUT =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const PANEL_COPY = {
  admin: {
    eyebrow: 'Admin Panel',
    subtitle: 'Search and report on product SKUs across the warehouse.',
  },
  supplier: {
    eyebrow: 'Supplier Panel',
    subtitle: 'Search and report on your own product SKUs only.',
  },
}

function SkuMetricCard({ icon, tone, value, label }) {
  const Icon = ICON_MAP[icon] || Package

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function SectionTable({ title, count, icon: Icon, columns, rows, emptyMessage, renderRow }) {
  return (
    <Card className="overflow-hidden border border-slate-200 shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
          {count}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
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

async function fetchPanelData(panel) {
  if (panel === 'admin') {
    const [productsRes, ordersRes, supplierDisputesRes, userDisputesRes] = await Promise.all([
      adminApi.products(),
      adminApi.orders(),
      adminApi.supplierDisputes().catch(() => ({ data: [] })),
      adminApi.userComplaints().catch(() => ({ data: [] })),
    ])
    return {
      products: productsRes.data || [],
      orders: ordersRes.data || [],
      disputes: [...(supplierDisputesRes.data || []), ...(userDisputesRes.data || [])],
    }
  }

  const [productsRes, ordersRes, disputesRes] = await Promise.all([
    productApi.mine(),
    orderApi.supplier(),
    disputeApi.mine().catch(() => ({ data: [] })),
  ])
  return {
    products: productsRes.data || [],
    orders: ordersRes.data || [],
    disputes: disputesRes.data || [],
  }
}

/**
 * Shared SKU Reporting page content — used by admin and supplier panels.
 * Loads live products / orders / disputes and builds the report on demand.
 */
function SkuReportingContent({ panel = 'admin' }) {
  const [skuQuery, setSkuQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportError, setReportError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const copy = PANEL_COPY[panel] || PANEL_COPY.admin

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPanelData(panel)
      setProducts(data.products)
      setOrders(data.orders)
      setDisputes(data.disputes)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load reporting data.'))
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

  const skuSuggestions = useMemo(() => {
    const query = skuQuery.trim().toUpperCase()
    if (!query || query.length < 2) return []
    return products
      .filter((product) => String(product.sku || '').toUpperCase().includes(query))
      .slice(0, 8)
  }, [products, skuQuery])

  const findProduct = useCallback(
    (query) => {
      const normalized = query.trim().toUpperCase()
      if (!normalized) return null
      const exact = products.find((product) => String(product.sku || '').toUpperCase() === normalized)
      if (exact) return exact
      return (
        products.find((product) => String(product.sku || '').toUpperCase().includes(normalized)) ||
        null
      )
    },
    [products],
  )

  const handleLoadReport = () => {
    setReportError('')
    const product = findProduct(skuQuery)
    if (!product) {
      setSelectedProduct(null)
      setReportError(
        skuQuery.trim()
          ? `No product found for SKU "${skuQuery.trim()}".`
          : 'Enter a SKU to load the report.',
      )
      return
    }
    setSkuQuery(product.sku || '')
    setSelectedProduct(product)
    setAppliedFrom(fromDate)
    setAppliedTo(toDate)
  }

  const handleClear = () => {
    setSkuQuery('')
    setFromDate('')
    setToDate('')
    setAppliedFrom('')
    setAppliedTo('')
    setSelectedProduct(null)
    setReportError('')
  }

  const productOrders = useMemo(() => {
    if (!selectedProduct) return []
    return orders.filter(
      (order) =>
        order.productId === selectedProduct.id &&
        inDateRange(order.createdAt, appliedFrom, appliedTo),
    )
  }, [orders, selectedProduct, appliedFrom, appliedTo])

  const productDisputes = useMemo(() => {
    if (!selectedProduct) return []
    return disputes.filter((dispute) => {
      const matchesProduct =
        dispute.productId === selectedProduct.id ||
        String(dispute.productSku || '').toUpperCase() === String(selectedProduct.sku || '').toUpperCase()
      return matchesProduct && inDateRange(dispute.createdAt, appliedFrom, appliedTo)
    })
  }, [disputes, selectedProduct, appliedFrom, appliedTo])

  const unitsDispatched = useMemo(
    () =>
      productOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.quantity) || 0), 0),
    [productOrders],
  )

  const pendingFulfills = useMemo(
    () => productOrders.filter((order) => ['pending', 'placed', 'in_process'].includes(order.status)).length,
    [productOrders],
  )

  const fulfillByAdmin = useMemo(
    () =>
      selectedProduct?.fulfillBy === 'warehouse' || selectedProduct?.inWarehouse
        ? productOrders.length
        : 0,
    [selectedProduct, productOrders],
  )

  const fulfillByClient = useMemo(
    () => (selectedProduct?.fulfillBy === 'self' ? productOrders.length : 0),
    [selectedProduct, productOrders],
  )

  const stockReceived = Number(selectedProduct?.quantity || 0) + unitsDispatched

  const metrics = useMemo(() => {
    if (!selectedProduct) return []
    return [
      { label: 'Current Stock', value: selectedProduct.quantity ?? 0, tone: 'blue', icon: 'warehouse' },
      {
        label: 'Shipments',
        value: selectedProduct.quantity > 0 || stockReceived > 0 ? 1 : 0,
        tone: 'green',
        icon: 'truck',
      },
      { label: 'Units Received', value: stockReceived, tone: 'green', icon: 'download' },
      { label: 'Units Dispatched', value: unitsDispatched, tone: 'blue', icon: 'truckOut' },
      { label: 'Disputes', value: productDisputes.length, tone: 'orange', icon: 'alert' },
      { label: 'Damaged Units', value: 0, tone: 'red', icon: 'target' },
      { label: 'Missing Units', value: 0, tone: 'orange', icon: 'alertCircle' },
      { label: 'Fulfillments', value: productOrders.length, tone: 'blue', icon: 'send' },
      { label: 'Pending Fulfills', value: pendingFulfills, tone: 'yellow', icon: 'hourglass' },
      { label: 'Fulfillment by Admin', value: fulfillByAdmin, tone: 'purple', icon: 'userCog' },
      { label: 'Fulfillment by Client', value: fulfillByClient, tone: 'teal', icon: 'user' },
    ]
  }, [
    selectedProduct,
    stockReceived,
    unitsDispatched,
    productDisputes.length,
    productOrders.length,
    pendingFulfills,
    fulfillByAdmin,
    fulfillByClient,
  ])

  const monthlyData = useMemo(() => {
    const buckets = lastSixMonthBuckets()
    if (!selectedProduct) return buckets

    const createdKey = monthKey(selectedProduct.createdAt)
    const bucket = buckets.find((item) => item.key === createdKey)
    if (bucket && inDateRange(selectedProduct.createdAt, appliedFrom, appliedTo)) {
      bucket.received += stockReceived
    }

    productOrders.forEach((order) => {
      if (order.status === 'cancelled') return
      const key = monthKey(order.createdAt)
      const target = buckets.find((item) => item.key === key)
      if (target) target.dispatched += Number(order.quantity) || 0
    })

    return buckets
  }, [selectedProduct, productOrders, stockReceived, appliedFrom, appliedTo])

  const shipments = useMemo(() => {
    if (!selectedProduct) return []
    if (!inDateRange(selectedProduct.createdAt, appliedFrom, appliedTo)) return []
    if (stockReceived <= 0) return []
    return [
      {
        date: formatReportDate(selectedProduct.createdAt),
        shipmentNo: `STOCK-${selectedProduct.sku}`,
        courier: selectedProduct.inWarehouse ? 'warehouse' : 'manual',
        expected: stockReceived,
        received: stockReceived,
        damaged: 0,
        missing: 0,
        status: 'received',
      },
    ]
  }, [selectedProduct, stockReceived, appliedFrom, appliedTo])

  const fulfillments = useMemo(
    () =>
      productOrders.map((order) => ({
        id: order.id,
        date: order.date || formatReportDate(order.createdAt),
        tracking: order.orderNo || '—',
        quantity: order.quantity ?? order.items ?? 0,
        source: order.user || order.brandLabel || '—',
        location: selectedProduct?.location || '—',
        status: order.statusLabel || statusLabel(order.status),
        tone: badgeToneForStatus(order.status),
      })),
    [productOrders, selectedProduct],
  )

  const disputeRows = useMemo(
    () =>
      productDisputes.map((dispute) => ({
        id: dispute.id,
        date: dispute.date || formatReportDate(dispute.createdAt),
        type: dispute.type || 'Dispute',
        message: dispute.message || dispute.requests || '—',
        raisedBy: dispute.fromLabel || dispute.from || dispute.raisedBy?.label || '—',
        status: statusLabel(dispute.status),
        tone: badgeToneForStatus(dispute.status),
      })),
    [productDisputes],
  )

  const productImage =
    selectedProduct?.image ||
    (Array.isArray(selectedProduct?.images) ? selectedProduct.images[0] : '') ||
    ''

  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title="My SKU Reporting" className="mb-4" />
      <p className="mb-5 text-sm text-slate-500">{copy.subtitle}</p>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card className="mb-5 border border-slate-200 p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="sku-search" className="mb-1.5 block text-xs font-medium text-slate-500">
              Search SKU
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="sku-search"
                type="search"
                value={skuQuery}
                onChange={(e) => setSkuQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleLoadReport()
                  }
                }}
                placeholder={loading ? 'Loading products…' : 'Enter SKU…'}
                list="sku-suggestions"
                className={`${FILTER_INPUT} pl-10`}
                disabled={loading}
              />
              <datalist id="sku-suggestions">
                {skuSuggestions.map((product) => (
                  <option key={product.id} value={product.sku}>
                    {product.name}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
            <div>
              <label htmlFor="from-date" className="mb-1.5 block text-xs font-medium text-slate-500">
                From
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="to-date" className="mb-1.5 block text-xs font-medium text-slate-500">
                To
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="to-date"
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
        {reportError && <p className="mt-3 text-sm text-rose-600">{reportError}</p>}
        {!loading && !error && products.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            {products.length} product{products.length === 1 ? '' : 's'} available for reporting.
          </p>
        )}
      </Card>

      {!selectedProduct ? (
        <Card className="border border-dashed border-slate-200 p-10 text-center shadow-soft">
          <Package className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No report loaded</p>
          <p className="mt-1 text-xs text-slate-500">
            Search a product SKU and click Load Report to view stock, fulfillments and disputes.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-5 border border-slate-200 p-4 shadow-soft sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {productImage ? (
                  <img
                    src={mediaUrl(productImage)}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h2>
                  <Badge tone={badgeToneForStatus(selectedProduct.status)}>
                    {PRODUCT_STATUS_LABEL[selectedProduct.status] || statusLabel(selectedProduct.status)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                  <span>
                    <span className="font-medium text-slate-400">SKU:</span> {selectedProduct.sku}
                  </span>
                  <span>
                    <span className="font-medium text-slate-400">Category:</span>{' '}
                    {selectedProduct.category || '—'}
                  </span>
                  <span>
                    <span className="font-medium text-slate-400">Brand:</span>{' '}
                    {selectedProduct.brand || '—'}
                  </span>
                  <span>
                    <span className="font-medium text-slate-400">
                      {panel === 'admin' ? 'Supplier' : 'Location'}:
                    </span>{' '}
                    {panel === 'admin' ? selectedProduct.supplier || '—' : selectedProduct.location || '—'}
                  </span>
                  <span>
                    <span className="font-medium text-slate-400">Price:</span>{' '}
                    {formatMoney(selectedProduct.price)}
                  </span>
                  <span>
                    <span className="font-medium text-slate-400">Added:</span>{' '}
                    {formatReportDate(selectedProduct.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {metrics.slice(0, 6).map((metric) => (
              <SkuMetricCard key={metric.label} {...metric} />
            ))}
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {metrics.slice(6).map((metric) => (
              <SkuMetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <Card className="mb-6 border border-slate-200 p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Monthly In vs Out (Last 6 Months)</h3>
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
            <SectionTable
              title="Shipments Timeline"
              count={shipments.length}
              columns={['DATE', 'SHIPMENT #', 'COURIER', 'EXPECTED', 'RECEIVED', 'DAMAGED', 'MISSING', 'STATUS']}
              rows={shipments}
              emptyMessage="No shipments found"
              renderRow={(row) => (
                <tr key={row.shipmentNo} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
                    {row.shipmentNo}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.courier}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.expected}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
                      {row.received}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.damaged}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.missing}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone="success">{row.status}</Badge>
                  </td>
                </tr>
              )}
            />

            <SectionTable
              title="Fulfillment Requests"
              count={fulfillments.length}
              columns={['DATE', 'TRACKING #', 'QUANTITY', 'SOURCE', 'LOCATION', 'STATUS']}
              rows={fulfillments}
              emptyMessage="No fulfillment requests found"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.tracking}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.quantity}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.source}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.location}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                </tr>
              )}
            />

            <SectionTable
              title="Disputes"
              count={disputeRows.length}
              icon={AlertTriangle}
              columns={['DATE', 'TYPE', 'MESSAGE', 'RAISED BY', 'STATUS']}
              rows={disputeRows}
              emptyMessage="No disputes found"
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-800">{row.type}</td>
                  <td className="max-w-xs truncate px-5 py-3.5 text-slate-600">{row.message}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.raisedBy}</td>
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

export default SkuReportingContent
