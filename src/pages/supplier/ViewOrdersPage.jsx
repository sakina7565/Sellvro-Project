import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, Clock, Copy, Eye, FileText, Info, Plus, Printer, RefreshCw, Search, Truck, Warehouse } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx'
import CourierHandoverModal from '../../components/orders/CourierHandoverModal.jsx'
import TrackingModal from '../../components/orders/TrackingModal.jsx'
import UserUpdateTrackingModal from '../../components/orders/UserUpdateTrackingModal.jsx'
import ShippingAirwayBillModal from '../../components/orders/ShippingAirwayBillModal.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { orderApi, getErrorMessage, mediaUrl } from '../../lib/api.js'
import { formatSupplierId, formatUserId } from '../../lib/idFormatters.js'

const TABLE_HEAD = [
  'FR / DISPATCH ID',
  'PRODUCT SKU',
  'QTY',
  'CARRIER',
  'TRACKING',
  'BATCH (6 PM CUTOFF)',
  'CUSTOMIZATIONS',
  'WMS PROOFS & CUSTODY',
  'STATUS',
  'DATE',
  'ACTIONS',
]

function getOrderCategorizedStatus(order) {
  if (!order) return 'awaiting_dispatch'
  const st = (order.trackingStatus || order.status || '').toLowerCase()
  if (st === 'cancelled' || order.status === 'cancelled' || order.isRefunded) return 'cancelled'
  if (st === 'returned' || order.status === 'returned') return 'returned'
  if (st === 'delivered' || order.warehouseLocation === 'delivered' || order.status === 'delivered') return 'delivered'
  if (st === 'order_due' || order.status === 'order_due') return 'order_due'

  // Check if order is due for dispatch (promised handling time expired or flagged late)
  if (!order.isDispatched && !['in_transit', 'out_for_delivery', 'delivered', 'returned'].includes(st)) {
    if (order.isOnTimeDispatch === false) return 'order_due'
    if (order.createdAt) {
      const hoursPassed = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
      const promised = order.handlingHoursPromised || 24
      if (hoursPassed > promised) return 'order_due'
    }
  }

  if (st === 'in_process' || st === 'processing' || st === 'in_transit' || st === 'out_for_delivery' || order.isDispatched) {
    return 'in_process'
  }
  return 'awaiting_dispatch'
}

function TrackingStatusBadge({ status, trackingStatus }) {
  const st = (trackingStatus || status || '').toLowerCase()
  if (st === 'cancelled') return <Badge tone="danger">Cancelled</Badge>
  if (st === 'returned') return <Badge tone="danger" className="bg-rose-100 text-rose-800 border-rose-300">Returned</Badge>
  if (st === 'delivered') return <Badge tone="success">Delivered</Badge>
  if (st === 'order_due') return <Badge tone="warning" className="bg-amber-100 text-amber-900 border-amber-300">Order Due</Badge>
  if (st === 'awaiting_dispatch' || st === 'placed' || st === 'pending') return <Badge tone="neutral" className="bg-sky-50 text-sky-800 border-sky-200">Awaiting Dispatch</Badge>
  if (st === 'in_process' || st === 'processing' || st === 'in_transit' || st === 'out_for_delivery') {
    return <Badge tone="info">In Process</Badge>
  }
  return <Badge tone="neutral">{st.replace(/_/g, ' ')}</Badge>
}

function SupplierViewOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [handoverOrder, setHandoverOrder] = useState(null)
  const [trackingOrder, setTrackingOrder] = useState(null)
  const [updateTrackingOrder, setUpdateTrackingOrder] = useState(null)
  const [airwayBillOrder, setAirwayBillOrder] = useState(null)
  const [copiedId, setCopiedId] = useState('')

  // Filter states
  const [activeTab, setActiveTab] = useState('all')
  const [custodyFilter, setCustodyFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let active = true
    orderApi
      .supplier()
      .then((data) => {
        if (active) setOrders(data.data || [])
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load orders.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openOrder = (order) => {
    setSelectedId(order.id)
    setDrawerOpen(true)
  }

  const handleOrderUpdated = (next) => {
    if (!next?.id) return
    setOrders((prev) => prev.map((item) => (item.id === next.id ? { ...item, ...next } : item)))
  }

  const [syncingWmsId, setSyncingWmsId] = useState(null)
  const handleQuickSyncWms = async (order) => {
    try {
      setSyncingWmsId(order.id)
      const res = await orderApi.pushWms(order.id)
      if (res?.order) {
        handleOrderUpdated(res.order)
      }
      alert(`Order #${order.orderNo || order.id} successfully synced with WMS Fulfillment queue!`)
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to sync order to WMS.'))
    } finally {
      setSyncingWmsId(null)
    }
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
          (order.user && order.user.toLowerCase().includes(q)) ||
          (order.userDisplayId && order.userDisplayId.toLowerCase().includes(q)) ||
          (order.product && order.product.toLowerCase().includes(q)) ||
          (order.productSku && order.productSku.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [orders, activeTab, custodyFilter, searchQuery])

  return (
    <SupplierLayout>
      <PageHeader eyebrow="Supplier Panel" title="Orders" />

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

      {/* Search & Custody Filter */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Label Ref, User ID, SKU…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <select
            value={custodyFilter}
            onChange={(e) => setCustodyFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="all">Warehouse: All Locations</option>
            <option value="supplier_warehouse">🏭 Custody: At My Warehouse</option>
            <option value="wms_hub">🏢 Custody: At WMS Central Hub</option>
            <option value="in_transit">🚚 Custody: Courier In-Transit</option>
            <option value="delivered">✅ Custody: Delivered</option>
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
          <table className="w-full min-w-[1000px] text-left text-sm">
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
                    No matching orders found.
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => {
                const userDisplay = formatUserId(order.userDisplayId || order.userId)
                const supplierDisplay = formatSupplierId(order.supplierDisplayId || order.supplierId)

                return (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 last:border-0">
                    {/* 1. FR ID / Request Number */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {order.wmsRequestNumber || order.orderNo}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const fr = order.wmsRequestNumber || order.orderNo
                            navigator.clipboard?.writeText(fr)
                            setCopiedId(order.id)
                            setTimeout(() => setCopiedId(''), 2000)
                          }}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700 transition"
                          title="Copy Request/Order ID"
                        >
                          {copiedId === order.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500">Ref: {order.orderNo}</p>
                    </td>

                    {/* 2. Product SKU */}
                    <td className="max-w-[200px] px-4 py-3.5">
                      <span className="font-mono text-xs font-extrabold text-indigo-700 block">
                        {order.productSku || 'SVRO-00139'}
                      </span>
                      <p className="truncate text-xs font-medium text-slate-700" title={order.product}>
                        {order.product}
                      </p>
                    </td>

                    {/* 3. Quantity */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-center font-bold text-slate-900">
                      {order.quantity || order.items || 1}
                    </td>

                    {/* 4. Carrier */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-800 border border-slate-200">
                        {order.carrier ? order.carrier.toUpperCase() : 'FEDEX'}
                      </span>
                    </td>

                    {/* 5. Real Tracking Number */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {order.trackingNumber && !order.trackingNumber.startsWith('SLV-') ? (
                        <div className="flex flex-col gap-0.5">
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
                          <span className="text-[10px] text-emerald-600 font-medium">Real Carrier AWB</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            Awaiting Tracking
                          </span>
                          <button
                            type="button"
                            onClick={() => setUpdateTrackingOrder(order)}
                            className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-2xs"
                            title="Enter Real Courier Tracking ID"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 6. Batch (6 PM Cutoff) */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-rose-500">
                        {order.wmsBatchNumber || 'CBF-WMS-PAK1035'}
                      </span>
                      <p className="text-[10px] text-slate-400">Daily Cutoff: 6:00 PM</p>
                    </td>

                    {/* 7. Customizations (Customer & Shipping Address - Matching Screenshot) */}
                    <td className="min-w-[240px] max-w-[320px] px-4 py-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-slate-800 shadow-2xs">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 mb-1">
                          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Marketplace Order #: {order.orderNo}</span>
                        </div>
                        <p className="text-[11px] text-slate-700">
                          <strong>Customer:</strong> {order.shippingAddress?.fullName || order.user || '—'}
                        </p>
                        <p className="text-[11px] text-slate-700">
                          <strong>Phone:</strong> {order.shippingAddress?.phone || '—'}
                        </p>
                        <p className="text-[11px] text-slate-700 truncate" title={`${order.shippingAddress?.addressLine || ''}, ${order.shippingAddress?.city || ''}`}>
                          <strong>Address:</strong> {order.shippingAddress?.addressLine || '—'}, {order.shippingAddress?.city || ''}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 italic truncate">
                          <strong>Notes:</strong> {order.labelNotes || order.brandLabel || 'Customer Order'}
                        </p>
                        <div className="mt-1.5 rounded bg-amber-100/70 px-1.5 py-1 text-[10px] font-bold text-amber-950 border border-amber-300">
                          📦 Parcel Instructions: {order.labelNotes || order.brandLabel || 'Handle with care'}
                        </div>
                      </div>
                    </td>

                    {/* 8. WMS Proofs & Custody */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        {order.shippingLabelUrl ? (
                          <a
                            href={mediaUrl(order.shippingLabelUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-2xs"
                            title="Open uploaded shipping label file"
                          >
                            <FileText className="h-3 w-3" /> Label Attached
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {order.isDispatched ? 'Dispatched' : 'Awaiting Upload'}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                            order.warehouseLocation === 'wms_hub' || order.isWmsOrder
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {order.warehouseLocation === 'wms_hub' || order.isWmsOrder ? (
                            <><Warehouse className="h-3 w-3 text-emerald-600" /> WMS Hub</>
                          ) : (
                            <><Building2 className="h-3 w-3" /> Supplier Facility</>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* 9. Status */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />
                    </td>

                    {/* 10. Date */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{order.date}</td>

                    {/* 11. Actions */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAirwayBillOrder(order)}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                          title="Print official 4x6 courier shipping label"
                        >
                          <Printer className="h-3 w-3" /> Label
                        </button>
                        {(order.warehouseLocation === 'wms_hub' || order.isWmsOrder) && (
                          <button
                            type="button"
                            disabled={syncingWmsId === order.id}
                            onClick={() => handleQuickSyncWms(order)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Push / Re-Sync order with WMS Fulfillment queue"
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingWmsId === order.id ? 'animate-spin' : ''}`} />
                            {syncingWmsId === order.id ? 'Syncing...' : 'Sync WMS'}
                          </button>
                        )}
                        {order.warehouseLocation !== 'in_transit' &&
                        order.warehouseLocation !== 'delivered' &&
                        order.trackingStatus !== 'in_transit' &&
                        order.trackingStatus !== 'delivered' &&
                        order.trackingStatus !== 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => setHandoverOrder(order)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition cursor-pointer"
                            title="Handover order to courier partner"
                          >
                            <Truck className="h-3 w-3" /> Handover
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setTrackingOrder(order)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                            title="View live shipment progress"
                          >
                            <Truck className="h-3 w-3" /> Track
                          </button>
                        )}
                        <IconAction
                          icon={Eye}
                          tone="success"
                          aria-label="View order"
                          title="View order details, packaging label & custody"
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
            const userDisplay = formatUserId(order.userDisplayId || order.userId)
            const isDispatched =
              order.warehouseLocation === 'in_transit' ||
              order.warehouseLocation === 'delivered' ||
              order.trackingStatus === 'in_transit' ||
              order.trackingStatus === 'delivered'

            return (
              <div
                key={order.id}
                className="block w-full p-4 text-left hover:bg-slate-50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{order.orderNo}</p>
                  <TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />
                </div>
                <p className="text-xs font-mono text-indigo-700 mt-0.5">User: {userDisplay}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {order.product} · SKU: {order.productSku || '—'}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span className="font-bold text-emerald-700">
                      +${Number((Number(order.total || 0) - Number(order.commission || 0)).toFixed(2))} Net
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1.5">(Total: ${Number(order.total).toFixed(2)})</span>
                  </div>
                  <span>
                    {order.warehouseLocation === 'wms_hub' ? '🏢 WMS Hub' : '🏭 Supplier Whse'}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAirwayBillOrder(order)}
                    className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="h-3 w-3" /> Label
                  </button>
                  {!isDispatched && order.trackingStatus !== 'cancelled' ? (
                    <button
                      type="button"
                      onClick={() => setHandoverOrder(order)}
                      className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 inline-flex items-center gap-1"
                    >
                      <Truck className="h-3 w-3" /> Handover Courier
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTrackingOrder(order)}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                    >
                      <Truck className="h-3 w-3 text-blue-600" /> Track
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openOrder(order)}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View Details
                  </button>
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
        onUpdated={handleOrderUpdated}
        showStatusUpdate
        title="Order Details & Packaging Label"
      />

      {/* Courier Handover Modal */}
      {handoverOrder && (
        <CourierHandoverModal
          order={handoverOrder}
          open={Boolean(handoverOrder)}
          onClose={() => setHandoverOrder(null)}
          onSuccess={handleOrderUpdated}
        />
      )}

      {/* Live Tracking Modal */}
      {trackingOrder && (
        <TrackingModal
          order={trackingOrder}
          open={Boolean(trackingOrder)}
          onClose={() => setTrackingOrder(null)}
        />
      )}

      {/* Enter/Update Real Courier Tracking Modal */}
      {updateTrackingOrder && (
        <UserUpdateTrackingModal
          order={updateTrackingOrder}
          open={Boolean(updateTrackingOrder)}
          onClose={() => setUpdateTrackingOrder(null)}
          onSuccess={() => {
            orderApi.supplier().then((data) => setOrders(data.data || []))
          }}
        />
      )}

      {/* Official 4x6 Courier Shipping Airway Bill Modal */}
      {airwayBillOrder && (
        <ShippingAirwayBillModal
          order={airwayBillOrder}
          open={Boolean(airwayBillOrder)}
          onClose={() => setAirwayBillOrder(null)}
        />
      )}
    </SupplierLayout>
  )
}

export default SupplierViewOrdersPage
