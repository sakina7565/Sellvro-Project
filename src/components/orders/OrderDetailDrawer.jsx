import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { getErrorMessage, orderApi } from '../../lib/api.js'
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
    }
  }, [open, orderId, loadOrder])

  const handleStatusUpdate = async () => {
    if (!order?.id || !status) return
    setSaving(true)
    setError('')
    try {
      const data = await orderApi.updateStatus(order.id, status)
      const next = data.order || data
      setOrder(next)
      setStatus(next.status || status)
      onUpdated?.(next)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update status.'))
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
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(order.status)}>{order.statusLabel || order.status}</Badge>
                <span className="text-sm text-slate-500">{order.date}</span>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Order ID">{order.id}</Field>
                <Field label="Order #">{order.orderNo}</Field>
                <Field label="Buyer">
                  {order.user}
                  {order.userEmail ? `\n${order.userEmail}` : ''}
                </Field>
                <Field label="Supplier">
                  {order.supplier}
                  {order.supplierEmail ? `\n${order.supplierEmail}` : ''}
                </Field>
              </dl>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Product</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{order.product}</p>
                {order.productSku ? (
                  <p className="mt-0.5 text-xs text-slate-500">SKU: {order.productSku}</p>
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

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Shipping address
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                  {hasShippingAddress(shipping) ? formatShippingAddress(shipping) : 'No address on file'}
                </p>
              </div>

              {showStatusUpdate && (
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Update status
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-10 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    >
                      {ORDER_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving || status === order.status}
                      onClick={handleStatusUpdate}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
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
