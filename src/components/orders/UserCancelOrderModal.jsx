import { useState } from 'react'
import { AlertCircle, Ban, CheckCircle2, RotateCcw, Wallet, X } from 'lucide-react'
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

  if (!open || !order) return null

  const handleCancel = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await orderApi.cancel(order.id, reason.trim())
      if (typeof res.walletBalance === 'number' && user) {
        updateUser({ ...user, walletBalance: res.walletBalance })
      }
      onSuccess?.(res.message || 'Order successfully cancelled and refunded.')
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel order.'))
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
              <h3 className="text-base font-bold text-slate-900">Cancel Order</h3>
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
              <span className="text-xs font-bold text-slate-700">Instant Wallet Refund:</span>
              <span className="text-base font-black text-emerald-600">${totalAmount}</span>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
            <Wallet className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Order abi tak warehouse ya courier company ke pass se dispatch nahi hua hai, is liye aap isay cancel kar sakte hain. Full amount <strong>${totalAmount}</strong> foran aapke Sellvro Wallet me refund kar diya jayega.
            </p>
          </div>

          <div>
            <label htmlFor="cancelReason" className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              id="cancelReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Changed mind, wrong shipping address, duplicate order"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
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
            loading={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Confirm & Refund (${totalAmount})
          </Button>
        </div>
      </div>
    </div>
  )
}

