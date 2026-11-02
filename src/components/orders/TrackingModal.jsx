import { useState } from 'react'
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Truck,
  Warehouse,
  X,
} from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import {
  getCourierExternalTrackingUrl,
  getTrackingProgressPercent,
  TRACKING_STAGES,
} from '../../lib/courierHelpers.js'

export default function TrackingModal({ order, open, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!open || !order) return null

  const trackingNumber = order.trackingNumber || `SLV-${order.orderNo?.replace('ORD-', '') || 'PENDING'}`
  const carrier = order.carrier || 'Sellvro Express'
  const trackingStatus = (order.trackingStatus || order.status || 'placed').toLowerCase()
  const progressPercent = getTrackingProgressPercent(trackingStatus)
  const externalTrackingUrl = getCourierExternalTrackingUrl(carrier, trackingNumber)
  const shipping = order.shippingAddress || {}

  const handleCopy = () => {
    navigator.clipboard?.writeText(trackingNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const timeline = Array.isArray(order.trackingTimeline) && order.trackingTimeline.length > 0
    ? [...order.trackingTimeline].reverse()
    : [
        {
          status: 'placed',
          title: 'Order Placed & Registered',
          location: order.warehouseLocationLabel || 'Fulfillment Facility',
          timestamp: order.createdAt || new Date(),
          note: 'Order confirmed and registered in shipping system.',
        },
      ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-white/10 shadow-inner">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Live Parcel Tracking</h3>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 capitalize">
                  {trackingStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Order <strong className="font-mono text-white">{order.orderNo}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Tracking ID & Carrier Card */}
          <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/50 via-white to-blue-50/40 p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Courier Tracking ID
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-lg font-black text-slate-900 tracking-tight">
                    {trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Courier Partner
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-900">
                    🚚 {carrier}
                  </span>
                  {externalTrackingUrl && (
                    <a
                      href={externalTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition"
                      title="Open official carrier tracking portal"
                    >
                      Track on Courier Site <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="mt-4 pt-3 border-t border-indigo-100/70 flex flex-col items-center justify-center">
              <div className="flex h-7 items-center justify-center gap-[2px] bg-white px-4 py-1 rounded border border-slate-200 shadow-2xs">
                <span className="h-full w-1 bg-slate-900"></span>
                <span className="h-full w-0.5 bg-slate-900"></span>
                <span className="h-full w-1.5 bg-slate-900"></span>
                <span className="h-full w-0.5 bg-slate-900"></span>
                <span className="h-full w-1 bg-slate-900"></span>
                <span className="h-full w-2 bg-slate-900"></span>
                <span className="h-full w-0.5 bg-slate-900"></span>
                <span className="h-full w-1.5 bg-slate-900"></span>
                <span className="h-full w-0.5 bg-slate-900"></span>
                <span className="h-full w-1 bg-slate-900"></span>
                <span className="h-full w-2 bg-slate-900"></span>
                <span className="h-full w-0.5 bg-slate-900"></span>
                <span className="h-full w-1.5 bg-slate-900"></span>
                <span className="h-full w-1 bg-slate-900"></span>
              </div>
              <span className="mt-1 font-mono text-[10px] tracking-widest text-slate-500">
                *{trackingNumber}*
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-500">
                Shipment Progress
              </span>
              <span className="font-bold text-blue-600">{progressPercent}% Completed</span>
            </div>

            {/* Progress line */}
            <div className="relative mb-6">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Step dots */}
              <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                {TRACKING_STAGES.map((stage, idx) => {
                  const isDone =
                    (stage.key === 'placed') ||
                    (stage.key === 'processing' && progressPercent >= 25) ||
                    (stage.key === 'in_transit' && progressPercent >= 50) ||
                    (stage.key === 'out_for_delivery' && progressPercent >= 75) ||
                    (stage.key === 'delivered' && progressPercent === 100)

                  const isCurrent =
                    (stage.key === 'placed' && progressPercent < 25) ||
                    (stage.key === 'processing' && progressPercent === 25) ||
                    (stage.key === 'in_transit' && progressPercent === 50) ||
                    (stage.key === 'out_for_delivery' && progressPercent === 75) ||
                    (stage.key === 'delivered' && progressPercent === 100)

                  return (
                    <div key={stage.key} className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-2xs transition ${
                          isDone
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`mt-1.5 text-[10px] font-semibold leading-tight ${
                          isDone ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Origin & Destination Route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
                {order.warehouseLocation === 'wms_hub' ? (
                  <Warehouse className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Origin Custody
                  </span>
                  <strong className="text-slate-800">
                    {order.warehouseLocationLabel || (order.warehouseLocation === 'wms_hub' ? 'Sellvro Central WMS Hub' : 'Supplier Direct Warehouse')}
                  </strong>
                  <p className="text-[11px] text-slate-500">
                    {order.warehouseLocation === 'wms_hub' ? 'Fast-track 3PL warehouse fulfillment' : `Supplier: ${order.supplier || 'Vendor'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Destination Address
                  </span>
                  <strong className="text-slate-800">
                    {shipping.fullName || order.user} · {shipping.city || 'City'}, {shipping.country || 'PK'}
                  </strong>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {shipping.addressLine || 'Address on file'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Event Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Detailed Timeline & Milestones
            </h4>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((event, index) => {
                const isLatest = index === 0
                return (
                  <div key={index} className="relative group">
                    {/* Dot */}
                    <div
                      className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 ${
                        isLatest
                          ? 'border-blue-600 bg-white ring-4 ring-blue-100'
                          : 'border-slate-300 bg-white'
                      }`}
                    />

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs transition group-hover:border-slate-300">
                      <div className="flex flex-wrap items-baseline justify-between gap-1">
                        <h5 className="text-xs font-bold text-slate-900">
                          {event.title || 'Tracking Event'}
                        </h5>
                        <span className="text-[11px] text-slate-400">
                          {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      {event.location && (
                        <p className="mt-0.5 text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                      {event.note && (
                        <p className="mt-1 text-xs text-slate-600">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <span className="text-xs text-slate-500">
            Est. Delivery: <strong className="text-slate-800">{order.estimatedDelivery || '2 - 4 Business Days'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
