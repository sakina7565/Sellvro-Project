import { useState } from 'react'
import { CheckCircle2, ShieldCheck, Sparkles, Star, ThumbsDown, ThumbsUp, Truck, UserCheck, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { getErrorMessage, mediaUrl, orderApi } from '../../lib/api.js'

const RATING_LABELS = {
  1: '1 Star - Poor / Kharab',
  2: '2 Stars - Below Average',
  3: '3 Stars - Average / Theek',
  4: '4 Stars - Good / Acha',
  5: '5 Stars - Excellent / Zabardast',
}

function StarRatingSelector({ label, description, icon: Icon, value, onChange }) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-amber-500" />}
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-semibold text-amber-700 font-mono">
          {RATING_LABELS[active] || `${active} Stars`}
        </span>
      </div>
      {description && <p className="text-[11px] text-slate-400 mb-2">{description}</p>}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-1 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
            aria-label={`${label} ${star} stars`}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= active ? 'fill-amber-400 text-amber-500 drop-shadow-xs' : 'text-slate-200 hover:text-slate-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {value}.0 / 5.0
        </span>
      </div>
    </div>
  )
}

export default function OrderReviewModal({ order, open, onClose, onSuccess }) {
  // 4 Specific Rating Fields requested by user:
  // 1. Product Quality
  const [productQualityRating, setProductQualityRating] = useState(5)
  // 2. Product Performance
  const [productPerformanceRating, setProductPerformanceRating] = useState(5)
  // 3. Supplier Services
  const [supplierServicesRating, setSupplierServicesRating] = useState(5)
  // 4. Supplier Performance
  const [supplierPerformanceRating, setSupplierPerformanceRating] = useState(5)

  const [deliveredOnTime, setDeliveredOnTime] = useState(true)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !order) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!order.id) {
      setError('Order reference missing.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        productQualityRating,
        productPerformanceRating,
        supplierServicesRating,
        supplierPerformanceRating,
        productRating: Number(((productQualityRating + productPerformanceRating) / 2).toFixed(1)),
        deliveryRating: Number(((supplierServicesRating + supplierPerformanceRating) / 2).toFixed(1)),
        deliveredOnTime,
        comment: comment.trim(),
      }

      const res = await orderApi.submitReview(order.id, payload)
      if (onSuccess) {
        onSuccess(res.review || res)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit review. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const pImg = order.productImage || order.product?.image || (order.product?.images && order.product.images[0])
  const supplierDisplay =
    order.supplierDisplayId ||
    (order.supplierId ? `SPAK-${order.supplierId.slice(-4).toUpperCase()}` : order.supplier || 'Supplier')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            Supplier &amp; Product Performance Review
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Rate Supplier &amp; Product Experience
          </h2>
          <p className="text-xs text-slate-500">
            Apka feedback supplier aur product ke performance record mein add hoga aur admin panel par review kiya ja sakega.
          </p>

          {/* Order Details Snippet */}
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
            {pImg ? (
              <img
                src={mediaUrl(pImg)}
                alt={order.product || 'Product'}
                className="h-11 w-11 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs shrink-0">
                PROD
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-bold text-slate-900" title={order.product}>
                {order.product || 'Product Item'}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>Order: <strong className="text-slate-700 font-mono">{order.orderNo}</strong></span>
                <span>•</span>
                <span>Supplier: <strong className="text-amber-800">{supplierDisplay}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Section 1: Product Ratings */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Product Ratings</span>
            </div>

            {/* 1. Product Quality Rating */}
            <StarRatingSelector
              label="1. Product Quality Rating"
              description="Product ka material, build aur finish standard kaisa hai?"
              icon={ShieldCheck}
              value={productQualityRating}
              onChange={setProductQualityRating}
            />

            {/* 2. Product Performance Rating */}
            <StarRatingSelector
              label="2. Product Performance Rating"
              description="Kya product apni description aur specifications ke mutabiq sahi perform kar raha hai?"
              icon={Sparkles}
              value={productPerformanceRating}
              onChange={setProductPerformanceRating}
            />
          </div>

          {/* Section 2: Supplier Ratings */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>Supplier Ratings</span>
            </div>

            {/* 3. Supplier Services Rating */}
            <StarRatingSelector
              label="3. Supplier Services Rating"
              description="Supplier ki overall service, communication aur responsiveness kaisi rahi?"
              icon={UserCheck}
              value={supplierServicesRating}
              onChange={setSupplierServicesRating}
            />

            {/* 4. Supplier Performance Rating */}
            <StarRatingSelector
              label="4. Supplier Performance Rating"
              description="Order handling, fast processing aur packaging ki performance kaisa rahi?"
              icon={Truck}
              value={supplierPerformanceRating}
              onChange={setSupplierPerformanceRating}
            />
          </div>

          {/* On-Time Delivery Quick Check */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              🚚 Kya supplier ne order promised time ke andar deliver kiya?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveredOnTime(true)}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                  deliveredOnTime
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${deliveredOnTime ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Haan, Waqt Par Mila</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveredOnTime(false)}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                  !deliveredOnTime
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ThumbsDown className={`h-4 w-4 ${!deliveredOnTime ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Nahi, Late Deliver Hua</span>
              </button>
            </div>
          </div>

          {/* Written Review Feedback */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              💬 Written Review &amp; Detailed Feedback
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Apna detailed tajurba likhein: product quality, performance, supplier service aur packaging kaisa tha..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Ye review Admin Panel aur Marketplace par supplier ke record mein show hoga.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              {submitting ? 'Submitting Review...' : 'Submit Rating & Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
