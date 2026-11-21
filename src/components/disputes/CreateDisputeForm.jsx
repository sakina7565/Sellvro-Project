import { useState, useMemo } from 'react'
import { AlertCircle, Ban, Clock, Loader2, ShieldAlert } from 'lucide-react'
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
  const [category, setCategory] = useState('cancellation') // 'cancellation' or 'general'
  const [orderPreview, setOrderPreview] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const raiserLabel = formatPartyLabel(user?.fullName || user?.name || 'You', user?.role)

  // 12-Hour policy calculation for orderPreview
  const { isExpired, hoursElapsed, hoursRemaining, minutesRemaining } = useMemo(() => {
    if (!orderPreview?.createdAt) return { isExpired: false, hoursElapsed: 0, hoursRemaining: 12, minutesRemaining: 0 }
    const orderTime = new Date(orderPreview.createdAt).getTime()
    const diffMs = Date.now() - orderTime
    const totalMinutesElapsed = Math.floor(diffMs / (1000 * 60))
    const totalMinutesLimit = 12 * 60
    const isPast12h = totalMinutesElapsed >= totalMinutesLimit
    const remainingMins = Math.max(0, totalMinutesLimit - totalMinutesElapsed)
    return {
      isExpired: isPast12h,
      hoursElapsed: (diffMs / (1000 * 60 * 60)).toFixed(1),
      hoursRemaining: Math.floor(remainingMins / 60),
      minutesRemaining: remainingMins % 60,
    }
  }, [orderPreview?.createdAt])

  const againstPreview = (() => {
    if (category === 'cancellation') {
      return 'Platform Admin (Review & Approval)'
    }
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
    setSubmitError('')
    try {
      const data = await orderApi.lookup(ref)
      const order = data.order || data
      setOrderPreview(order)
      setForm((prev) => ({
        ...prev,
        productId: order.productId || prev.productId,
      }))
    } catch (err) {
      setOrderPreview(null)
      setLookupError(getErrorMessage(err, 'Order not found. Please verify the Order Number / ID.'))
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const message = form.message.trim()
    if (!message) {
      setSubmitError('Please provide a detailed explanation/reason.')
      return
    }

    if (category === 'cancellation') {
      if (!form.orderRef.trim()) {
        setSubmitError('Order Number / Order ID is required for cancellation requests.')
        return
      }
      if (!orderPreview) {
        setSubmitError('Please verify the Order Number by clicking Lookup before submitting.')
        return
      }
      if (isExpired) {
        setSubmitError(`Cancellation Policy Expired: Order #${orderPreview.orderNo} was placed ${hoursElapsed} hours ago. Platform policy strictly forbids cancellations after 12 hours.`)
        return
      }
      if (message.length < 5) {
        setSubmitError('A valid cancellation reason (minimum 5 characters) is required.')
        return
      }
    }

    const payload = {
      message,
      againstRole: category === 'cancellation' ? 'admin' : form.againstRole,
      type: category === 'cancellation' ? 'order_cancellation' : (disputeType || 'supplier_dispute'),
    }

    if (form.orderRef.trim()) {
      payload.orderId = orderPreview?.id || form.orderRef.trim()
    }
    if (form.productId.trim()) {
      payload.productId = form.productId.trim()
    }

    try {
      await onSubmit(payload)
      setForm({ ...DEFAULT_FORM, againstRole: againstOptions[0]?.value || 'admin' })
      setOrderPreview(null)
      setLookupError('')
      setSubmitError('')
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to submit.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Raised by</p>
        <p className="mt-1 font-semibold text-slate-800">{raiserLabel}</p>
      </div>

      {/* Purpose / Category Selector */}
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700">Request Type / Purpose</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCategory('cancellation')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition cursor-pointer ${category === 'cancellation' ? 'border-rose-400 bg-rose-50 text-rose-800 shadow-2xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <Ban className="h-4 w-4 text-rose-600" />
            Order Cancellation Request
          </button>
          <button
            type="button"
            onClick={() => setCategory('general')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition cursor-pointer ${category === 'general' ? 'border-indigo-400 bg-indigo-50 text-indigo-800 shadow-2xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <ShieldAlert className="h-4 w-4 text-indigo-600" />
            General Dispute / Inquiry
          </button>
        </div>
      </div>

      {submitError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{submitError}</span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Order Number or Order ID {category === 'cancellation' ? <span className="text-rose-600 font-bold">* (Mandatory)</span> : <span className="text-slate-400">(optional)</span>}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.orderRef}
            onChange={(event) => setForm((prev) => ({ ...prev, orderRef: event.target.value }))}
            onBlur={handleOrderLookup}
            className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-mono uppercase"
            placeholder="e.g. 26-SV-10023 or Mongo ID"
            required={category === 'cancellation'}
          />
          <Button type="button" size="sm" variant="secondary" onClick={handleOrderLookup} disabled={lookupLoading}>
            {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
          </Button>
        </div>
        {lookupError ? <p className="mt-1 text-xs text-rose-600 font-medium">{lookupError}</p> : null}

        {orderPreview && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Order #{orderPreview.orderNo}</span>
              <span className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded font-bold ${isExpired ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                <Clock className="h-3 w-3" />
                {isExpired ? '12h Window Expired' : `${hoursRemaining}h ${minutesRemaining}m left`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200">
              <div>Product: <strong className="text-slate-800">{orderPreview.productName || orderPreview.product}</strong></div>
              <div>Total Value: <strong className="text-emerald-700">${Number(orderPreview.total || 0).toFixed(2)}</strong></div>
              <div>Customer: <strong className="text-slate-800">{orderPreview.user}</strong></div>
              <div>Tracking: <strong className="text-slate-800">{orderPreview.trackingNumber || 'Pending'}</strong></div>
            </div>
            {category === 'cancellation' && isExpired && (
              <p className="text-[11px] font-bold text-rose-700 bg-rose-100/70 p-2 rounded">
                Cancellation Blocked: Placed {hoursElapsed}h ago. Under strict 12-hour platform policy, this order cannot be cancelled.
              </p>
            )}
          </div>
        )}
      </div>

      {category === 'general' && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Product ID <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.productId}
              onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono"
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
        </>
      )}

      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700">
          {category === 'cancellation' ? 'Cancellation Reason * (Mandatory)' : 'Describe the issue *'}
        </label>
        <textarea
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
          placeholder={category === 'cancellation' ? 'Enter clear, authentic reason for cancellation (e.g. out of stock, defect found, shipping address unreachable)...' : 'Explain your complaint or dispute in detail…'}
          required
        />
        {category === 'cancellation' && (
          <p className="mt-1 text-[11px] text-slate-500">
            Admin will carefully analyze this reason along with full order details before approval.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={creating || (category === 'cancellation' && isExpired)}
          className={category === 'cancellation' ? 'bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50' : ''}
        >
          {creating ? 'Submitting…' : category === 'cancellation' ? 'Submit Cancellation Request' : 'Submit dispute'}
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
