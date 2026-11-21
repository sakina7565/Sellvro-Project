import { useState, useMemo } from 'react'
import { AlertCircle, Ban, Clock, ShieldAlert, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { getErrorMessage, orderApi } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function UserCancelOrderModal({
  order,
  open,
  onClose,
  onSuccess,
}) {
  const { user, updateUser } = useAuth()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 12-Hour Cancellation Window calculation (runs before the early return so hook order never changes)
  const { isExpired, hoursElapsed, hoursRemaining, minutesRemaining } = useMemo(() => {
    if (!order?.createdAt) return { isExpired: false, hoursElapsed: 0, hoursRemaining: 12, minutesRemaining: 0 }
    const orderTime = new Date(order.createdAt).getTime()
    const diffMs = Date.now() - orderTime
    const totalMinutesElapsed = Math.floor(diffMs / (1000 * 60))
    const totalMinutesLimit = 12 * 60 // 720 minutes
    const isPast12h = totalMinutesElapsed >= totalMinutesLimit
    const remainingMins = Math.max(0, totalMinutesLimit - totalMinutesElapsed)
    const remHours = Math.floor(remainingMins / 60)
    const remMins = remainingMins % 60
    return {
      isExpired: isPast12h,
      hoursElapsed: (diffMs / (1000 * 60 * 60)).toFixed(1),
      hoursRemaining: remHours,
      minutesRemaining: remMins,
    }
  }, [order?.createdAt])

  if (!open || !order) return null

  const handleCancel = async () => {
    setError('')
    const trimmedReason = reason.trim()
    if (!trimmedReason || trimmedReason.length < 5) {
      setError('Please provide a valid cancellation reason (minimum 5 characters).')
      return
    }

    if (isExpired) {
      setError('The strict 12-hour cancellation window has expired. This order cannot be cancelled.')
      return
    }

    setLoading(true)
    try {
      const res = await orderApi.requestCancel(order.id, trimmedReason)
      if (typeof res.walletBalance === 'number' && user) {
        updateUser({ ...user, walletBalance: res.walletBalance })
      }
      onSuccess?.(res.message || 'Cancellation request submitted and sent to admin for approval.')
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit cancellation request.'))
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = Number(order.total || 0).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-6 py-4 text-rose-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Request Order Cancellation</h3>
              <p className="text-xs text-slate-500 font-mono font-bold">#{order.orderNo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 12-Hour Policy Status Banner */}
          <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${isExpired ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-amber-300 bg-amber-50/80 text-amber-900'}`}>
            <Clock className={`h-4 w-4 shrink-0 mt-0.5 ${isExpired ? 'text-rose-600' : 'text-amber-600'}`} />
            <div className="text-xs">
              <div className="font-bold flex items-center justify-between">
                <span>Strict 12-Hour Cancellation Policy</span>
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${isExpired ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                  {isExpired ? 'Window Closed' : `${hoursRemaining}h ${minutesRemaining}m remaining`}
                </span>
              </div>
              <p className="mt-1 leading-relaxed text-slate-600">
                {isExpired
                  ? `Placed ${hoursElapsed}h ago. Orders can only be cancelled within 12 hours of placement to protect suppliers from dispatch losses.`
                  : 'Order cancellations must be approved by the platform administrator within 12 hours of placement.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Product:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{order.productName || order.product}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Custody:</span>
              <span className="font-medium text-slate-700">{order.warehouseLocationLabel || 'At Warehouse'}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Refund upon Admin Approval:</span>
              <span className="text-base font-black text-emerald-600">${totalAmount}</span>
            </div>
          </div>

          <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your cancellation request will be submitted to Admin for authenticity review. Upon approval within the 12-hour window, 100% refund of <strong>${totalAmount}</strong> will be automatically credited to your wallet.
            </p>
          </div>

          <div>
            <label htmlFor="cancelReason" className="block text-xs font-bold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-600">* (Mandatory)</span>
            </label>
            <textarea
              id="cancelReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need to cancel this order (e.g. ordered incorrect size, changed mind, wrong address)..."
              disabled={isExpired}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:opacity-50"
            />
            <p className="mt-1 text-[11px] text-slate-400">Admin reviews the cancellation reason before approval.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Keep Order
          </Button>
          <Button
            type="button"
            tone="danger"
            size="sm"
            onClick={handleCancel}
            disabled={isExpired || loading}
            loading={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
          >
            Submit Cancellation Request
          </Button>
        </div>
      </div>
    </div>
  )
}

