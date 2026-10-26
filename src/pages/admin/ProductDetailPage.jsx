import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, SquarePen, ArrowLeft, Percent, DollarSign, Sparkles } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Commission state and revenue split
  const [commission, setCommission] = useState('10')
  const [commissionSuccess, setCommissionSuccess] = useState('')
  const [isSavingCommission, setIsSavingCommission] = useState(false)

  const loadProduct = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.product(id)
      const data = res?.product || res?.data || res
      setProduct(data)
      if (data?.commission !== undefined && data?.commission !== null && Number(data.commission) > 0) {
        setCommission(String(data.commission))
      } else {
        setCommission('10')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load product details.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadProduct()
    }
  }, [id])

  const handleApprove = async () => {
    const commVal = Number(commission)
    if (Number.isNaN(commVal) || commVal <= 0) {
      setError('Please specify a valid commission percentage greater than 0% before approving.')
      return
    }

    setActionLoading(true)
    setError('')
    try {
      await adminApi.approveProduct(id, { commission: commVal, activate: true })
      setCommissionSuccess(`Product approved and activated with ${commVal}% marketplace commission!`)
      await loadProduct()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve product.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateCommission = async () => {
    const commVal = Number(commission)
    if (Number.isNaN(commVal) || commVal <= 0) {
      setError('Please specify a valid commission percentage greater than 0%.')
      return
    }

    setIsSavingCommission(true)
    setError('')
    setCommissionSuccess('')
    try {
      await adminApi.updateProductCommission(id, commVal)
      setCommissionSuccess(`Commission updated to ${commVal}%. Orders will reflect this rate.`)
      await loadProduct()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update commission.'))
    } finally {
      setIsSavingCommission(false)
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this product?')) return
    setActionLoading(true)
    try {
      await adminApi.rejectProduct(id)
      await loadProduct()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject product.'))
    } finally {
      setActionLoading(false)
    }
  }

  const images = Array.isArray(product?.images) && product.images.length > 0
    ? product.images
    : product?.image
      ? [product.image]
      : []

  const activePhoto = images[activeImageIndex] || images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  const isApproved = product?.status === 'approved' || product?.status === 'active'
  const isOutOfStock = !product?.quantity || Number(product.quantity) <= 0

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Back link */}
        <div className="mb-4">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Products Listing
          </Link>
        </div>

        {/* Top Header matching Picture 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-400">Product Listing</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
              Product Details
            </h1>
          </div>

          <Link
            to={`/admin/product/edits/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#05004e] hover:bg-[#03003b] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all active:scale-95 w-fit"
          >
            <SquarePen className="h-4 w-4" />
            <span>Edit Product &amp; Inventory</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-600 font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500 border border-slate-100 shadow-sm">
            Loading product details…
          </div>
        ) : !product ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500 border border-slate-100 shadow-sm">
            Product not found.
          </div>
        ) : (
          /* Main 2-Column Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Photos gallery (vertical thumbnails + large preview) */}
            <div className="lg:col-span-6 flex gap-3.5">
              {/* Vertical Thumbnails column */}
              <div className="flex flex-col gap-2.5 w-16 sm:w-20 shrink-0">
                {Array.from({ length: Math.max(images.length, 5) }).map((_, idx) => {
                  const img = images[idx]
                  const isActive = idx === activeImageIndex

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => img && setActiveImageIndex(idx)}
                      disabled={!img}
                      className={`relative aspect-square w-full rounded-xl overflow-hidden border transition-all ${
                        isActive
                          ? 'border-2 border-red-500 shadow-xs'
                          : 'border-slate-200 hover:border-slate-400 bg-slate-50'
                      } ${!img ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-100" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Large Main Preview */}
              <div className="flex-1 aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm">
                <img
                  src={activePhoto}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Right: Specifications Card matching Picture 1 */}
            <Card className="lg:col-span-6 p-6 sm:p-8 shadow-soft border border-slate-100 rounded-2xl bg-white">
              {/* Row 1: Stock Status & Quantity */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700">
                <span>In Stock :</span>
                {isOutOfStock ? (
                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700">
                    Out of Stock
                  </span>
                ) : (
                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                    In Stock
                  </span>
                )}
                <span className="ml-3 text-slate-600">Quantity : {product.quantity ?? 0}</span>
              </div>

              {/* Title & Brand */}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3">
                {product.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Brand: <span className="text-slate-600 font-medium">{product.brand || 'N/A'}</span>
              </p>

              {/* Divider */}
              <div className="border-b border-slate-100 my-5" />

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-900">Description</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed whitespace-pre-line">
                  {product.description || 'No description available.'}
                </p>
              </div>

              {/* Specs Table */}
              <div className="mt-6 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-800">Vendor / Supplier :</span>
                  <span className="font-bold text-slate-900">
                    {product.vendorName ||
                      product.supplierBusinessName ||
                      (product.supplier && product.supplier !== '—' ? product.supplier : '') ||
                      'Verified Vendor'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-800">Sku :</span>
                  <span className="font-mono text-slate-700 font-bold">{product.sku}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-800">Category :</span>
                  <span className="text-slate-600">{product.category || '—'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-800">Weight :</span>
                  <span className="text-slate-600">
                    {product.weight && Number(product.weight) > 0
                      ? `${product.weight} ${product.weightUnit || 'g'}`
                      : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-slate-800">Dimension :</span>
                  <span className="text-slate-600">
                    {product.length && Number(product.length) > 0
                      ? `${product.length} x ${product.width || 0} x ${product.height || 0} ${product.dimensionUnit || 'cm'}`
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Marketplace Commission & Revenue Split */}
              <div className="mt-6 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                      Marketplace Commission &amp; Revenue Split
                    </span>
                  </div>
                  {product.commission ? (
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      Active: {product.commission}%
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Set the platform cut for this SKU. When an order is placed, this commission is deducted and retained by Sellvro, and the remainder is credited to the supplier.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="relative w-32">
                    <input
                      type="number"
                      min="0.1"
                      max="99"
                      step="0.5"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      placeholder="10"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 pr-8 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 12, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCommission(String(pct))}
                        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                          commission === String(pct)
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  {isApproved && (
                    <button
                      type="button"
                      onClick={handleUpdateCommission}
                      disabled={isSavingCommission || Number(commission) === Number(product.commission)}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-semibold transition-colors shadow-xs"
                    >
                      {isSavingCommission ? 'Saving…' : 'Update Commission'}
                    </button>
                  )}
                </div>

                {/* Live Financial Breakdown Card */}
                {(() => {
                  const price = Number(product.price || 0)
                  const commPct = Number(commission) || 0
                  const adminCut = (price * commPct) / 100
                  const supplierNet = price - adminCut

                  return (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-indigo-100/80 bg-white p-3 text-center shadow-2xs">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Listing Price
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          ${price.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-x border-slate-100">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-500">
                          Admin Cut ({commPct}%)
                        </span>
                        <span className="text-sm font-bold text-rose-600">
                          +${adminCut.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Supplier Net
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          ${supplierNet.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {commissionSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{commissionSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                {isApproved ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-white px-4 py-2 text-xs font-semibold text-emerald-600 shadow-xs cursor-default">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Approved ({product.commission || commission}% Cut)</span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>{actionLoading ? 'Approving…' : `Approve & Activate (${commission || 10}% Commission)`}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="rounded-lg border border-rose-300 hover:bg-rose-50 px-5 py-2 text-xs font-semibold text-rose-600 shadow-xs transition-colors"
                >
                  {actionLoading ? 'Working…' : 'Reject'}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default ProductDetailPage
