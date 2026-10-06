import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Power,
  PowerOff,
  X,
  Package,
  Layers,
  Building,
  Tag,
  Scale,
  Maximize2,
  MapPin,
  Calendar,
  AlertCircle,
  Percent,
  DollarSign,
  ShieldCheck,
  Save,
  User,
  Mail,
  Phone,
  Store,
  ExternalLink,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'
import {
  PRODUCT_STATUS_HINT,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
} from '../../lib/productStatus.js'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false
  return /\.(mp4|webm|mov|ogg|mkv)($|\?)/i.test(url)
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pushToast } = useDisputeNotifications()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Commission state
  const [commission, setCommission] = useState('')
  const [commissionError, setCommissionError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const loadProduct = async () => {
    setLoading(true)
    setPageError('')
    try {
      const res = await adminApi.product(id)
      const data = res.product || res.data || res
      setProduct(data)
      setCommission(data.commission !== undefined && data.commission !== null ? String(data.commission) : '')
    } catch (err) {
      setPageError(getErrorMessage(err, 'Failed to load product details.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadProduct()
    }
  }, [id])

  const handleCommissionChange = (val) => {
    if (val.includes('-')) {
      val = val.replace(/-/g, '')
    }
    const num = Number(val)
    if (!Number.isNaN(num) && num < 0) return
    setCommission(val)
    if (commissionError) setCommissionError('')
  }

  const validateCommission = () => {
    const num = Number(commission)
    if (commission === '' || Number.isNaN(num) || num <= 0) {
      const msg = 'Commission is required and must be greater than 0% before you can approve or activate this product.'
      setCommissionError(msg)
      pushToast({ tone: 'danger', message: msg })
      return false
    }
    setCommissionError('')
    return num
  }

  const handleSaveCommission = async () => {
    const commNum = Number(commission)
    if (commission === '' || Number.isNaN(commNum) || commNum <= 0) {
      setCommissionError('Please enter a valid commission greater than 0%.')
      return
    }

    setActionLoading(true)
    setCommissionError('')
    try {
      const res = await adminApi.updateProductCommission(id, commNum)
      pushToast({ message: res.message || 'Commission updated successfully.' })
      if (res.product) {
        setProduct(res.product)
        setCommission(String(res.product.commission))
      }
    } catch (err) {
      setCommissionError(getErrorMessage(err, 'Failed to update commission.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async ({ activate = false } = {}) => {
    const commNum = validateCommission()
    if (commNum === false) return

    setActionLoading(true)
    try {
      const res = await adminApi.approveProduct(id, {
        activate,
        commission: commNum,
      })
      pushToast({
        message:
          res.message ||
          (activate ? 'Product approved & activated on the marketplace!' : 'Product approved successfully.'),
      })
      if (res.product) {
        setProduct(res.product)
        setCommission(String(res.product.commission))
      } else {
        await loadProduct()
      }
    } catch (err) {
      setCommissionError(getErrorMessage(err, 'Failed to approve product.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivate = async () => {
    const commNum = validateCommission()
    if (commNum === false) return

    setActionLoading(true)
    try {
      // If commission changed from existing, update it first or pass it
      if (Number(product.commission) !== commNum) {
        await adminApi.updateProductCommission(id, commNum)
      }
      const res = await adminApi.activateProduct(id)
      pushToast({ message: res.message || 'Product activated on the marketplace.' })
      if (res.product) {
        setProduct(res.product)
      } else {
        await loadProduct()
      }
    } catch (err) {
      setCommissionError(getErrorMessage(err, 'Failed to activate product.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this product from the marketplace?')) return
    setActionLoading(true)
    try {
      const res = await adminApi.deactivateProduct(id)
      pushToast({ message: res.message || 'Product deactivated.' })
      if (res.product) {
        setProduct(res.product)
      } else {
        await loadProduct()
      }
    } catch (err) {
      setCommissionError(getErrorMessage(err, 'Failed to deactivate product.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this product?')) return
    setActionLoading(true)
    try {
      const res = await adminApi.rejectProduct(id)
      pushToast({ message: res.message || 'Product rejected.' })
      if (res.product) {
        setProduct(res.product)
      } else {
        await loadProduct()
      }
    } catch (err) {
      setCommissionError(getErrorMessage(err, 'Failed to reject product.'))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-72 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading product details...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (pageError || !product) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-lg text-center py-16">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-slate-900">Product Not Found</h2>
          <p className="mb-6 text-sm text-slate-500">{pageError || 'The requested product could not be loaded.'}</p>
          <Button as={Link} to="/admin/products" variant="primary" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Products List
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80']

  const activeImage = images[activeImageIndex] || images[0]

  // Financial calculations
  const basePrice = Number(product.price || 0)
  const commPercent = Number(commission || 0)
  const commissionAmount = commPercent > 0 ? (basePrice * commPercent) / 100 : 0
  const finalMarketplacePrice = basePrice + commissionAmount

  const isApproved = product.status === 'approved'
  const isActive = product.status === 'active'
  const isPending = product.status === 'pending_approval' || product.status === 'draft'
  const isRejected = product.status === 'rejected'

  return (
    <AdminLayout>
      {/* Top Navigation & Status Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            title="Back to products list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{product.name}</h1>
              <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                {PRODUCT_STATUS_LABEL[product.status] || product.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              SKU: <span className="font-mono font-medium text-slate-700">{product.sku}</span>
              {product.createdAt && (
                <>
                  <span className="mx-2">•</span>
                  <span>Submitted on {new Date(product.createdAt).toLocaleDateString()}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button as={Link} to="/admin/products" variant="outline" size="sm">
            All Products
          </Button>
        </div>
      </div>

      {/* Main Grid: Details (Left) + Commission & Actions (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Media & Specifications */}
        <div className="space-y-6 lg:col-span-2">
          {/* Images Section */}
          <Card className="overflow-hidden p-6 shadow-soft">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Product Media</h2>
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Main Image/Video Display */}
              <div className="relative flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 p-2 sm:w-1/2">
                {isVideoUrl(activeImage) ? (
                  <video
                    src={activeImage}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-full max-w-full rounded-lg object-contain bg-slate-900"
                  />
                ) : (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-200 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                )}
                {product.inWarehouse && (
                  <span className="absolute top-3 left-3 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs">
                    In Warehouse
                  </span>
                )}
              </div>

              {/* Thumbnails list */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Gallery Media ({images.length})</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Click any thumbnail below to inspect the photo or video demo.
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {images.map((img, idx) => {
                      const isVid = isVideoUrl(img)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                            activeImageIndex === idx
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isVid ? (
                            <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                              <video src={img} className="h-full w-full object-cover" muted playsInline />
                              <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[9px] font-bold">
                                ▶ Video
                              </span>
                            </div>
                          ) : (
                            <img
                              src={img}
                              alt={`Thumbnail ${idx + 1}`}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Fulfillment Status</span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    {product.fulfillBy === 'warehouse'
                      ? 'Fulfilled from Sellvro centralized warehouse.'
                      : product.fulfillBy === 'self'
                      ? 'Self-fulfilled directly by the supplier.'
                      : 'Standard fulfillment.'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Product Overview & Description */}
          <Card className="p-6 shadow-soft">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Product Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <span className="text-xs font-medium text-slate-400">Product Title</span>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{product.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">SKU Code</span>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{product.sku}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Category</span>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{product.category || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Brand</span>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{product.brand || 'Unbranded / Generic'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Barcode / UPC / EAN</span>
                <p className="mt-0.5 font-mono text-sm text-slate-700">{product.barcode || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Available Stock</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{product.quantity} units</span>
                  {product.quantity > 5 ? (
                    <Badge tone="success">In Stock</Badge>
                  ) : product.quantity > 0 ? (
                    <Badge tone="warning">Low Stock</Badge>
                  ) : (
                    <Badge tone="danger">Out of Stock</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Product Description</span>
              <div className="mt-2 rounded-xl bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {product.description || 'No detailed description provided by the supplier.'}
              </div>
            </div>
          </Card>

          {/* Physical Specifications & Logistics */}
          <Card className="p-6 shadow-soft">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
              Logistics &amp; Dimensions
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Scale className="h-3.5 w-3.5 text-slate-400" />
                  <span>Weight</span>
                </div>
                <p className="mt-1 font-semibold text-slate-800">
                  {product.weight ? `${product.weight} ${product.weightUnit || 'gm'}` : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Length</span>
                </div>
                <p className="mt-1 font-semibold text-slate-800">
                  {product.length ? `${product.length} ${product.dimensionUnit || 'cm'}` : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Width</span>
                </div>
                <p className="mt-1 font-semibold text-slate-800">
                  {product.width ? `${product.width} ${product.dimensionUnit || 'cm'}` : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Height</span>
                </div>
                <p className="mt-1 font-semibold text-slate-800">
                  {product.height ? `${product.height} ${product.dimensionUnit || 'cm'}` : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400">Warehouse Location / City</span>
                  <p className="text-sm font-medium text-slate-800">{product.location || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5">
                <Building className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400">Country of Origin</span>
                  <p className="text-sm font-medium text-slate-800">{product.country || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Supplier Info Card */}
          <Card className="p-6 shadow-soft">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Supplier Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400">Supplier Full Name</span>
                  <p className="text-sm font-semibold text-slate-900">{product.supplier || '—'}</p>
                </div>
              </div>

              {product.supplierEmail && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Contact Email</span>
                    <p className="text-sm font-medium text-slate-800">{product.supplierEmail}</p>
                  </div>
                </div>
              )}

              {product.supplierPhone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Phone Number</span>
                    <p className="text-sm font-medium text-slate-800">{product.supplierPhone}</p>
                  </div>
                </div>
              )}

              {product.supplierBusinessName && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Registered Business</span>
                    <p className="text-sm font-medium text-slate-800">{product.supplierBusinessName}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right 1 Column: Commission Setup & Approval Panel (Sticky) */}
        <div className="space-y-6">
          {/* Commission Setup Card */}
          <Card className="border-primary-100 bg-gradient-to-b from-white to-primary-50/20 p-6 shadow-soft ring-1 ring-primary-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Admin Commission</h2>
                <p className="text-xs text-slate-500">Required before approving or activating</p>
              </div>
            </div>

            {/* Notice if commission is missing */}
            {(!commission || Number(commission) <= 0) && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Commission is mandatory:</strong> You cannot approve or activate this product without setting a valid commission percentage (&gt; 0%).
                </span>
              </div>
            )}

            {commissionError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{commissionError}</span>
              </div>
            )}

            {/* Commission Input Field */}
            <div className="mt-5 space-y-3">
              <label htmlFor="commissionInput" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Commission Rate (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="commissionInput"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 15"
                  value={commission}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={(e) => handleCommissionChange(e.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-10 text-sm font-bold text-slate-900 shadow-xs outline-none transition-colors ${
                    commissionError || (!commission || Number(commission) <= 0)
                      ? 'border-amber-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                      : 'border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 font-bold text-slate-400">
                  %
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth
                disabled={actionLoading || !commission || Number(commission) <= 0}
                onClick={handleSaveCommission}
                className="mt-2 text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save Commission Only
              </Button>
            </div>

            {/* Live Financial Breakdown */}
            <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white p-4 text-xs shadow-xs">
              <div className="flex items-center justify-between pb-2.5">
                <span className="text-slate-500">Supplier Base Price</span>
                <span className="font-semibold text-slate-800">${basePrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">Commission Rate</span>
                <span className="font-semibold text-primary">{commPercent > 0 ? `${commPercent}%` : 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">Commission Profit</span>
                <span className="font-semibold text-emerald-600">
                  {commPercent > 0 ? `+$${commissionAmount.toFixed(2)}` : '$0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5 text-sm font-bold">
                <span className="text-slate-900">Marketplace Selling Price</span>
                <span className="text-primary">${finalMarketplacePrice.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Action Decision Panel */}
          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Product Actions</h2>
                <p className="text-xs text-slate-500">Change product marketplace status</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {/* If Pending Approval, Draft, or Rejected */}
              {(isPending || isRejected) && (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={actionLoading}
                    onClick={() => handleApprove({ activate: true })}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                  >
                    <Power className="h-4 w-4 mr-1.5" />
                    Approve &amp; Activate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={actionLoading}
                    onClick={() => handleApprove({ activate: false })}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve Only (Draft Marketplace)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject Product
                  </Button>
                </>
              )}

              {/* If Approved (not active yet) */}
              {isApproved && (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={actionLoading}
                    onClick={handleActivate}
                  >
                    <Power className="h-4 w-4 mr-1.5" />
                    Activate on Marketplace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject Product
                  </Button>
                </>
              )}

              {/* If Currently Active */}
              {isActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  disabled={actionLoading}
                  onClick={handleDeactivate}
                  className="border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                >
                  <PowerOff className="h-4 w-4 mr-1.5" />
                  Deactivate Product
                </Button>
              )}
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Status explanation:</span>
              <p className="mt-1">{PRODUCT_STATUS_HINT[product.status] || 'Manage availability on the marketplace.'}</p>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ProductDetailPage
