import { useCallback, useEffect, useState } from 'react'
import { Building2, ExternalLink, Printer, Tag, Warehouse, X } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { getErrorMessage, orderApi, mediaUrl } from '../../lib/api.js'
import { formatShippingAddress, hasShippingAddress, ORDER_STATUS_OPTIONS } from '../../lib/orderHelpers.js'

function statusTone(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'cancelled') return 'danger'
  if (value === 'placed') return 'success'
  if (value.includes('process') || value === 'pending') return 'warning'
  return 'neutral'
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm font-medium text-slate-700">{children}</dd>
    </div>
  )
}

/**
 * Side drawer showing full order details for admin / user / supplier.
 * Loads live data via orderApi.lookup. Optional status update for admin/supplier.
 */
function OrderDetailDrawer({
  orderId,
  open,
  onClose,
  onUpdated,
  showStatusUpdate = false,
  title = 'Order Details',
}) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [warehouseLoc, setWarehouseLoc] = useState('')
  const [showThermalLabel, setShowThermalLabel] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadOrder = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError('')
    try {
      const data = await orderApi.lookup(orderId)
      const next = data.order || data
      setOrder(next)
      setStatus(next.status || 'placed')
      setWarehouseLoc(next.warehouseLocation || 'supplier_warehouse')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load order.'))
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (open && orderId) {
      loadOrder()
    }
    if (!open) {
      setOrder(null)
      setError('')
      setStatus('')
      setWarehouseLoc('')
    }
  }, [open, orderId, loadOrder])

  const handleStatusUpdate = async () => {
    if (!order?.id || !status) return
    setSaving(true)
    setError('')
    try {
      let next
      if (status !== order.status) {
        const data = await orderApi.updateStatus(order.id, status)
        next = data.order || data
      }
      if (warehouseLoc && warehouseLoc !== order.warehouseLocation) {
        const trackData = await orderApi.updateTracking(order.id, {
          warehouseLocation: warehouseLoc,
          trackingStatus:
            warehouseLoc === 'delivered'
              ? 'delivered'
              : warehouseLoc === 'in_transit'
                ? 'in_transit'
                : status === 'in_process'
                  ? 'processing'
                  : 'placed',
          note: `Location updated to ${warehouseLoc === 'wms_hub' ? 'WMS Central Hub' : warehouseLoc === 'supplier_warehouse' ? 'Supplier Warehouse' : warehouseLoc}`,
        })
        next = trackData.order || trackData
      }
      if (next) {
        setOrder(next)
        setStatus(next.status || status)
        setWarehouseLoc(next.warehouseLocation || warehouseLoc)
        onUpdated?.(next)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update order status or location.'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const shipping = order?.shippingAddress

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close order panel"
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {order?.orderNo || (loading ? 'Loading…' : 'Order')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          {loading && !order ? (
            <p className="text-sm text-slate-500">Loading order…</p>
          ) : order ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(order.status)}>{order.statusLabel || order.status}</Badge>
                  <span className="text-sm text-slate-500">{order.date}</span>
                </div>
                {order.orderLabelRef && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    Label: {order.orderLabelRef}
                  </span>
                )}
              </div>

              {/* Warehouse Custody Banner */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2.5">
                  {order.warehouseLocation === 'wms_hub' ? (
                    <Warehouse className="h-5 w-5 text-amber-600" />
                  ) : (
                    <Building2 className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Warehouse Custody
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {order.warehouseLocationLabel ||
                        (order.warehouseLocation === 'wms_hub'
                          ? 'At WMS Central Hub'
                          : order.warehouseLocation === 'in_transit'
                            ? 'In Courier Transit'
                            : order.warehouseLocation === 'delivered'
                              ? 'Delivered to Customer'
                              : 'At Supplier Warehouse')}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs ${
                    order.warehouseLocation === 'wms_hub'
                      ? 'border border-amber-200 bg-amber-50 text-amber-800'
                      : 'border border-blue-200 bg-blue-50 text-blue-800'
                  }`}
                >
                  {order.warehouseLocation === 'wms_hub' ? 'WMS Fulfilled' : 'Supplier Direct'}
                </span>
              </div>

              {/* User ID & Supplier ID Info */}
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User / Buyer</dt>
                  <dd className="mt-1">
                    <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs font-bold text-indigo-700">
                      {order.userDisplayId || (order.userId ? `USR-${order.userId.slice(-6).toUpperCase()}` : '—')}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{order.user}</p>
                    {order.userEmail ? <p className="text-xs text-slate-500">{order.userEmail}</p> : null}
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier / Vendor</dt>
                  <dd className="mt-1">
                    <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-800">
                      {order.supplierDisplayId || (order.supplierId ? `SUP-${order.supplierId.slice(-6).toUpperCase()}` : '—')}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{order.supplier}</p>
                    {order.supplierEmail ? <p className="text-xs text-slate-500">{order.supplierEmail}</p> : null}
                  </dd>
                </div>
              </dl>

              {/* Product Specifications */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Product</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{order.product}</p>
                {order.productSku ? (
                  <p className="mt-0.5 font-mono text-xs font-semibold text-indigo-700">SKU: {order.productSku}</p>
                ) : null}
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Qty</p>
                    <p className="font-medium text-slate-700">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Unit</p>
                    <p className="font-medium text-slate-700">${Number(order.unitPrice || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="font-medium text-slate-700">${Number(order.total || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Commission</p>
                    <p className="font-medium text-slate-700">${Number(order.commission || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Payout</p>
                    <p className="font-medium capitalize text-slate-700">{order.payoutStatus || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Mandatory Shipping & Packaging Label Specification Box */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/25 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-indigo-600" />
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-950">
                      Shipping & Packaging Label
                    </p>
                  </div>
                  <span className="rounded border border-indigo-200 bg-white px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
                    Ref: {order.orderLabelRef || order.orderNo}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    <span className="block text-[11px] text-slate-400">Merchant / Brand:</span>
                    <strong className="text-slate-900">{order.brandLabel || 'Sellvro Merchant'}</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Item SKU:</span>
                    <strong className="font-mono text-indigo-800">{order.productSku || '—'}</strong>
                  </div>
                  <div className="col-span-2 border-t border-indigo-100/60 pt-1.5">
                    <span className="block text-[11px] text-slate-400">Packaging / Handling Notes:</span>
                    <span className="text-slate-800">{order.labelNotes || 'Standard handling instructions'}</span>
                  </div>
                  {order.shippingLabelUrl ? (
                    <div className="col-span-2 flex items-center justify-between border-t border-indigo-100/60 pt-1.5">
                      <span className="text-[11px] text-slate-400">External Shipping Label PDF:</span>
                      <a
                        href={mediaUrl(order.shippingLabelUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Open Airway Bill <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : null}

                  <div className="col-span-2 border-t border-indigo-100/60 pt-2.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowThermalLabel((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {showThermalLabel ? 'Hide Thermal Label' : 'View & Print Thermal Label'}
                    </button>
                    {showThermalLabel && (
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600"
                      >
                        Print 4x6 Label
                      </button>
                    )}
                  </div>

                  {showThermalLabel && (
                    <div className="col-span-2 mt-3 rounded-lg border-2 border-dashed border-slate-800 bg-white p-3 font-mono text-slate-900 shadow-sm">
                      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
                        <div>
                          <h4 className="text-sm font-black tracking-tight">SELLVRO AIR EXPRESS</h4>
                          <p className="text-[9px] text-slate-600">STANDARD 4x6 INCH DROPSHIP LABEL</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black uppercase text-indigo-700">
                            {order.warehouseLocation === 'wms_hub' ? '🏢 WMS HUB' : '🏭 SUPPLIER'}
                          </p>
                          <p className="text-[9px] text-slate-500">REF: {order.orderLabelRef || order.orderNo}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-b-2 border-slate-800 py-2 text-[11px]">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">ORIGIN / CUSTODY:</p>
                          <p className="font-bold">
                            {order.warehouseLocation === 'wms_hub' ? 'Sellvro WMS Central Hub' : 'Supplier Facility Direct'}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            Supplier: {order.supplierDisplayId || (order.supplierId ? `SUP-${order.supplierId.slice(-6).toUpperCase()}` : '—')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">SHIP TO (DESTINATION):</p>
                          <p className="font-bold">{shipping?.fullName || order.user}</p>
                          <p className="text-[10px] text-slate-700">{shipping?.addressLine || '—'}</p>
                          <p className="text-[10px] text-slate-700">
                            {shipping?.city ? `${shipping.city}, ` : ''}{shipping?.state} {shipping?.postalCode}
                          </p>
                          <p className="text-[9px] text-slate-500">{shipping?.country || '—'} · Ph: {shipping?.phone || '—'}</p>
                        </div>
                      </div>

                      <div className="py-2 text-[11px]">
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <span className="text-[9px] text-slate-400 block">SKU:</span>
                            <strong className="text-indigo-800">{order.productSku || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">QTY:</span>
                            <strong>{order.quantity || 1} PCS</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">BRAND:</span>
                            <strong className="truncate block">{order.brandLabel || 'Merchant Store'}</strong>
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-slate-800 truncate">
                          Item: {order.product}
                        </p>
                        {order.labelNotes && (
                          <p className="text-[9px] italic text-slate-600 mt-0.5">Note: {order.labelNotes}</p>
                        )}
                      </div>

                      <div className="border-t-2 border-slate-800 pt-2 text-center">
                        <div className="flex h-8 items-center justify-center gap-[2px] bg-slate-50 px-2 py-0.5">
                          <span className="h-full w-1 bg-black"></span>
                          <span className="h-full w-0.5 bg-black"></span>
                          <span className="h-full w-1.5 bg-black"></span>
                          <span className="h-full w-0.5 bg-black"></span>
                          <span className="h-full w-1 bg-black"></span>
                          <span className="h-full w-2 bg-black"></span>
                          <span className="h-full w-0.5 bg-black"></span>
                          <span className="h-full w-1 bg-black"></span>
                          <span className="h-full w-0.5 bg-black"></span>
                          <span className="h-full w-1.5 bg-black"></span>
                          <span className="h-full w-1 bg-black"></span>
                          <span className="h-full w-2 bg-black"></span>
                          <span className="h-full w-0.5 bg-black"></span>
                          <span className="h-full w-1.5 bg-black"></span>
                        </div>
                        <p className="mt-0.5 text-[8px] tracking-widest text-slate-600">
                          *{order.trackingNumber || `SLV-${order.orderNo}`}*
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Parcel Tracking */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900">
                    Live Parcel Tracking
                  </p>
                  <span className="rounded border border-indigo-200 bg-white px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
                    {order.trackingNumber || `SLV-${order.orderNo?.replace('ORD-', '')}`}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    <span className="block text-[11px] text-slate-400">Carrier:</span>
                    <strong className="text-slate-900">{order.carrier || 'Sellvro Express'}</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Dispatch Status:</span>
                    <strong className="capitalize text-indigo-700">{order.trackingStatus || order.status}</strong>
                  </div>
                  <div className="col-span-2 border-t border-indigo-100/50 pt-1">
                    <span className="block text-[11px] text-slate-400">Est. Delivery:</span>
                    <span className="font-medium text-slate-800">{order.estimatedDelivery || '3 - 5 Business Days'}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Shipping address
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                  {hasShippingAddress(shipping) ? formatShippingAddress(shipping) : 'No address on file'}
                </p>
              </div>

              {/* Admin / Supplier Status & Custody Location Updater */}
              {showStatusUpdate && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Update Status & Warehouse Custody
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Order Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      >
                        {ORDER_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Warehouse Custody</label>
                      <select
                        value={warehouseLoc}
                        onChange={(e) => setWarehouseLoc(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      >
                        <option value="supplier_warehouse">🏭 At Supplier Warehouse</option>
                        <option value="wms_hub">🏢 At WMS Central Hub</option>
                        <option value="in_transit">🚚 In Courier Transit</option>
                        <option value="delivered">✅ Delivered to Customer</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    fullWidth
                    disabled={saving || (status === order.status && warehouseLoc === order.warehouseLocation)}
                    onClick={handleStatusUpdate}
                  >
                    {saving ? 'Updating…' : 'Save Status & Custody Location'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            !loading && <p className="text-sm text-slate-500">Order not found.</p>
          )}
        </div>
      </aside>
    </div>
  )
}

export default OrderDetailDrawer
