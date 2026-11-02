import { useState } from 'react'
import { CheckCircle2, Star, ThumbsDown, ThumbsUp, Truck, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { getErrorMessage, mediaUrl, orderApi } from '../../lib/api.js'

const PRODUCT_RATING_LABELS = {
  1: 'Poor / Kharab Quality',
  2: 'Below Average / Aam sa',
  3: 'Average / Theek Thaak',
  4: 'Good / Achi Quality',
  5: 'Excellent / Zabardast Quality',
}

const DELIVERY_RATING_LABELS = {
  1: 'Very Late / Bohot Late',
  2: 'Delayed / Der se mila',
  3: 'Acceptable Speed',
  4: 'Fast / Tez Delivery',
  5: 'Super Fast / Bilkul Time par',
}

export default function OrderReviewModal({ order, open, onClose, onSuccess }) {
  const [productRating, setProductRating] = useState(5)
  const [hoverProductRating, setHoverProductRating] = useState(0)

  const [deliveryRating, setDeliveryRating] = useState(5)
  const [hoverDeliveryRating, setHoverDeliveryRating] = useState(0)

  const [deliveredOnTime, setDeliveredOnTime] = useState(true)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !order) return null

  const activeProductRating = hoverProductRating || productRating
  const activeDeliveryRating = hoverDeliveryRating || deliveryRating

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
        productRating,
        deliveryRating,
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
    (order.supplierId ? `SUP-${order.supplierId.slice(-6).toUpperCase()}` : order.supplier || 'Vendor')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
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
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            Rate Supplier &amp; Feedback
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Order Delivered: Leave Your Review
          </h2>
          <p className="text-xs text-slate-500">
            Aapka feedback supplier ke product page par show hoga taake doosray buyers ko madad mil sake.
          </p>
        </div>

        {/* Order Details Snippet */}
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          {pImg ? (
            <img
              src={mediaUrl(pImg)}
              alt={order.product || 'Product'}
              className="h-12 w-12 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs shrink-0">
              PROD
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-bold text-slate-900" title={order.product}>
              {order.product || 'Product Item'}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Order: <strong className="text-slate-700">{order.orderNo}</strong></span>
              <span>•</span>
              <span>Supplier: <strong className="text-amber-800">{supplierDisplay}</strong></span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. On-Time Delivery Question */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              🚚 1. Kya supplier ne order waqt par deliver kiya? (On-time Delivery)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveredOnTime(true)}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition-all ${
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
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition-all ${
                  !deliveredOnTime
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ThumbsDown className={`h-4 w-4 ${!deliveredOnTime ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Nahi, Late Hua</span>
              </button>
            </div>
          </div>

          {/* 2. Delivery Speed & Handling Rating (1-5 stars) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                ⚡ 2. Delivery Speed &amp; Handling Rating
              </label>
              <span className="text-[11px] font-semibold text-indigo-700">
                {DELIVERY_RATING_LABELS[activeDeliveryRating] || `${activeDeliveryRating} Stars`}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setDeliveryRating(star)}
                  onMouseEnter={() => setHoverDeliveryRating(star)}
                  onMouseLeave={() => setHoverDeliveryRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate delivery ${star} stars`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= activeDeliveryRating
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-200 hover:text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-mono text-xs font-bold text-slate-700">
                {deliveryRating}.0 / 5.0
              </span>
            </div>
          </div>

          {/* 3. Product Quality Rating (1-5 stars) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                ⭐ 3. Product Quality &amp; Accuracy Rating
              </label>
              <span className="text-[11px] font-semibold text-amber-700">
                {PRODUCT_RATING_LABELS[activeProductRating] || `${activeProductRating} Stars`}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setProductRating(star)}
                  onMouseEnter={() => setHoverProductRating(star)}
                  onMouseLeave={() => setHoverProductRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate product ${star} stars`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= activeProductRating
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-200 hover:text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-mono text-xs font-bold text-slate-700">
                {productRating}.0 / 5.0
              </span>
            </div>
          </div>

          {/* 4. Customer Feedback / Review Comments */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              💬 4. Customer Feedback &amp; Review (Detail)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Customer ka feedback kaisa raha? Product quality, packaging aur delivery time kaisa tha..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Ye review aur ratings product ke marketplace page par sabhi customers ko nazar aayegi.
            </p>
          </div>

          {/* Action Buttons */}
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
              {submitting ? 'Submitting Review...' : 'Submit Rating & Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
