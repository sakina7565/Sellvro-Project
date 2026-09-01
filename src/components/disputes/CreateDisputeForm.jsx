import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'
import { formatPartyLabel } from '../../lib/disputeHelpers.js'
import { useAuth } from '../../context/AuthContext.jsx'

const DEFAULT_FORM = {
  message: '',
  againstRole: 'admin',
  orderRef: '',
  productId: '',
}

export default function CreateDisputeForm({
  disputeType,
  againstOptions,
  onSubmit,
  creating = false,
  onCancel,
}) {
  const { user } = useAuth()
  const [form, setForm] = useState({ ...DEFAULT_FORM, againstRole: againstOptions[0]?.value || 'admin' })
  const [orderPreview, setOrderPreview] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)

  const raiserLabel = formatPartyLabel(user?.fullName || user?.name || 'You', user?.role)

  const againstPreview = (() => {
    if (!orderPreview) {
      if (form.againstRole === 'admin' || form.againstRole === 'platform') {
        return 'Platform Admin'
      }
      return 'Select an order to auto-detect the other party'
    }

    if (user?.role === 'user') {
      if (form.againstRole === 'supplier') {
        return formatPartyLabel(orderPreview.supplier, 'supplier')
      }
      return 'Platform Admin'
    }

    if (user?.role === 'supplier') {
      if (form.againstRole === 'user') {
        return formatPartyLabel(orderPreview.user, 'user')
      }
      return 'Platform Admin'
    }

    return '—'
  })()

  const handleOrderLookup = async () => {
    const ref = form.orderRef.trim()
    if (!ref) {
      setOrderPreview(null)
      setLookupError('')
      return
    }

    setLookupLoading(true)
    setLookupError('')
    try {
      const data = await orderApi.lookup(ref)
      const order = data.order
      setOrderPreview(order)
      setForm((prev) => ({
        ...prev,
        productId: order.productId || prev.productId,
      }))
    } catch (err) {
      setOrderPreview(null)
      setLookupError(getErrorMessage(err, 'Order not found.'))
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const message = form.message.trim()
    if (!message) return

    const payload = {
      message,
      againstRole: form.againstRole,
      type: disputeType,
    }

    if (form.orderRef.trim()) {
      payload.orderId = orderPreview?.id || form.orderRef.trim()
    }
    if (form.productId.trim()) {
      payload.productId = form.productId.trim()
    }

    await onSubmit(payload)
    setForm({ ...DEFAULT_FORM, againstRole: againstOptions[0]?.value || 'admin' })
    setOrderPreview(null)
    setLookupError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Raised by</p>
        <p className="mt-1 font-semibold text-slate-800">{raiserLabel}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Order ID or Order No <span className="text-slate-400">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.orderRef}
            onChange={(event) => setForm((prev) => ({ ...prev, orderRef: event.target.value }))}
            onBlur={handleOrderLookup}
            className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="e.g. ORD-ABC123 or MongoDB ID"
          />
          <Button type="button" size="sm" variant="secondary" onClick={handleOrderLookup} disabled={lookupLoading}>
            {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
          </Button>
        </div>
        {lookupError ? <p className="mt-1 text-xs text-rose-600">{lookupError}</p> : null}
        {orderPreview ? (
          <p className="mt-1 text-xs text-emerald-600">
            Found order {orderPreview.orderNo} — {orderPreview.product}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Product ID <span className="text-slate-400">(optional)</span>
        </label>
        <input
          type="text"
          value={form.productId}
          onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          placeholder="Auto-filled from order, or enter product ID"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Complaining against</label>
        <select
          value={form.againstRole}
          onChange={(event) => setForm((prev) => ({ ...prev, againstRole: event.target.value }))}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
        >
          {againstOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="mt-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-600">Other party</p>
          <p className="mt-1 font-semibold text-primary-900">{againstPreview}</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Describe the issue</label>
        <textarea
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Explain your complaint or dispute…"
          required
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={creating}>
          {creating ? 'Submitting…' : 'Submit dispute'}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
