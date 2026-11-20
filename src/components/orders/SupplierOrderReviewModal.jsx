import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import { getErrorMessage, mediaUrl, orderApi } from '../../lib/api.js'

export default function SupplierOrderReviewModal({ order, open, onClose, onSuccess }) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReasonSelect, setRejectReasonSelect] = useState('Out of Stock / Inventory Shortage')
  const [rejectCustomReason, setRejectCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !order) return null

  const isWarehouseOrder = Boolean(
    order.isWmsOrder ||
    order.warehouseLocation === 'wms_hub' ||
    order.fulfillmentType === 'warehouse',
  )

  const netSupplierEarnings = Number((Number(order.total || 0) - Number(order.commission || 0)).toFixed(2))

  const handleAcceptOrder = async () => {
    if (!termsAccepted) {
      setError('Please review and check the Terms & Conditions checkbox before accepting the order.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await orderApi.supplierReview(order.id, {
        decision: 'accept',
        termsAccepted: true,
      })
      if (onSuccess) {
        onSuccess(res.order || res)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to accept order.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectOrder = async () => {
    const finalReason = rejectReasonSelect === 'Other Reason'
      ? rejectCustomReason.trim()
      : (rejectCustomReason.trim() ? `${rejectReasonSelect}: ${rejectCustomReason.trim()}` : rejectReasonSelect)

    if (!finalReason || finalReason.length < 5) {
      setError('Please provide a specific rejection reason (at least 5 characters).')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await orderApi.supplierReview(order.id, {
        decision: 'reject',
        rejectionReason: finalReason,
      })
      if (onSuccess) {
        onSuccess(res.order || res)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject order.'))
    } finally {
      setSubmitting(false)
    }
  }

  const isAlreadyDecided = order.supplierReviewStatus === 'accepted' || order.supplierReviewStatus === 'rejected'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Review Order Fulfillment — #{order.orderNo}
                </h3>
                {order.supplierReviewStatus === 'accepted' && (
                  <Badge tone="success" className="bg-emerald-100 text-emerald-900 border-emerald-300">
                    ✓ Accepted
                  </Badge>
                )}
                {order.supplierReviewStatus === 'rejected' && (
                  <Badge tone="danger" className="bg-rose-100 text-rose-900 border-rose-300">
                    ✕ Rejected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Placed on: <strong>{order.date || 'Today'}</strong> &bull; Review complete specifications, customer details & agreement terms.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Product & Financial Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-indigo-600" />
              <span>Product & Financial Breakdown</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {order.productImage ? (
                <img
                  src={mediaUrl(order.productImage)}
                  alt={order.product || 'Product'}
                  className="h-20 w-20 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
                  <Package className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="font-extrabold text-sm text-slate-900 truncate">
                    {order.product || order.productName}
                  </h5>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    SKU: {order.productSku || 'SVRO-00139'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Unit Price:</span>
                    <strong className="text-slate-800">${Number(order.unitPrice || 0).toFixed(2)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Quantity:</span>
                    <strong className="text-slate-800">{order.quantity || 1} Pcs</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Commission ({order.commissionPercent || 8}%):</span>
                    <strong className="text-rose-600">-${Number(order.commission || 0).toFixed(2)}</strong>
                  </div>
                  <div className="rounded-lg bg-emerald-50/80 p-2 border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 font-semibold block">Net Supplier Payout:</span>
                    <strong className="text-emerald-900 text-sm font-extrabold">${netSupplierEarnings.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Delivery Destination & Parcel Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>Customer & Delivery Destination</span>
              </h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipient Name:</span>
                  <strong className="text-slate-900">{order.shippingAddress?.fullName || order.user || 'Customer'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Phone:</span>
                  <strong className="text-slate-900">{order.shippingAddress?.phone || '—'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination City:</span>
                  <strong className="text-slate-900">{order.shippingAddress?.city || '—'}, {order.shippingAddress?.country || 'Pakistan'}</strong>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Full Street Address:</span>
                  <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {order.shippingAddress?.addressLine || 'Address details on packaging label'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Dispatch SLA & Packaging Instructions</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Promised Handling SLA:</span>
                  <Badge tone="info" className="font-bold">
                    {order.promisedHandlingTime || '24 Hours (1 business day)'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Selected Carrier:</span>
                  <span className="font-extrabold uppercase text-slate-800 font-mono">
                    {order.carrier || 'FEDEX'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Custody Origin:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    {isWarehouseOrder ? (
                      <><Warehouse className="h-3 w-3 text-emerald-600" /> WMS Central Hub</>
                    ) : (
                      <><Building2 className="h-3 w-3 text-blue-600" /> Supplier Facility Direct</>
                    )}
                  </span>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-amber-950">
                  <span className="font-bold block text-[11px] mb-0.5">📦 Parcel Notes:</span>
                  <p className="text-[11px] font-medium">
                    {order.labelNotes || order.brandLabel || 'Fragile - Handle with care. Open parcel allowed.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Customization Details (if any) */}
          {Boolean(order.customizationDetails) && (
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider">
                  Customer Requested Personalization / Customization
                </h4>
              </div>
              <p className="text-xs text-indigo-900 bg-white p-2.5 rounded-lg border border-indigo-200 font-medium">
                "{order.customizationDetails}"
              </p>
              <p className="mt-1.5 text-[11px] text-indigo-700">
                ⚠️ Ensure this customization is accurately prepared before dispatching the order.
              </p>
            </div>
          )}

          {/* Section 4: Relevant Terms & Conditions */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Sellvro Supplier Fulfillment Terms & Conditions</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600 max-h-36 overflow-y-auto pr-2 border border-slate-200/80 rounded-lg p-3 bg-white">
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-slate-900">1. Dispatch SLA:</span>
                <span>Supplier agrees to prepare, pack, and hand over the parcel within the promised <strong>{order.promisedHandlingTime || '24-hour'}</strong> window. Failure to dispatch within SLA causes order cancellation or performance penalty.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-slate-900">2. SKU Accuracy & Quality Guarantee:</span>
                <span>The delivered merchandise must strictly match product SKU <strong>{order.productSku || 'SVRO-00139'}</strong> in size, color, specifications, and authenticity. Defective or mismatched items are subject to return dispute at supplier cost.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-slate-900">3. Packaging & Airway Bill Standard:</span>
                <span>Supplier must securely pack the merchandise and affix the official printed courier shipping label / Airway Bill.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-slate-900">4. 12-Hour Cancellation Window Policy:</span>
                <span>Buyer or Supplier may request order cancellation only within the strict 12-hour limit from order placement prior to facility dispatch.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-slate-900">5. Store Health & Order Rejection Notice:</span>
                <span>Rejecting an order automatically triggers an instant 100% wallet refund to the buyer. Repeated rejections reduce store visibility and supplier rating score.</span>
              </p>
            </div>

            {/* Checkbox */}
            {!isAlreadyDecided && (
              <label className="mt-3 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  I have reviewed all order details and agree to fulfill this order in compliance with the Sellvro Supplier Fulfillment Terms & Conditions.
                </span>
              </label>
            )}
          </div>

          {/* Section 5: Rejection Form (Appears when supplier clicks 'Reject Order') */}
          {showRejectForm && !isAlreadyDecided && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-rose-950 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Specify Reason for Rejecting Order #{order.orderNo}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-xs text-rose-700 hover:underline font-semibold"
                >
                  Cancel Rejection
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Rejection Reason Category:
                </label>
                <select
                  value={rejectReasonSelect}
                  onChange={(e) => setRejectReasonSelect(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="Out of Stock / Inventory Shortage">Out of Stock / Inventory Shortage</option>
                  <option value="Cannot meet delivery timeframe">Cannot meet delivery / handling timeframe</option>
                  <option value="Unable to fulfill requested customization">Unable to fulfill requested customization</option>
                  <option value="Product defective or damaged during inspection">Product defective or damaged during inspection</option>
                  <option value="Address or postal code unserviceable">Address or delivery area unserviceable</option>
                  <option value="Other Reason">Other Reason (explain below)</option>
                </select>

                <label className="text-xs font-semibold text-slate-700 block">
                  Additional Details for Customer & Admin:
                </label>
                <textarea
                  rows={2}
                  value={rejectCustomReason}
                  onChange={(e) => setRejectCustomReason(e.target.value)}
                  placeholder="Explain why you cannot fulfill this order..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />

                <div className="rounded-lg bg-rose-100/70 p-2 text-[11px] text-rose-900 font-medium">
                  ⚠️ <strong>Notice:</strong> Confirming rejection will instantly cancel this order, return stock to your inventory, and issue an automatic <strong>100% refund of ${Number(order.total || 0).toFixed(2)}</strong> to the customer's wallet.
                </div>

                <Button
                  type="button"
                  onClick={handleRejectOrder}
                  loading={submitting}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 shadow-sm"
                >
                  Confirm Order Rejection & Automatic Refund (${Number(order.total || 0).toFixed(2)})
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Close
          </Button>

          {!isAlreadyDecided ? (
            <div className="flex items-center gap-3">
              {!showRejectForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-1.5"
                >
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span>Reject Order</span>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleAcceptOrder}
                loading={submitting}
                disabled={submitting || !termsAccepted || showRejectForm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Accept Order & Start Fulfillment</span>
              </Button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Order review already completed: <strong className="uppercase">{order.supplierReviewStatus}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
