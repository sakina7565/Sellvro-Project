import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Search,
  Truck,
  Warehouse,
} from 'lucide-react'
import MarketplaceTopBar from '../../components/marketplace/MarketplaceTopBar.jsx'
import MarketplaceSearchHeader from '../../components/marketplace/MarketplaceSearchHeader.jsx'
import MarketplaceFooter from '../../components/marketplace/MarketplaceFooter.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'
import {
  getCourierExternalTrackingUrl,
  getTrackingProgressPercent,
  TRACKING_STAGES,
} from '../../lib/courierHelpers.js'

export default function TrackOrderPage() {
  const { trackingRef } = useParams()
  const [query, setQuery] = useState(trackingRef || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trackingData, setTrackingData] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleTrack = async (searchRef) => {
    const term = (searchRef || query || '').trim()
    if (!term) {
      setError('Please enter a Tracking ID or Order Number.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await orderApi.publicTrack(term)
      if (res?.tracking) {
        setTrackingData(res.tracking)
      } else {
        setError('No shipment found matching this reference.')
        setTrackingData(null)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Shipment not found. Please verify your tracking ID or order number.'))
      setTrackingData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (trackingRef) {
      handleTrack(trackingRef)
    }
  }, [trackingRef])

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const progressPercent = trackingData ? getTrackingProgressPercent(trackingData.trackingStatus) : 0
  const externalTrackingUrl = trackingData
    ? getCourierExternalTrackingUrl(trackingData.carrier, trackingData.trackingNumber)
    : null

  const timeline = trackingData && Array.isArray(trackingData.trackingTimeline)
    ? [...trackingData.trackingTimeline].reverse()
    : []

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <MarketplaceTopBar />
      <MarketplaceSearchHeader />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Hero Banner */}
          <div className="rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-bold text-blue-300">
                <Truck className="h-3.5 w-3.5" /> Live Parcel Tracking
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                Track Your Sellvro Order
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Enter your unique courier tracking number or order number to see real-time warehouse custody, courier handover, and delivery progress.
              </p>

              {/* Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleTrack()
                }}
                className="mt-6 flex flex-col sm:flex-row items-center gap-2"
              >
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter Tracking ID (e.g. SLV-..., TCS-..., ORD-...)"
                    className="h-12 w-full rounded-xl bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition shrink-0 disabled:opacity-50"
                >
                  {loading ? 'Tracking…' : 'Track Package'}
                </button>
              </form>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Results Box */}
          {trackingData && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Shipment for Order
                  </span>
                  <h2 className="text-xl font-black text-slate-900">{trackingData.orderNo}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Item: <strong>{trackingData.productName}</strong> (Qty: {trackingData.quantity})
                  </p>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tracking ID
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-slate-900">
                      {trackingData.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(trackingData.trackingNumber)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Carrier & Custody Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <span className="block text-[11px] font-bold uppercase text-slate-400">Courier Partner</span>
                  <p className="mt-1 font-bold text-slate-900 text-sm">🚚 {trackingData.carrier}</p>
                  {externalTrackingUrl && (
                    <a
                      href={externalTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Track on Courier Site <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <span className="block text-[11px] font-bold uppercase text-slate-400">Origin Warehouse</span>
                  <p className="mt-1 font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {trackingData.isWmsOrder ? (
                      <Warehouse className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Building2 className="h-4 w-4 text-blue-600" />
                    )}
                    {trackingData.warehouseLocationLabel}
                  </p>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {trackingData.isWmsOrder ? 'WMS Fast-Track Fulfillment' : 'Supplier Facility Direct'}
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <span className="block text-[11px] font-bold uppercase text-slate-400">Destination</span>
                  <p className="mt-1 font-bold text-slate-900 text-sm flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {trackingData.shippingCity || 'City'}, {trackingData.shippingCountry || 'PK'}
                  </p>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Est. Delivery: {trackingData.estimatedDelivery}
                  </span>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                <div className="mb-4 flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500">
                    Delivery Status: <strong className="text-slate-900 capitalize">{trackingData.trackingStatus.replace(/_/g, ' ')}</strong>
                  </span>
                  <span className="font-bold text-blue-600">{progressPercent}% Completed</span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden mb-6">
                  <div
                    className="h-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-1 text-center">
                  {TRACKING_STAGES.map((stage, idx) => {
                    const isDone =
                      (stage.key === 'placed') ||
                      (stage.key === 'processing' && progressPercent >= 25) ||
                      (stage.key === 'in_transit' && progressPercent >= 50) ||
                      (stage.key === 'out_for_delivery' && progressPercent >= 75) ||
                      (stage.key === 'delivered' && progressPercent === 100)

                    return (
                      <div key={stage.key} className="flex flex-col items-center">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                            isDone ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span className={`mt-1.5 text-[10px] font-semibold leading-tight ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                          {stage.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Chronological Event Milestones
                </h3>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timeline.map((event, index) => {
                    const isLatest = index === 0
                    return (
                      <div key={index} className="relative">
                        <div
                          className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                            isLatest
                              ? 'border-blue-600 bg-white ring-4 ring-blue-100'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                            <span className="text-xs text-slate-400">
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                          {event.location && (
                            <p className="mt-0.5 text-xs font-semibold text-indigo-700 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </p>
                          )}
                          {event.note && <p className="mt-1 text-xs text-slate-600">{event.note}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  )
}
