import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Ban, Building2, Check, CheckCircle2, Copy, Eye, FileText, Plus, Printer, Search, Star, Truck, Warehouse } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx'
import TrackingModal from '../../components/orders/TrackingModal.jsx'
import OrderReviewModal from '../../components/orders/OrderReviewModal.jsx'
import UserCancelOrderModal from '../../components/orders/UserCancelOrderModal.jsx'
import UserUpdateTrackingModal from '../../components/orders/UserUpdateTrackingModal.jsx'
import ShippingAirwayBillModal from '../../components/orders/ShippingAirwayBillModal.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'
import { formatSupplierId } from '../../lib/idFormatters.js'

const TABLE_HEAD = [
  'Order # & Label',
  'Supplier ID & Vendor',
  'Product & SKU',
  'Warehouse Custody',
  'Courier & Tracking ID',
  'Total',
  'Tracking Status',
  'Date',
  'Action',
]

function getOrderCategorizedStatus(order) {
  if (!order) return 'awaiting_dispatch'
  const normStatus = (order.status || '').toLowerCase()
  const normTrack = (order.trackingStatus || '').toLowerCase()
  if (normStatus === 'cancelled' || normTrack === 'cancelled' || order.isRefunded) return 'cancelled'
  if (normStatus === 'returned' || normTrack === 'returned') return 'returned'
  if (normStatus === 'delivered' || normTrack === 'delivered' || order.warehouseLocation === 'delivered') return 'delivered'
  if (normStatus === 'order_due' || normTrack === 'order_due') return 'order_due'

  // Check if order is due for dispatch (promised handling time expired or flagged late)
  if (!order.isDispatched && !['in_transit', 'out_for_delivery', 'delivered', 'returned'].includes(normTrack)) {
    if (order.isOnTimeDispatch === false) return 'order_due'
    if (order.createdAt) {
      const hoursPassed = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
      const promised = order.handlingHoursPromised || 24
      if (hoursPassed > promised) return 'order_due'
    }
  }

  if (normTrack === 'in_process' || normTrack === 'processing' || normTrack === 'in_transit' || normTrack === 'out_for_delivery' || order.isDispatched) {
    return 'in_process'
  }
  return 'awaiting_dispatch'
}

function TrackingStatusBadge({ status, trackingStatus }) {
  const normStatus = (status || '').toLowerCase()
  const normTrack = (trackingStatus || '').toLowerCase()
  if (normStatus === 'cancelled' || normTrack === 'cancelled') return <Badge tone="danger">Cancelled</Badge>
  if (normStatus === 'returned' || normTrack === 'returned') return <Badge tone="danger" className="bg-rose-100 text-rose-800 border-rose-300">Returned</Badge>
  if (normStatus === 'delivered' || normTrack === 'delivered') return <Badge tone="success">Delivered</Badge>
  if (normStatus === 'order_due' || normTrack === 'order_due') return <Badge tone="warning" className="bg-amber-100 text-amber-900 border-amber-300">Order Due</Badge>
  const st = normTrack || normStatus
  if (st === 'awaiting_dispatch' || st === 'placed' || st === 'pending') return <Badge tone="neutral" className="bg-sky-50 text-sky-800 border-sky-200">Awaiting Dispatch</Badge>
  if (st === 'in_process' || st === 'processing' || st === 'in_transit' || st === 'out_for_delivery') {
    return <Badge tone="info">In Process</Badge>
  }
  return <Badge tone="neutral">{st.replace(/_/g, ' ')}</Badge>
}

function UserOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [trackingModalOrder, setTrackingModalOrder] = useState(null)
  const [copiedId, setCopiedId] = useState('')
  const [reviewModalOrder, setReviewModalOrder] = useState(null)
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState('')
  const [cancelModalOrder, setCancelModalOrder] = useState(null)
  const [updateTrackingModalOrder, setUpdateTrackingModalOrder] = useState(null)
  const [airwayBillModalOrder, setAirwayBillModalOrder] = useState(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')

  // Filter states
  const [activeTab, setActiveTab] = useState('all')
  const [custodyFilter, setCustodyFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOrders = () => {
    setLoading(true)
    orderApi
      .mine()
      .then((data) => {
        setOrders(data.data || [])
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load orders.'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const deliveredPendingReview = useMemo(() => {
    return orders.filter((o) => {
      const isDelivered =
        (o.status || '').toLowerCase() === 'delivered' ||
        (o.trackingStatus || '').toLowerCase() === 'delivered' ||
        o.warehouseLocation === 'delivered'
      return isDelivered && !o.isReviewed
    })
  }, [orders])

  const openOrder = (order) => {
    setSelectedId(order.id)
    setDrawerOpen(true)
  }

  // 7 Required Status counts
  const counts = useMemo(() => {
    const res = {
      all: orders.length,
      awaiting_dispatch: 0,
      order_due: 0,
      in_process: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    }
    orders.forEach((o) => {
      const cat = getOrderCategorizedStatus(o)
      if (res[cat] !== undefined) {
        res[cat] += 1
      }
    })
    return res
  }, [orders])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const cat = getOrderCategorizedStatus(order)

      if (activeTab !== 'all' && cat !== activeTab) {
        return false
      }

      if (custodyFilter !== 'all') {
        if (order.warehouseLocation !== custodyFilter) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (order.orderNo && order.orderNo.toLowerCase().includes(q)) ||
          (order.orderLabelRef && order.orderLabelRef.toLowerCase().includes(q)) ||
          (order.supplier && order.supplier.toLowerCase().includes(q)) ||
          (order.supplierDisplayId && order.supplierDisplayId.toLowerCase().includes(q)) ||
          (order.product && order.product.toLowerCase().includes(q)) ||
          (order.productSku && order.productSku.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [orders, activeTab, custodyFilter, searchQuery])

  return (
    <UserLayout>
      <PageHeader
        eyebrow="User Panel"
        title="My Orders"
        action={
          <Button as={Link} to="/" size="sm">
            Shop now
          </Button>
        }
      />

      {/* Action / Cancellation Success Toast */}
      {actionSuccessMessage && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Review Success Toast */}
      {reviewSuccessMessage && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{reviewSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setReviewSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Delivered Order Review Prompt Banner */}
      {deliveredPendingReview.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
              <Star className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                  Feedback Requested
                </span>
                <span className="text-xs font-bold text-amber-900">
                  {deliveredPendingReview.length} Delivered Order{deliveredPendingReview.length > 1 ? 's' : ''} Ready for Rating
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-snug">
                Apka order deliver ho chuka hai! Baraye meherbani supplier ki delivery speed aur product quality par apna feedback dein taake product page par live ratings show ho sakein.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReviewModalOrder(deliveredPendingReview[0])}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-600 active:scale-95 transition cursor-pointer"
          >
            <Star className="h-4 w-4 fill-white" />
            Rate Supplier &amp; Product
          </button>
        </div>
      )}

      {/* Status Counters / Tabs (7 Required Statuses) */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
        {[
          { key: 'all', label: 'All Orders', count: counts.all, color: 'text-slate-800 bg-slate-100' },
          { key: 'awaiting_dispatch', label: 'Awaiting Dispatch', count: counts.awaiting_dispatch, color: 'text-sky-800 bg-sky-50' },
          { key: 'order_due', label: 'Order Due', count: counts.order_due, color: 'text-amber-800 bg-amber-50' },
          { key: 'in_process', label: 'In Process', count: counts.in_process, color: 'text-indigo-800 bg-indigo-50' },
          { key: 'delivered', label: 'Delivered', count: counts.delivered, color: 'text-emerald-800 bg-emerald-50' },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled, color: 'text-rose-800 bg-rose-50' },
          { key: 'returned', label: 'Returned', count: counts.returned, color: 'text-orange-800 bg-orange-50' },
        ].map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20 bg-white shadow-sm'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-xs font-medium text-slate-500">{tab.label}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">{tab.count}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab.color}`}>
                  {tab.count}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter / Search Bar */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Label Ref, SKU, Supplier ID…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <select
            value={custodyFilter}
            onChange={(e) => setCustodyFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="all">Warehouse: All Locations</option>
            <option value="wms_hub">🏢 In WMS Central Hub</option>
            <option value="supplier_warehouse">🏭 At Supplier Warehouse</option>
            <option value="in_transit">🚚 In Courier Transit</option>
            <option value="delivered">✅ Delivered to Customer</option>
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing <strong className="text-slate-800">{filteredOrders.length}</strong> of {orders.length} orders
        </span>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-4 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-12 text-center text-sm text-slate-500">
                    No orders found.
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => {
                const supplierDisplay = formatSupplierId(order.supplierDisplayId || order.supplierId)

                return (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{order.orderNo}</p>
                      {order.orderLabelRef ? (
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                          {order.orderLabelRef}
                        </span>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-amber-800">{supplierDisplay}</span>
                      <p className="text-xs text-slate-500">{order.supplier}</p>
                    </td>

                    <td className="max-w-[220px] px-4 py-3.5">
                      <p className="truncate font-medium text-slate-800" title={order.product}>
                        {order.product}
                      </p>
                      {order.productSku ? (
                        <span className="font-mono text-[11px] font-semibold text-indigo-700">
                          SKU: {order.productSku}
                        </span>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      {order.warehouseLocation === 'wms_hub' || order.isWmsOrder ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <Warehouse className="h-3 w-3 text-emerald-600" /> WMS Hub
                          </span>
                          <span className="text-[10px] font-mono font-medium text-emerald-700" title={order.wmsBatchNumber || order.wmsRequestNumber || ''}>
                            {order.wmsBatchNumber ? `Batch: ${order.wmsBatchNumber}` : order.wmsRequestNumber ? `Req: ${order.wmsRequestNumber}` : (order.isDispatched ? 'Dispatched' : 'Queued')}
                          </span>
                        </div>
                      ) : order.warehouseLocation === 'in_transit' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
                          <Truck className="h-3 w-3" /> In Transit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                          <Building2 className="h-3 w-3" /> Supplier Whse
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        {order.trackingNumber && !order.trackingNumber.startsWith('SLV-') ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {order.trackingNumber}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard?.writeText(order.trackingNumber)
                                setCopiedId(order.id)
                                setTimeout(() => setCopiedId(''), 2000)
                              }}
                              className="rounded p-0.5 text-slate-400 hover:text-slate-700 transition"
                              title="Copy Tracking ID"
                            >
                              {copiedId === order.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              Awaiting Tracking
                            </span>
                            {order.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => setUpdateTrackingModalOrder(order)}
                                className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                                title="Enter Real Courier Tracking ID"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                            )}
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-indigo-700">
                          🚚 {order.carrier || 'Pending Carrier'}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">
                      ${Number(order.total || 0).toFixed(2)}
                      <span className="block text-[11px] font-normal text-slate-400">
                        Qty: {order.quantity || order.items || 1}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />
                        <button
                          type="button"
                          onClick={() => setTrackingModalOrder(order)}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-2xs"
                          title="Track live shipment timeline & progress"
                        >
                          <Truck className="h-3 w-3" />
                          Track
                        </button>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{order.date}</td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAirwayBillModalOrder(order)}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                          title="View & Print Customer Shipping Airway Bill Label"
                        >
                          <Printer className="h-3 w-3" /> Label
                        </button>
                        {(() => {
                          const isDelivered =
                            (order.status || '').toLowerCase() === 'delivered' ||
                            (order.trackingStatus || '').toLowerCase() === 'delivered' ||
                            order.warehouseLocation === 'delivered'
                          if (isDelivered) {
                            if (order.isReviewed) {
                              return (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  <Check className="h-3 w-3" /> Reviewed
                                </span>
                              )
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => setReviewModalOrder(order)}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600 transition shadow-2xs cursor-pointer"
                                title="Rate supplier delivery speed and product quality"
                              >
                                <Star className="h-3 w-3 fill-white" />
                                Rate &amp; Review
                              </button>
                            )
                          }

                          // Check if order can still be cancelled before warehouse dispatch
                          const isCancellable =
                            order.status !== 'cancelled' &&
                            !order.isRefunded &&
                            !['in_transit', 'out_for_delivery', 'delivered', 'returned'].includes((order.trackingStatus || '').toLowerCase()) &&
                            !order.isDispatched &&
                            order.warehouseLocation !== 'in_transit' &&
                            order.warehouseLocation !== 'delivered' &&
                            order.status !== 'delivered'

                          if (isCancellable) {
                            return (
                              <button
                                type="button"
                                onClick={() => setCancelModalOrder(order)}
                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                                title="Cancel order before warehouse dispatch and receive instant wallet refund"
                              >
                                <Ban className="h-3 w-3" /> Cancel
                              </button>
                            )
                          }

                          return null
                        })()}
                        <IconAction
                          icon={Eye}
                          tone="success"
                          aria-label="View order"
                          title="View order details, packaging label & live tracking"
                          onClick={() => openOrder(order)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredOrders.map((order) => {
            const supplierDisplay = formatSupplierId(order.supplierDisplayId || order.supplierId)

            return (
              <div
                key={order.id}
                className="block w-full p-4 text-left hover:bg-slate-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{order.orderNo}</p>
                  <TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-700 font-bold">
                    TRK: {order.trackingNumber || `SLV-${order.orderNo?.replace('ORD-', '')}`}
                  </span>
                  <span className="font-semibold text-slate-600">🚚 {order.carrier || 'Sellvro Express'}</span>
                </div>
                <p className="text-xs text-slate-500">Supplier: {supplierDisplay}</p>
                <p className="text-sm text-slate-700">
                  {order.product} · SKU: {order.productSku || '—'}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-900">${Number(order.total).toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const isDelivered =
                        (order.status || '').toLowerCase() === 'delivered' ||
                        (order.trackingStatus || '').toLowerCase() === 'delivered' ||
                        order.warehouseLocation === 'delivered'
                      if (isDelivered) {
                        if (order.isReviewed) {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                              <Check className="h-3 w-3" /> Reviewed
                            </span>
                          )
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => setReviewModalOrder(order)}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600 transition shadow-2xs"
                          >
                            <Star className="h-3 w-3 fill-white" /> Rate &amp; Review
                          </button>
                        )
                      }
                      return null
                    })()}
                    <button
                      type="button"
                      onClick={() => setTrackingModalOrder(order)}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                    >
                      <Truck className="h-3 w-3" /> Track
                    </button>
                    <button
                      type="button"
                      onClick={() => openOrder(order)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <OrderDetailDrawer
        orderId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="My Order Details & Label"
      />

      {/* Live Parcel Tracking Modal */}
      {trackingModalOrder && (
        <TrackingModal
          order={trackingModalOrder}
          open={Boolean(trackingModalOrder)}
          onClose={() => setTrackingModalOrder(null)}
        />
      )}

      {/* Order Review Modal */}
      {reviewModalOrder && (
        <OrderReviewModal
          order={reviewModalOrder}
          open={Boolean(reviewModalOrder)}
          onClose={() => setReviewModalOrder(null)}
          onSuccess={() => {
            setReviewSuccessMessage('Shukriya! Apki rating aur review supplier ke product page par publish ho gayi hai.')
            fetchOrders()
          }}
        />
      )}

      {/* Customer Order Cancellation Modal (Before Dispatch) */}
      {cancelModalOrder && (
        <UserCancelOrderModal
          order={cancelModalOrder}
          open={Boolean(cancelModalOrder)}
          onClose={() => setCancelModalOrder(null)}
          onSuccess={(msg) => {
            setActionSuccessMessage(msg)
            fetchOrders()
          }}
        />
      )}

      {/* Enter Real Courier Tracking Modal */}
      {updateTrackingModalOrder && (
        <UserUpdateTrackingModal
          order={updateTrackingOrder || updateTrackingModalOrder}
          open={Boolean(updateTrackingModalOrder)}
          onClose={() => setUpdateTrackingModalOrder(null)}
          onSuccess={(msg) => {
            setActionSuccessMessage(msg)
            fetchOrders()
          }}
        />
      )}

      {/* Official 4x6 Courier Shipping Airway Bill Modal */}
      {airwayBillModalOrder && (
        <ShippingAirwayBillModal
          order={airwayBillModalOrder}
          open={Boolean(airwayBillModalOrder)}
          onClose={() => setAirwayBillModalOrder(null)}
        />
      )}
    </UserLayout>
  )
}

export default UserOrdersPage
