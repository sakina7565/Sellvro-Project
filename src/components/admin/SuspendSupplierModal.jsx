import { useState } from 'react'
import { AlertOctagon, CheckCircle2, ShieldAlert, X, Mail, AlertTriangle } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

export default function SuspendSupplierModal({ supplier, open, onClose, onSuccess }) {
  const currentWarnings = supplier?.warningsCount || 0
  const isEligible = currentWarnings >= 3

  const [reason, setReason] = useState(
    isEligible
      ? `Account suspended due to persistent low ratings, delivery delays, and exceeding the maximum threshold of 3 performance warnings.`
      : `Account suspended due to quality violations.`,
  )
  const [forceOverride, setForceOverride] = useState(isEligible)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !supplier) return null

  const ratingAvg = supplier.ratings?.averageRating || 0
  const onTimePct = supplier.ratings?.onTimeDeliveryPercent ?? 100

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isEligible && !forceOverride) {
      setError('Please acknowledge the override checkbox if suspending before 3 warnings.')
      return
    }

    setSubmitting(true)
    try {
      const res = await adminApi.suspendSupplier(supplier.id, {
        reason: reason.trim(),
        forceOverride: !isEligible ? forceOverride : true,
      })
      if (onSuccess) {
        onSuccess(res)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to suspend supplier.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-rose-300 bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-300">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
            Account Suspension Enforcement
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Suspend Supplier: {supplier.fullName}
          </h2>
          <p className="text-xs text-slate-500">
            Supplier ki marketplace access suspend karein. Products deactivate ho jayengi aur suspension email send hogi.
          </p>
        </div>

        {/* 3 Warnings Policy Validation Banner */}
        {isEligible ? (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-rose-900 block font-bold">
                ✓ 3 Warnings Threshold Exceeded ({currentWarnings} warnings)
              </strong>
              <span className="text-rose-700 leading-snug">
                Is supplier ko 3 ya us se ziyada warnings issue ki ja chuki hain. Policy ke mutabiq ye supplier suspension ke liye fully eligible hai.
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-amber-900 block font-bold">
                Policy Notice: Current Warnings {currentWarnings} / 3
              </strong>
              <span className="text-amber-800 leading-snug">
                Standard rule ke mutabiq supplier ko suspend karne se pehle 3 warnings di jati hain. Agar aap emergency ya severe fraud ki wajah se suspend karna chahte hain to neechay override confirm karein.
              </span>
            </div>
          </div>
        )}

        {/* Performance Snapshot */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Avg Rating</span>
            <strong className={`text-sm ${ratingAvg < 3 && ratingAvg > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {ratingAvg > 0 ? `${ratingAvg.toFixed(1)} ★` : 'No reviews'}
            </strong>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">On-Time SLA</span>
            <strong className={`text-sm ${onTimePct < 70 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {onTimePct}%
            </strong>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Warnings</span>
            <strong className="text-sm text-rose-600">
              {currentWarnings} of 3
            </strong>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Official Reason for Suspension:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reason for suspension (included in vendor email)..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              required
            />
          </div>

          {/* If under 3 warnings, require explicit override */}
          {!isEligible && (
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={forceOverride}
                onChange={(e) => setForceOverride(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                <strong>Acknowledge Override:</strong> I confirm suspending this supplier before completing all 3 standard warning levels due to urgent compliance or quality reasons.
              </span>
            </label>
          )}

          {/* Email Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-600">
            <Mail className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              Official suspension notice email will be sent to: <strong className="text-slate-800">{supplier.email}</strong>
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || (!isEligible && !forceOverride)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {submitting ? 'Suspending Supplier...' : 'Confirm Suspension & Send Email'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
