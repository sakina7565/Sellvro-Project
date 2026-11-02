import { useState } from 'react'
import { CheckCircle2, ChevronDown, PackageCheck, Sparkles, Truck, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { POPULAR_COURIERS, generateAutomatedTrackingId } from '../../lib/courierHelpers.js'
import { getErrorMessage, orderApi } from '../../lib/api.js'

export default function CourierHandoverModal({
  order,
  open,
  onClose,
  onSuccess,
}) {
  const [carrier, setCarrier] = useState('TCS Express')
  const [customCarrier, setCustomCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('2 - 3 Business Days')
  const [dispatchNote, setDispatchNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open || !order) return null

  const isCustom = carrier === 'other'
  const effectiveCarrier = isCustom ? customCarrier.trim() || 'Courier Company' : carrier

  const handleGenerateTracking = () => {
    const generated = generateAutomatedTrackingId(effectiveCarrier, order.orderNo)
    setTrackingNumber(generated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!effectiveCarrier) {
      setError('Please select or specify a courier company.')
      return
    }

    setLoading(true)
    try {
      let finalTracking = trackingNumber.trim()
      if (!finalTracking) {
        finalTracking = generateAutomatedTrackingId(effectiveCarrier, order.orderNo)
      }

      const payload = {
        isHandover: true,
        isDispatched: true,
        trackingStatus: 'in_transit',
        warehouseLocation: 'in_transit',
        warehouseLocationLabel: 'In Courier Transit',
        carrier: effectiveCarrier,
        trackingNumber: finalTracking,
        estimatedDelivery: estimatedDelivery.trim() || '2 - 4 Business Days',
        note: dispatchNote.trim() || `Order handed over to ${effectiveCarrier} for customer delivery. Tracking ID: ${finalTracking}.`,
        location: order.warehouseLocation === 'wms_hub' ? 'Sellvro Central WMS Hub' : 'Supplier Dispatch Facility',
      }

      const res = await orderApi.updateTracking(order.id, payload)
      const updatedOrder = res.order || res
      onSuccess?.(updatedOrder)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to handover order to courier.'))
    } finally {
      setLoading(false)
    }
  }

  const shipping = order.shippingAddress || {}

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
              <h3 className="text-base font-bold text-white">Handover to Courier Company</h3>
              <p className="text-xs text-blue-100">
                Order <strong className="font-mono text-white">{order.orderNo}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-blue-100 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Destination Brief Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs text-slate-700">
            <div className="flex items-center justify-between font-semibold text-slate-900 pb-2 border-b border-slate-200/60">
              <span>Recipient: {shipping.fullName || order.user || 'Customer'}</span>
              <span className="font-mono text-indigo-700">
                {shipping.city ? `${shipping.city}, ` : ''}{shipping.country || 'PK'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-slate-600">
              <span className="truncate max-w-[260px]">Product: <strong>{order.product}</strong></span>
              <span>Qty: <strong>{order.quantity || 1}</strong></span>
            </div>
            {order.orderLabelRef && (
              <div className="mt-1 font-mono text-[11px] text-slate-500">
                Packaging Label Ref: <strong>{order.orderLabelRef}</strong>
              </div>
            )}
          </div>

          {/* Courier Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Courier Company <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {POPULAR_COURIERS.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.region})
                  </option>
                ))}
                <option value="other">➕ Custom / Other Courier Company</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Custom Courier Name Input */}
          {isCustom && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Enter Custom Courier Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customCarrier}
                onChange={(e) => setCustomCarrier(e.target.value)}
                placeholder="e.g., PostEx Express, OCS, M&P, Rider Express"
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {/* Tracking Number Input + Auto-Generate Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Courier Tracking Number / CN #
              </label>
              <button
                type="button"
                onClick={handleGenerateTracking}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
              >
                <Sparkles className="h-3 w-3" />
                Auto-Generate ID
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={`e.g. ${effectiveCarrier.includes('TCS') ? 'TCS-984029182' : effectiveCarrier.includes('Leopard') ? 'LEO-382910482' : 'TRK-98402918'}`}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm font-semibold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleGenerateTracking}
                className="absolute right-2 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                title="Generate an automated carrier tracking code"
              >
                Auto Generate
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Enter the receipt CN number provided by the courier, or click &ldquo;Auto Generate&rdquo; to assign a unique tracking number automatically.
            </p>
          </div>

          {/* Estimated Delivery Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Estimated Delivery
              </label>
              <select
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="1 - 2 Business Days">1 - 2 Business Days (Express)</option>
                <option value="2 - 3 Business Days">2 - 3 Business Days (Standard)</option>
                <option value="3 - 5 Business Days">3 - 5 Business Days</option>
                <option value="5 - 7 Business Days">5 - 7 Business Days (Economy)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Origin Custody
              </label>
              <div className="h-10 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700">
                {order.warehouseLocation === 'wms_hub' ? '🏢 Sellvro WMS Central Hub' : '🏭 Supplier Direct Warehouse'}
              </div>
            </div>
          </div>

          {/* Handover Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Courier Handover Note / Franchise (Optional)
            </label>
            <input
              type="text"
              value={dispatchNote}
              onChange={(e) => setDispatchNote(e.target.value)}
              placeholder="e.g. Handed over to courier pickup rider / Gulberg express center"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Automated Buyer Notification Notice */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong>Automated Buyer Alert:</strong> As soon as you confirm this handover, the buyer will automatically receive a distinct live Tracking ID, courier details, and real-time tracking link.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
            >
              {loading ? (
                'Dispatching…'
              ) : (
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4" />
                  Confirm Handover & Dispatch
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
