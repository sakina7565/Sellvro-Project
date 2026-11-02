import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Star, Truck, X, Mail } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

const PRESET_REASONS = [
  'Poor Product Quality & Bad Customer Ratings',
  'Severe Delivery Delays (Low On-Time Delivery %)',
  'Defective / Damaged / Mismatched Items Delivered',
  'High Order Dispute Rate & Negative Buyer Feedback',
  'Failure to Dispatch within Promised SLA',
]

export default function WarnSupplierModal({ supplier, open, onClose, onSuccess }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !supplier) return null

  const currentWarnings = supplier.warningsCount || 0
  const nextWarningNumber = currentWarnings + 1
  const isFinalWarning = nextWarningNumber === 3
  const isExceeded = nextWarningNumber > 3

  const ratingAvg = supplier.ratings?.averageRating || 0
  const onTimePct = supplier.ratings?.onTimeDeliveryPercent ?? 100
  const reviewsCount = supplier.ratings?.reviewsCount || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const finalReason = selectedPreset === 'custom' ? customReason.trim() : selectedPreset
    if (!finalReason) {
      setError('Please select or specify a reason for the warning.')
      return
    }

    setSubmitting(true)
    try {
      const res = await adminApi.warnSupplier(supplier.id, {
        reason: finalReason,
        details: details.trim(),
      })
      if (onSuccess) {
        onSuccess(res)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to issue warning.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl transition-all">
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
              Vendor Performance Warning
            </span>
            <span className="text-xs font-bold text-rose-600">
              Warning #{nextWarningNumber} of 3
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Issue Formal Warning to {supplier.fullName}
          </h2>
          <p className="text-xs text-slate-500">
            Bad ratings aur delivery delays par supplier ko formal warning issue karein. Supplier ko official email bhi dispatch hogi.
          </p>
        </div>

        {/* Warning Step Progress Bar */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Warning Escalation Level:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => {
              const isPast = num < nextWarningNumber
              const isCurrent = num === nextWarningNumber
              return (
                <div
                  key={num}
                  className={`flex flex-col items-center justify-center rounded-lg p-2 border text-center transition-all ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold ring-2 ring-amber-400/30'
                      : isPast
                      ? 'border-slate-300 bg-slate-200/70 text-slate-600 font-semibold'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">Step {num}</span>
                  <span className="text-xs">
                    {num === 3 ? 'Final Warning' : `Warning #${num}`}
                  </span>
                </div>
              )
            })}
          </div>

          {isFinalWarning && (
            <p className="mt-2.5 text-[11px] font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              ⚠️ Note: Ye supplier ki 3rd aur FINAL warning hai. 3 warnings ke baad admin supplier ko suspend kar sakta hai.
            </p>
          )}

          {isExceeded && (
            <p className="mt-2.5 text-[11px] font-bold text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">
              🚨 Alert: Supplier pehle hi 3 warnings receive kar chuka hai. Aap is supplier ko ab direct Suspend kar sakte hain.
            </p>
          )}
        </div>

        {/* Supplier Performance Snapshot */}
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center">
          <div className="rounded-lg bg-white p-2 border border-slate-100 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Rating</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span className={`text-sm font-black ${ratingAvg < 3 && ratingAvg > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {ratingAvg > 0 ? ratingAvg.toFixed(1) : 'New'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">({reviewsCount} reviews)</span>
          </div>

          <div className="rounded-lg bg-white p-2 border border-slate-100 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-slate-400">On-Time</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              <span className={`text-sm font-black ${onTimePct < 70 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {onTimePct}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Delivery SLA</span>
          </div>

          <div className="rounded-lg bg-white p-2 border border-slate-100 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Warnings</span>
            <span className="text-sm font-black text-rose-600 mt-0.5 block">
              {currentWarnings} / 3
            </span>
            <span className="text-[10px] text-slate-400">Issued so far</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preset Reason Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Warning Reason:
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {PRESET_REASONS.map((preset) => (
                <label
                  key={preset}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer transition-all ${
                    selectedPreset === preset
                      ? 'border-amber-500 bg-amber-50/80 font-bold text-amber-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reasonPreset"
                    checked={selectedPreset === preset}
                    onChange={() => setSelectedPreset(preset)}
                    className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{preset}</span>
                </label>
              ))}

              <label
                className={`flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer transition-all ${
                  selectedPreset === 'custom'
                    ? 'border-amber-500 bg-amber-50/80 font-bold text-amber-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reasonPreset"
                  checked={selectedPreset === 'custom'}
                  onChange={() => setSelectedPreset('custom')}
                  className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                />
                <span>Custom Specific Reason...</span>
              </label>
            </div>
          </div>

          {selectedPreset === 'custom' && (
            <div>
              <input
                type="text"
                placeholder="Enter custom warning reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                required
              />
            </div>
          )}

          {/* Details / Admin Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Additional Details / Guidance for Supplier (Optional):
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Please expedite dispatch within 24h and inspect package seals before shipping."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* Email Notification Alert Pill */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-600">
            <Mail className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              Official warning email will be automatically sent to: <strong className="text-slate-800">{supplier.email}</strong>
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
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {submitting ? 'Sending Warning...' : `Issue Warning #${nextWarningNumber}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
