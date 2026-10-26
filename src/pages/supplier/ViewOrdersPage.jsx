import { useEffect, useMemo, useState } from 'react'
import { Building2, Eye, Search, Truck, Warehouse } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'

const TABLE_HEAD = [
  'Order # & Label',
  'User ID & Customer',
  'Supplier ID',
  'Product & SKU',
  'Warehouse Custody',
  'Earnings (Net / Gross)',
  'Tracking Status',
  'Date',
  'Actions',
]

function TrackingStatusBadge({ status, trackingStatus }) {
  const st = (trackingStatus || status || '').toLowerCase()
  if (st === 'cancelled') return <Badge tone="danger">Cancelled</Badge>
  if (st === 'delivered') return <Badge tone="success">Delivered</Badge>
  if (st === 'out_for_delivery') return <Badge tone="warning">Out for Delivery</Badge>
  if (st === 'in_transit') return <Badge tone="info">Shipped (In Transit)</Badge>
  if (st === 'processing') return <Badge tone="warning">Processing</Badge>
  return <Badge tone="neutral">Placed / Pending</Badge>
}

function SupplierViewOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  // Status counts
  const counts = useMemo(() => {
    const res = {
      all: orders.length,
      pending: 0,
      shipped: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    }
    orders.forEach((o) => {
      const track = (o.trackingStatus || o.status || '').toLowerCase()
      if (track === 'cancelled') res.cancelled += 1
      else if (track === 'delivered') res.delivered += 1
      else if (track === 'out_for_delivery') res.out_for_delivery += 1
      else if (track === 'in_transit') res.shipped += 1
      else res.pending += 1
    })
    return res
  }, [orders])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const track = (order.trackingStatus || order.status || '').toLowerCase()

      if (activeTab === 'pending') {
        if (track !== 'placed' && track !== 'pending' && track !== 'processing') return false
      } else if (activeTab === 'shipped') {
        if (track !== 'in_transit') return false
      } else if (activeTab === 'out_for_delivery') {
        if (track !== 'out_for_delivery') return false
      } else if (activeTab === 'delivered') {
        if (track !== 'delivered') return false
      } else if (activeTab === 'cancelled') {
        if (track !== 'cancelled') return false
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

      {/* Status Counters / Tabs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { key: 'all', label: 'All Orders', count: counts.all, color: 'text-slate-800 bg-slate-100' },
          { key: 'pending', label: 'Pending / Placed', count: counts.pending, color: 'text-amber-800 bg-amber-50' },
          { key: 'shipped', label: 'Shipped (Transit)', count: counts.shipped, color: 'text-blue-800 bg-blue-50' },
          { key: 'out_for_delivery', label: 'Out of Delivery', count: counts.out_for_delivery, color: 'text-purple-800 bg-purple-50' },
          { key: 'delivered', label: 'Delivered', count: counts.delivered, color: 'text-emerald-800 bg-emerald-50' },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled, color: 'text-rose-800 bg-rose-50' },
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
                const userDisplay =
                  order.userDisplayId || (order.userId ? `USR-${order.userId.slice(-6).toUpperCase()}` : '—')
                const supplierDisplay =
                  order.supplierDisplayId ||
                  (order.supplierId ? `SUP-${order.supplierId.slice(-6).toUpperCase()}` : '—')

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
                      <span className="font-mono text-xs font-bold text-indigo-700">{userDisplay}</span>
                      <p className="text-xs text-slate-500">{order.user}</p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-amber-800">{supplierDisplay}</span>
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
                      {order.warehouseLocation === 'wms_hub' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                          <Warehouse className="h-3 w-3" /> WMS Hub
                        </span>
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
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-700">
                          +${Number((Number(order.total || 0) - Number(order.commission || 0)).toFixed(2))}
                          <span className="text-[10px] font-semibold text-emerald-600 ml-1">Net</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Total: ${Number(order.total || 0).toFixed(2)} (Fee: -${Number(order.commission || 0).toFixed(2)})
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <TrackingStatusBadge status={order.status} trackingStatus={order.trackingStatus} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{order.date}</td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <IconAction
                        icon={Eye}
                        tone="success"
                        aria-label="View order"
                        title="View order details, packaging label & custody"
                        onClick={() => openOrder(order)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredOrders.map((order) => {
            const userDisplay =
              order.userDisplayId || (order.userId ? `USR-${order.userId.slice(-6).toUpperCase()}` : '—')
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order)}
                className="block w-full p-4 text-left hover:bg-slate-50"
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
              </button>
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
    </SupplierLayout>
  )
}

export default SupplierViewOrdersPage
