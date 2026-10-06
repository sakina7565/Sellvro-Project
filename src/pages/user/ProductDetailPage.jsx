import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Layers,
  Tag,
  MapPin,
  ShieldCheck,
  Truck,
  ShoppingCart,
  Minus,
  Plus,
  AlertCircle,
  CheckCircle2,
  Barcode,
  Scale,
  Maximize2,
  HelpCircle,
  Warehouse,
  Store,
  Building2,
  Info,
} from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { productApi, mediaUrl, getErrorMessage } from '../../lib/api.js'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false
  return /\.(mp4|webm|mov|ogg|mkv)($|\?)/i.test(url)
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    productApi
      .get(id)
      .then((res) => {
        if (!active) return
        const raw = res.product || res.data || res
        if (!raw || (!raw.id && !raw._id)) {
          setError('Product not found.')
        } else {
          setProduct({
            ...raw,
            id: raw.id || raw._id,
          })
        }
      })
      .catch((err) => {
        if (!active) return
        // Fallback: search marketplace list if single lookup had route issues
        productApi
          .marketplace()
          .then((marketRes) => {
            if (!active) return
            const list = marketRes.data || []
            const found = list.find(
              (item) => String(item.id) === String(id) || String(item._id) === String(id),
            )
            if (found) {
              setProduct({
                ...found,
                id: found.id || found._id,
              })
            } else {
              setError(getErrorMessage(err, 'Product not found or unavailable.'))
            }
          })
          .catch(() => {
            if (active) setError(getErrorMessage(err, 'Failed to load product details.'))
          })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const images = useMemo(() => {
    if (!product) return [PLACEHOLDER_IMAGE]
    const list = []
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img) => {
        if (img) list.push(mediaUrl(img))
      })
    }
    if (product.image) {
      const main = mediaUrl(product.image)
      if (!list.includes(main)) list.unshift(main)
    }
    return list.length > 0 ? list : [PLACEHOLDER_IMAGE]
  }, [product])

  const activeImage = images[activeImageIndex] || images[0] || PLACEHOLDER_IMAGE

  const isAvailable = product?.status === 'active' || !product?.status
  const maxStock = typeof product?.quantity === 'number' && product.quantity > 0 ? product.quantity : 999
  const isOutOfStock = typeof product?.quantity === 'number' && product.quantity <= 0

  // WMS Logic: ONLY true if product is stored in Sellvro Inventory / Warehouse
  const isWms = Boolean(
    product?.inWarehouse === true ||
    product?.fulfillBy === 'warehouse' ||
    product?.storageLocation === 'warehouse',
  )

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncrease = () => {
    setQuantity((prev) => Math.min(maxStock, prev + 1))
  }

  const handleQuantityChange = (e) => {
    const val = parseInt(e.target.value, 10)
    if (Number.isNaN(val) || val < 1) {
      setQuantity(1)
    } else {
      setQuantity(Math.min(maxStock, val))
    }
  }

  const handleBuyNow = () => {
    if (!product || !isAvailable || isOutOfStock) return
    navigate(`/user/checkout/${product.id}`, {
      state: {
        product,
        quantity,
      },
    })
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading product details...</p>
          </div>
        </div>
      </UserLayout>
    )
  }

  if (error || !product) {
    return (
      <UserLayout>
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-8 ring-rose-50/50">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Product Not Found</h2>
          <p className="mb-6 text-sm text-slate-500">
            {error || 'This product does not exist, has been removed, or is currently inactive.'}
          </p>
          <Button as={Link} to="/user/products" variant="primary" size="md">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products Catalog
          </Button>
        </div>
      </UserLayout>
    )
  }

  const unitPrice = Number(product.price || 0)
  const subtotal = unitPrice * quantity

  return (
    <UserLayout>
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/user/products"
            className="inline-flex items-center gap-1.5 font-medium text-slate-700 transition-colors hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Sellvro Products
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-400">{product.category || 'General'}</span>
          <span>/</span>
          <span className="max-w-[220px] truncate font-medium text-slate-900 sm:max-w-xs">
            {product.name}
          </span>
        </div>

        <Link
          to="/user/products"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
        >
          <Package className="h-3.5 w-3.5 text-slate-400" />
          Browse All Products
        </Link>
      </div>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Product Images Gallery (5 cols on lg) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Main Showcase Image */}
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            {/* Fulfillment Badge on image:
                - If WMS: Prominent WMS Inventory badge
                - If Supplier: Supplier In-House Stock badge (NO WMS) */}
            {isWms ? (
              <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-md bg-slate-950/95 px-3 py-1.5 text-xs font-black tracking-wider text-amber-400 shadow-lg border border-amber-400/20 backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                WMS INVENTORY
              </div>
            ) : (
              <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md border border-slate-200 backdrop-blur-xs">
                <Store className="h-3.5 w-3.5 text-indigo-600" />
                Supplier In-House Stock
              </div>
            )}

            {isVideoUrl(activeImage) ? (
              <video
                src={activeImage}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            ) : (
              <img
                src={activeImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_IMAGE
                }}
              />
            )}
          </div>

          {/* Thumbnail Gallery (if multiple images/videos) */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => {
                const isVid = isVideoUrl(img)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-1 transition-all ${
                      activeImageIndex === idx
                        ? 'border-primary-600 ring-2 ring-primary-100 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {isVid ? (
                      <div className="relative h-full w-full bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                        <video src={img} className="h-full w-full object-cover" muted playsInline />
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[9px] font-bold">
                          ▶ Video
                        </span>
                      </div>
                    ) : (
                      <img
                        src={img}
                        alt={`${product.name} - ${idx + 1}`}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Trust & Dispatch Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">Buyer Protection</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Guaranteed safe wallet checkout & dispute resolution.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
              <Truck className={`h-5 w-5 shrink-0 ${isWms ? 'text-amber-600' : 'text-indigo-600'}`} />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isWms ? 'WMS Direct Dispatch' : 'Supplier Direct'}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  {isWms
                    ? 'Dispatched directly from Sellvro central WMS fulfillment hub.'
                    : 'Dispatched directly from the verified supplier facility.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Product Details, Pricing & Purchase Box (7 cols on lg) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
            {/* Category & Status Tags */}
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <Tag className="h-3 w-3 text-slate-500" />
                  {product.category}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  {product.brand}
                </span>
              )}
              {isOutOfStock ? (
                <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  Out of Stock
                </span>
              ) : (
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  In Stock ({product.quantity !== undefined ? `${product.quantity} units` : 'Available'})
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {product.name}
            </h1>

            {/* SKU and identifiers */}
            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {product.sku && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">SKU:</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-800">
                    {product.sku}
                  </span>
                </div>
              )}
              {product.barcode && (
                <div className="flex items-center gap-1.5">
                  <Barcode className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono text-slate-700">{product.barcode}</span>
                </div>
              )}
              {product.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {product.location}
                    {product.country ? `, ${product.country}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Price Box */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-950">
                  ${unitPrice.toFixed(2)}
                </span>
                <span className="text-xs font-medium text-slate-400">/ unit</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Payment processed seamlessly via your Sellvro digital wallet balance during checkout.
              </p>
            </div>

            {/* ============================================================== */}
            {/* CORE SECTION: Inventory & Fulfillment Status (WMS vs Supplier) */}
            {/* ============================================================== */}
            <div className="mt-5">
              {isWms ? (
                /* WMS INVENTORY BANNER */
                <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-orange-50/40 p-4.5 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                        <Warehouse className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">
                            Storage: Sellvro WMS Inventory
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            WMS
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Physically stocked in Sellvro central warehouse management system.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-2 border-t border-amber-200/80 pt-3 text-xs text-slate-700 sm:grid-cols-3">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Sellvro Quality Checked</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Fast 24-48h Dispatch</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Standardized Packaging</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* SUPPLIER IN-HOUSE STOCK BANNER (NO WMS) */
                <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-slate-50/60 to-indigo-50/30 p-4.5 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">
                            Storage: Maintained with Supplier
                          </h3>
                          <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                            Supplier Direct
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Product is held at the supplier's own facility and dispatched directly by the vendor.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 text-xs text-slate-700 sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        Vendor:{' '}
                        <strong className="font-semibold text-slate-900">
                          {product.supplierBusinessName || product.supplier || 'Verified Supplier'}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        Stock Facility:{' '}
                        <strong className="font-semibold text-slate-900">
                          {product.supplierCity
                            ? `${product.supplierCity}, ${product.supplierCountry || ''}`
                            : product.location && product.location !== '—'
                            ? product.location
                            : 'Supplier In-House Facility'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Selector & Live Subtotal */}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Quantity
                  </label>
                  <div className="mt-2 flex items-center">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="flex h-11 w-11 items-center justify-center rounded-l-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={maxStock}
                      value={quantity}
                      onChange={handleQuantityChange}
                      disabled={isOutOfStock}
                      className="h-11 w-16 border-y border-slate-200 bg-white text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-0 disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={quantity >= maxStock || isOutOfStock}
                      className="flex h-11 w-11 items-center justify-center rounded-r-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-primary-50/50 px-4 py-2 sm:text-right">
                  <span className="text-xs font-medium text-primary-700">Estimated Total</span>
                  <p className="text-xl font-black text-primary-950">${subtotal.toFixed(2)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={!isAvailable || isOutOfStock}
                  onClick={handleBuyNow}
                  className="w-full flex-1 justify-center !py-3.5 text-base font-bold shadow-md shadow-primary-600/10"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isOutOfStock ? 'Currently Out of Stock' : 'Proceed to Checkout'}
                </Button>

                <Button
                  as={Link}
                  to="/user/products"
                  variant="outline"
                  size="lg"
                  className="justify-center border-slate-200 !py-3.5 text-slate-700 hover:bg-slate-50"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>

          {/* Product Specifications & Details Card */}
          <Card className="overflow-hidden p-6 shadow-soft sm:p-7">
            <h2 className="text-base font-bold text-slate-900">Product Specifications & Overview</h2>

            {/* Description */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {product.description || 'No specific description provided for this product.'}
              </p>
            </div>

            {/* Attributes Grid Table */}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Technical Details
              </h3>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    Category
                  </dt>
                  <dd className="font-semibold text-slate-800">{product.category || '—'}</dd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    Brand
                  </dt>
                  <dd className="font-semibold text-slate-800">{product.brand || '—'}</dd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Scale className="h-3.5 w-3.5 text-slate-400" />
                    Weight
                  </dt>
                  <dd className="font-semibold text-slate-800">
                    {product.weight ? `${product.weight} ${product.weightUnit || 'gm'}` : '—'}
                  </dd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                    Dimensions (L×W×H)
                  </dt>
                  <dd className="font-semibold text-slate-800">
                    {product.length && product.width && product.height
                      ? `${product.length} × ${product.width} × ${product.height} ${product.dimensionUnit || 'cm'}`
                      : '—'}
                  </dd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Truck className="h-3.5 w-3.5 text-slate-400" />
                    Storage & Fulfillment
                  </dt>
                  <dd className="font-semibold text-slate-800">
                    {isWms ? 'Sellvro Warehouse Hub (WMS)' : 'Supplier Facility (Self-Fulfillment)'}
                  </dd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Dispatched By
                  </dt>
                  <dd className="font-semibold text-slate-800">
                    {isWms
                      ? 'Sellvro WMS Hub'
                      : product.supplierBusinessName || product.supplier || 'Direct Supplier'}
                  </dd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs sm:col-span-2">
                  <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Stock Location
                  </dt>
                  <dd className="font-semibold text-slate-800">
                    {isWms
                      ? `Sellvro Central WMS Hub ${product.location && product.location !== '—' ? `(${product.location})` : ''}`
                      : product.location && product.location !== '—'
                      ? `${product.location}${product.country ? `, ${product.country}` : ''}`
                      : 'Supplier In-House Facility'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Need Help / Dispute notice */}
            <div className="mt-6 flex items-center justify-between rounded-xl border border-primary-100 bg-primary-50/40 p-4 text-xs text-primary-900">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4 shrink-0 text-primary-600" />
                <span>Have inquiries about bulk stock, WMS storage, or delivery specifications?</span>
              </div>
              <Link
                to="/user/disputes"
                className="shrink-0 font-bold text-primary-700 hover:text-primary-900 hover:underline"
              >
                Contact Support
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </UserLayout>
  )
}

export default ProductDetailPage
