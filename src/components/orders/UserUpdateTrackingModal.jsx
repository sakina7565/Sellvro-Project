import { useState } from 'react'
import { AlertCircle, CheckCircle2, Truck, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { POPULAR_COURIERS, validateCarrierTracking } from '../../lib/courierHelpers.js'
import { getErrorMessage, orderApi } from '../../lib/api.js'

export default function UserUpdateTrackingModal({
  order,
  open,
  onClose,
  onSuccess,
}) {
  const [carrier, setCarrier] = useState(() => order?.carrier || 'FedEx')
  const [trackingNumber, setTrackingNumber] = useState(() => (order?.trackingNumber && !order.trackingNumber.startsWith('SLV-') ? order.trackingNumber : ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open || !order) return null

  const activeCourier = POPULAR_COURIERS.find(
    (c) => c.name.toLowerCase() === carrier.toLowerCase() || c.id === carrier.toLowerCase(),
  ) || POPULAR_COURIERS[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanTracking = trackingNumber.trim()
    if (!cleanTracking) {
      setError('Courier tracking number is required.')
      return
    }

    const check = validateCarrierTracking(activeCourier.name, cleanTracking)
    if (!check.valid) {
      setError(check.message)
      return
    }

    setLoading(true)
    try {
      const res = await orderApi.updateUserTracking(order.id, {
        carrier: activeCourier.name,
        trackingNumber: cleanTracking,
      })
      onSuccess?.(res.message || 'Courier tracking updated successfully.')
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update courier tracking.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs shadow-inner">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Courier Tracking Number</h3>
              <p className="text-xs text-blue-100 font-mono">
                Order #{order.orderNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-blue-100 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Carrier Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Courier Partner
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POPULAR_COURIERS.map((c) => {
                const isSelected = carrier.toLowerCase() === c.name.toLowerCase() || carrier.toLowerCase() === c.id.toLowerCase()
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCarrier(c.name)}
                    className={`rounded-lg border px-3 py-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold">{c.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{c.transitEstimate}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tracking Number Input */}
          <div>
            <label htmlFor="modalTrackingInput" className="block text-xs font-bold text-slate-700 mb-1">
              Real Courier Tracking Number (Airway Bill #)
            </label>
            <input
              id="modalTrackingInput"
              required
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value)
                setError('')
              }}
              placeholder={activeCourier.placeholder}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Hint: {activeCourier.hint}
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
            ℹ️ <strong>Warehouse & Portal Sync:</strong> Yeh real tracking code save hote hi Warehouse (WMS), Admin Panel, aur Supplier Portal par live update ho jayega. Fake/dummy tracking numbers allow nahi hain.
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              tone="primary"
              size="sm"
              loading={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save & Sync Tracking
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

