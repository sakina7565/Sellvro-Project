import { useEffect, useMemo, useState } from 'react'
import { Building2, Eye, Printer, RefreshCw, Search, Truck, Warehouse } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx'
import ShippingAirwayBillModal from '../../components/orders/ShippingAirwayBillModal.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, orderApi, getErrorMessage } from '../../lib/api.js'
import { formatSupplierId, formatUserId } from '../../lib/idFormatters.js'

const TABLE_HEAD = [
  'Order # & Label',
  'Buyer & Supplier',
  'Product & SKU',
  'Carrier & Tracking',
  'Batch (6 PM Cutoff)',
  'Warehouse Custody',
  'Total',
  'Status',
  'Date',
  'Actions',
]

function getOrderCategorizedStatus(order) {
  if (!order) return 'awaiting_dispatch'
  const st = (order.trackingStatus || order.status || '').toLowerCase()
  if (st === 'cancelled' || order.status === 'cancelled' || order.isRefunded) return 'cancelled'
  if (st === 'cancellation_pending' || order.cancellationRequest?.status === 'pending') return 'cancellation_pending'
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
  if (st === 'cancellation_pending') return <Badge tone="warning" className="bg-amber-100 text-amber-900 border-amber-300">Cancel Pending</Badge>
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

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [airwayBillOrder, setAirwayBillOrder] = useState(null)

  // Filters
  const [activeTab, setActiveTab] = useState('all') // all, pending, shipped, out_for_delivery, delivered, cancelled
  const [custodyFilter, setCustodyFilter] = useState('all') // all, wms_hub, supplier_warehouse
  const [searchQuery, setSearchQuery] = useState('')

  const loadOrders = async () => {
    setError('')
    try {
      const data = await adminApi.orders()
      setOrders(data.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load orders.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
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

      // 7 Required Status tab filter
      if (activeTab !== 'all' && cat !== activeTab) {
        return false
      }

      // Custody filter
      if (custodyFilter !== 'all') {
        if (order.warehouseLocation !== custodyFilter) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (order.orderNo && order.orderNo.toLowerCase().includes(q)) ||
          (order.orderLabelRef && order.orderLabelRef.toLowerCase().includes(q)) ||
          (order.user && order.user.toLowerCase().includes(q)) ||
          (order.userDisplayId && order.userDisplayId.toLowerCase().includes(q)) ||
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
    <AdminLayout>
      <PageHeader title="Orders Management" eyebrow="Admin Panel" />

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
              placeholder="Search by Order #, Label Ref, User ID, Supplier ID, SKU…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <select
            value={custodyFilter}
            onChange={(e) => setCustodyFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="all">Warehouse: All Locations</option>
            <option value="wms_hub">🏢 Custody: WMS Central Hub</option>
            <option value="supplier_warehouse">🏭 Custody: Supplier Warehouse</option>
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
          <table className="w-full min-w-[1050px] text-left text-sm">
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
                    {/* Order # & Label Ref */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{order.orderNo}</p>
                      {order.orderLabelRef ? (
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                          {order.orderLabelRef}
                        </span>
                      ) : null}
                    </td>

                    {/* Buyer & Supplier */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-bold text-indigo-700">{userDisplay}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{order.user}</span>
                        <span className="text-[10px] font-mono font-semibold text-amber-800 border-t border-slate-100 pt-0.5 mt-0.5">
                          Supplier: {supplierDisplay}
                        </span>
                      </div>
                    </td>

                    {/* Product & SKU */}
                    <td className="max-w-[200px] px-4 py-3.5">
                      <p className="truncate font-medium text-slate-800" title={order.product}>
                        {order.product}
                      </p>
                      {order.productSku ? (
                        <span className="font-mono text-[11px] font-bold text-indigo-800">
                          SKU: {order.productSku}
                        </span>
                      ) : null}
                      {order.customizationDetails && (
                        <p className="mt-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900 border border-indigo-200 truncate" title={order.customizationDetails}>
                          ✨ Custom: {order.customizationDetails}
                        </p>
                      )}
                    </td>

                    {/* Carrier & Real Tracking */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-extrabold uppercase text-slate-800 border border-slate-200">
                        {order.carrier ? order.carrier.toUpperCase() : 'FEDEX'}
                      </span>
                      <p className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                        {order.trackingNumber && !order.trackingNumber.startsWith('SLV-') ? order.trackingNumber : 'Awaiting AWB'}
                      </p>
                    </td>

                    {/* Batch (6 PM Cutoff) */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-rose-500">
                        {order.wmsBatchNumber || 'CBF-WMS-PAK1035'}
                      </span>
                      <p className="text-[10px] text-slate-400">Daily Cutoff: 6:00 PM</p>
                    </td>

                    {/* Warehouse Custody Location */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {order.warehouseLocation === 'wms_hub' || order.isWmsOrder ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <Warehouse className="h-3 w-3 text-emerald-600" /> WMS Hub
                          </span>
                          <span className="text-[10px] font-mono font-medium text-emerald-700" title={order.wmsBatchNumber || order.wmsRequestNumber || ''}>
                            {order.isDispatched ? 'Dispatched' : 'Batch Queued'}
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

                    {/* Total & Items */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="font-semibold text-slate-800">${Number(order.total || 0).toFixed(2)}</p>
                      <p className="text-xs text-slate-400">{order.quantity || order.items || 1} unit(s)</p>
                    </td>

                    {/* Tracking Status */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{order.date}</td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAirwayBillOrder(order)}
                          className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 inline-flex items-center gap-1 cursor-pointer"
                          title="Print official courier shipping label"
                        >
                          <Printer className="h-3 w-3" /> Label
                        </button>
                        {(order.warehouseLocation === 'wms_hub' || order.isWmsOrder) && (
                          <button
                            type="button"
                            disabled={syncingWmsId === order.id}
                            onClick={() => handleQuickSyncWms(order)}
                            className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Push / Re-Sync order with WMS Fulfillment queue"
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingWmsId === order.id ? 'animate-spin' : ''}`} />
                            {syncingWmsId === order.id ? 'Syncing...' : 'Sync WMS'}
                          </button>
                        )}
                        <IconAction
                          icon={Eye}
                          tone="success"
                          aria-label="View order"
                          title="View order details, label & custody"
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

        {/* Mobile View */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filteredOrders.map((order) => {
            const userDisplay = formatUserId(order.userDisplayId || order.userId)
            const supplierDisplay = formatSupplierId(order.supplierDisplayId || order.supplierId)

            return (
              <MobileCard
                key={order.id}
                title={`${order.orderNo} · ${order.orderLabelRef || ''}`}
                subtitle={`User: ${userDisplay} | Supplier: ${supplierDisplay}`}
                badge={<TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />}
                actions={
                  <IconAction
                    icon={Eye}
                    tone="success"
                    aria-label="View order"
                    onClick={() => openOrder(order)}
                  />
                }
              >
                <DetailRow label="Product" value={order.product} />
                <DetailRow label="SKU" value={order.productSku || '—'} />
                <DetailRow
                  label="Warehouse Custody"
                  value={
                    order.warehouseLocation === 'wms_hub'
                      ? 'WMS Central Hub'
                      : order.warehouseLocation === 'in_transit'
                        ? 'In Courier Transit'
                        : 'Supplier Warehouse'
                  }
                />
                <DetailRow label="Total" value={`$${Number(order.total).toFixed(2)}`} />
                <DetailRow label="Date" value={order.date} full />
              </MobileCard>
            )
          })}
        </div>

        <Pagination
          from={filteredOrders.length ? 1 : 0}
          to={filteredOrders.length}
          total={filteredOrders.length}
          prevLabel="Previous"
        />
      </Card>

      <OrderDetailDrawer
        orderId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleOrderUpdated}
        showStatusUpdate
        title="Order Details & Custody"
      />

      {/* Official 4x6 Courier Shipping Airway Bill Modal */}
      {airwayBillOrder && (
        <ShippingAirwayBillModal
          order={airwayBillOrder}
          open={Boolean(airwayBillOrder)}
          onClose={() => setAirwayBillOrder(null)}
        />
      )}
    </AdminLayout>
  )
}

export default OrdersPage
