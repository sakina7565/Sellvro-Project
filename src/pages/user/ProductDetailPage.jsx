import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronNext,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Heart,
  HelpCircle,
  Info,
  Maximize2,
  MessageSquare,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Scale,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Truck,
  Warehouse,
  TrendingUp,
  X,
  Zap,
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

/**
 * Payment method SVGs matching eBay checkout badges
 */
function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* PayPal */}
      <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 text-[10px] font-black italic text-[#003087] shadow-2xs">
        Pay<span className="text-[#0079C1]">Pal</span>
      </span>
      {/* Google Pay */}
      <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs">
        G<span className="text-slate-400 font-normal ml-0.5">Pay</span>
      </span>
      {/* Visa */}
      <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 text-[10px] font-black text-[#1A1F71] shadow-2xs">
        VISA
      </span>
      {/* Mastercard */}
      <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-1.5 text-[10px] font-bold shadow-2xs">
        <span className="flex -space-x-1.5 items-center mr-1">
          <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B] opacity-90 inline-block" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90 inline-block" />
        </span>
        <span className="text-[9px] text-slate-700">mastercard</span>
      </span>
      {/* Discover */}
      <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 text-[10px] font-bold text-[#FF6000] shadow-2xs">
        DISCOVER
      </span>
      {/* Sellvro Wallet */}
      <span className="inline-flex h-6 items-center rounded border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-extrabold text-emerald-800 shadow-2xs">
        Sellvro Wallet
      </span>
    </div>
  )
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  // eBay Style Interactive States
  const [isWatchlisted, setIsWatchlisted] = useState(false)
  const [watchlistCount, setWatchlistCount] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [cartToast, setCartToast] = useState(false)
  const [similarProducts, setSimilarProducts] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [activeTab, setActiveTab] = useState('description')

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
          const item = {
            ...raw,
            id: raw.id || raw._id,
          }
          setProduct(item)
          setWatchlistCount(Number(item.watchersCount ?? 0))
          setIsWatchlisted(Boolean(item.isWatchlisted))
        }
      })
      .catch((err) => {
        if (!active) return
        productApi
          .marketplace()
          .then((marketRes) => {
            if (!active) return
            const list = marketRes.data || []
            const found = list.find(
              (item) => String(item.id) === String(id) || String(item._id) === String(id),
            )
            if (found) {
              const item = {
                ...found,
                id: found.id || found._id,
              }
              setProduct(item)
              setWatchlistCount(Number(item.watchersCount ?? 0))
              setIsWatchlisted(Boolean(item.isWatchlisted))
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

  // Fetch Similar Items from marketplace catalog
  useEffect(() => {
    let active = true
    setLoadingSimilar(true)
    productApi
      .marketplace()
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res?.data) ? res.data : []
        const filtered = list.filter(
          (p) => String(p.id || p._id) !== String(id) && p.status === 'active',
        )
        setSimilarProducts(filtered.slice(0, 6))
      })
      .catch(() => {
        if (active) setSimilarProducts([])
      })
      .finally(() => {
        if (active) setLoadingSimilar(false)
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
  const maxStock =
    typeof product?.quantity === 'number' && product.quantity > 0 ? product.quantity : 999
  const isOutOfStock = typeof product?.quantity === 'number' && product.quantity <= 0

  // WMS Logic: true if product is stored in Sellvro Inventory / Warehouse or WMS Verified
  const isWms = Boolean(
    product?.isWmsVerified === true ||
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

  const handleAddToCart = () => {
    setCartToast(true)
    setTimeout(() => setCartToast(false), 3500)
  }

  const toggleWatchlist = async () => {
    if (!product?.id) return
    const nextState = !isWatchlisted
    setIsWatchlisted(nextState)
    setWatchlistCount((c) => (nextState ? c + 1 : Math.max(0, c - 1)))

    try {
      const res = await productApi.watch(product.id)
      if (res && typeof res.isWatchlisted === 'boolean') {
        setIsWatchlisted(res.isWatchlisted)
        setWatchlistCount(Number(res.watchersCount ?? 0))
      }
    } catch {
      // Local optimistic toggle remains if offline or guest
    }
  }

  const handleShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2500)
    }
  }

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading product listing...</p>
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
  const vendorName =
    product.vendorName ||
    product.supplierBusinessName ||
    (product.supplier !== '—' ? product.supplier : '') ||
    'Sellvro Verified Merchant'
  const soldCount = Number(product.soldCount ?? 0)
  const viewsCount = Number(product.viewsCount ?? 0)
  const supplierTotalOrders = Number(product.supplierTotalOrders ?? 0)
  const supplierRating = product.supplierRating || (supplierTotalOrders > 0 ? '100%' : 'New')
  const conditionLabel =
    product.condition ||
    (isWms ? 'WMS Verified Authentic (Inspected)' : 'Brand New')

  return (
    <UserLayout>
      {/* Toast Alert: Added to Cart */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-xl animate-in slide-in-from-bottom-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Added to Cart!</h4>
            <p className="text-xs text-slate-500">
              {quantity}x {product.name} ready for wallet checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBuyNow}
            className="ml-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Checkout
          </button>
        </div>
      )}

      {/* Top eBay-style Sponsored / Brand Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/90 bg-white px-4 py-2.5 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-slate-500">Find similar items from</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-white text-[10px] font-extrabold uppercase">
              {product.brand ? product.brand.charAt(0) : 'S'}
            </span>
            <Link
              to={product.supplierId ? `/user/store/${product.supplierId}` : '#'}
              className="hover:text-blue-600 transition-colors"
            >
              {product.brand || vendorName || 'Sellvro Premier'}
            </Link>
          </div>
          <Link
            to={
              product.supplierId
                ? `/user/store/${product.supplierId}`
                : `/user/products?search=${encodeURIComponent(product.brand || product.category || '')}`
            }
            className="rounded-full border border-blue-600 px-3 py-0.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Shop store
          </Link>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Verified Listing
        </span>
      </div>

      {/* Main eBay 2-Column Product Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Vertical Thumbnails + Large Main Image (7 cols lg)   */}
        {/* ================================================================= */}
        <div className="lg:col-span-7">
          <div className="flex flex-col-reverse sm:flex-row gap-4 items-start">
            {/* 1. Vertical Thumbnail Strip (eBay signature gallery) */}
            {images.length > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[560px] pb-2 sm:pb-0 shrink-0 w-full sm:w-[72px]">
                {images.map((img, idx) => {
                  const isVid = isVideoUrl(img)
                  const isActive = activeImageIndex === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-lg border bg-white p-1 transition-all ${
                        isActive
                          ? 'border-2 border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                          : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {isVid ? (
                        <div className="relative h-full w-full bg-slate-900 rounded flex items-center justify-center text-white text-[9px] font-bold">
                          ▶ Video
                        </div>
                      ) : (
                        <img
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 2. Main Large Image Viewer */}
            <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-6 shadow-xs overflow-hidden group">
              {/* Top Left: Red Urgency Badge (like eBay IN 57 CARTS) */}
              <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5">
                <span className="inline-block rounded bg-[#e01020] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  {isWms ? 'WMS VERIFIED' : 'HOT ITEM'}
                </span>
                {isWms && (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-950/90 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    WAREHOUSE CUSTODY
                  </span>
                )}
              </div>

              {/* Top Right: Fullscreen Zoom & Watchlist Count Pill */}
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Expand image"
                  title="Expand image"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200 transition-colors hover:bg-slate-100"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-md border transition-all ${
                    isWatchlisted
                      ? 'bg-rose-50 border-rose-300 text-rose-600'
                      : 'bg-white/95 border-slate-200 text-slate-700 hover:text-rose-600'
                  }`}
                >
                  <span className="font-mono">{watchlistCount}</span>
                  <Heart
                    className={`h-3.5 w-3.5 ${isWatchlisted ? 'fill-rose-500 text-rose-500' : ''}`}
                  />
                </button>
              </div>

              {/* Prev / Next Image Chevrons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200 opacity-90 transition-opacity hover:opacity-100 hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200 opacity-90 transition-opacity hover:opacity-100 hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image / Video Render */}
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
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                />
              )}
            </div>
          </div>

          {/* Bottom Toolbar: Share + SKU Reference */}
          <div className="mt-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Share</span>
                </>
              )}
            </button>

            {product.sku && (
              <span className="font-mono text-xs text-slate-500">
                Item SKU: <strong className="text-slate-800">{product.sku}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: eBay Buy Box & Product Specifications (5 cols lg)   */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Main Product Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] leading-snug">
              {product.name}
              {product.brand ? ` by ${product.brand}` : ''}
              {product.sku ? ` (${product.sku})` : ''}
            </h1>
          </div>

          {/* 2. Seller Info Row (eBay Style Store Header) */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Link
                to={product.supplierId ? `/user/store/${product.supplierId}` : '#'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-extrabold text-xs shadow-2xs hover:opacity-90 transition-opacity"
              >
                {vendorName.charAt(0).toUpperCase()}
              </Link>
              <div>
                <div className="flex items-center gap-1.5">
                  <Link
                    to={product.supplierId ? `/user/store/${product.supplierId}` : '#'}
                    className="font-bold text-sm text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    {vendorName}
                  </Link>
                  {supplierTotalOrders > 0 ? (
                    <span className="text-xs text-slate-400 font-medium">({supplierTotalOrders})</span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">(New Seller)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="text-emerald-700 font-bold">
                    {supplierTotalOrders > 0 ? `${supplierRating} positive` : 'Verified Merchant'}
                  </span>
                  <span>•</span>
                  <Link
                    to={
                      product.supplierId
                        ? `/user/store/${product.supplierId}`
                        : `/user/products?search=${encodeURIComponent(vendorName)}`
                    }
                    className="hover:underline text-blue-600 font-medium"
                  >
                    Seller&apos;s other items
                  </Link>
                </div>
              </div>
            </div>

            <Link
              to="/user/disputes"
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
            >
              Message
            </Link>
          </div>

          {/* 3. Price & Currency Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold uppercase text-slate-400">Price:</span>
              <span className="text-3xl font-black text-[#111827] tracking-tight">
                US ${unitPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 4. Condition & Availability Section */}
          <div className="space-y-3 text-xs text-slate-700">
            {/* Condition Row */}
            <div className="grid grid-cols-4 items-center">
              <span className="font-semibold text-slate-500">Condition:</span>
              <div className="col-span-3 flex items-center gap-1.5">
                <strong className="font-bold text-slate-900">
                  {conditionLabel}
                </strong>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Quantity Row */}
            <div className="grid grid-cols-4 items-center">
              <span className="font-semibold text-slate-500">Quantity:</span>
              <div className="col-span-3 flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max={maxStock}
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={isOutOfStock}
                  className="h-9 w-16 rounded border border-slate-300 bg-white text-center text-sm font-bold text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500">
                  <strong className="text-slate-800">{product.quantity ?? 0} available</strong>
                  <span className="mx-1.5 text-slate-300">/</span>
                  <strong className={soldCount > 0 ? 'text-[#e01020] font-bold' : 'text-slate-500 font-semibold'}>
                    {soldCount} sold
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 5. The 3 Primary eBay Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* Buy It Now (Solid Vibrant Blue) */}
            <button
              type="button"
              disabled={!isAvailable || isOutOfStock}
              onClick={handleBuyNow}
              className="w-full rounded-full bg-[#3665f3] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2b54d6] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isOutOfStock ? 'Out of Stock' : 'Buy It Now'}
            </button>

            {/* Add to Cart (White with Blue border) */}
            <button
              type="button"
              disabled={!isAvailable || isOutOfStock}
              onClick={handleAddToCart}
              className="w-full rounded-full border-2 border-[#3665f3] bg-white py-2.5 text-sm font-bold text-[#3665f3] hover:bg-blue-50/60 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              Add to cart
            </button>

            {/* Add to Watchlist (White with Blue outline) */}
            <button
              type="button"
              onClick={toggleWatchlist}
              className={`w-full rounded-full border py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isWatchlisted
                  ? 'border-rose-400 bg-rose-50 text-rose-600'
                  : 'border-[#3665f3] bg-white text-[#3665f3] hover:bg-blue-50/40'
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${isWatchlisted ? 'fill-rose-500 text-rose-500' : ''}`}
              />
              <span>{isWatchlisted ? 'Watching' : 'Add to Watchlist'}</span>
            </button>
          </div>

          {/* 6. eBay Signature Urgency / Social Proof Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs text-slate-700 shadow-2xs">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 shrink-0 fill-amber-500" />
              <span>
                {watchlistCount > 0 ? (
                  <>
                    <strong>People want this.</strong> {watchlistCount}{' '}
                    {watchlistCount === 1 ? 'person is' : 'people are'} watching this.
                  </>
                ) : viewsCount > 0 ? (
                  <>
                    <strong>Popular listing.</strong> Viewed {viewsCount}{' '}
                    {viewsCount === 1 ? 'time' : 'times'} by buyers.
                  </>
                ) : (
                  <>
                    <strong>People want this.</strong> Add to watchlist to track stock &amp; price updates.
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {soldCount > 0 ? (
                  <>
                    <strong>This one&apos;s trending.</strong> {soldCount}{' '}
                    {soldCount === 1 ? 'has' : 'have'} already sold.
                  </>
                ) : (
                  <>
                    <strong>Fresh listing.</strong> In stock &amp; ready to ship.
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 7. Shipping, Returns, and Payments Box */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 text-xs shadow-2xs">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Shipping, returns, and payments
            </h3>

            {/* Shipping */}
            <div className="grid grid-cols-4 items-start gap-2">
              <span className="font-semibold text-slate-500">Shipping:</span>
              <div className="col-span-3 text-slate-800">
                <span className="font-bold text-emerald-700">Free Express Shipping</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Located in:{' '}
                  <strong>
                    {isWms
                      ? 'Sellvro Central WMS Hub, Lahore'
                      : product.location && product.location !== '—'
                      ? product.location
                      : 'Verified Supplier Facility'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Delivery */}
            <div className="grid grid-cols-4 items-start gap-2 border-t border-slate-100 pt-2.5">
              <span className="font-semibold text-slate-500">Delivery:</span>
              <div className="col-span-3 text-slate-800">
                <span className="font-bold">Estimated 2 - 4 business days</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Ships via Sellvro Express / Trax Logistics with live airway bill tracking.
                </span>
              </div>
            </div>

            {/* Returns */}
            <div className="grid grid-cols-4 items-start gap-2 border-t border-slate-100 pt-2.5">
              <span className="font-semibold text-slate-500">Returns:</span>
              <div className="col-span-3 text-slate-800">
                <span>30-day seller returns. Buyer protection guarantee applies.</span>
              </div>
            </div>

            {/* Payments */}
            <div className="grid grid-cols-4 items-start gap-2 border-t border-slate-100 pt-2.5">
              <span className="font-semibold text-slate-500">Payments:</span>
              <div className="col-span-3">
                <PaymentBadges />
              </div>
            </div>
          </div>

          {/* 8. "Shop with confidence" Trust Badges */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Shop with confidence
            </h3>

            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Top Rated Plus</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Top rated seller, verified warehouse inspection, fast shipping, and easy returns.{' '}
                  <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                    Learn more
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-slate-100 pt-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Sellvro Money Back Guarantee</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Get the exact item you ordered or your full money back into your wallet.{' '}
                  <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                    Learn more
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SIMILAR ITEMS CAROUSEL (eBay signature sponsored / recommended items) */}
      {/* ===================================================================== */}
      <div className="mt-12 border-t border-slate-200 pt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Similar Items</h2>
            <p className="text-xs text-slate-500">Sponsored recommendations based on this listing</p>
          </div>
          <Link
            to="/user/products"
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            See all <ChevronNext className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingSimilar ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : similarProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {similarProducts.map((item) => {
              const itemImg = item.image
                ? mediaUrl(item.image)
                : item.images?.[0]
                ? mediaUrl(item.images[0])
                : PLACEHOLDER_IMAGE

              return (
                <div
                  key={item.id || item._id}
                  className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:shadow-md transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-50 mb-2.5">
                    <img
                      src={itemImg}
                      alt={item.name}
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Add to watchlist"
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-400 hover:text-rose-500 shadow-2xs"
                    >
                      <Heart className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Title */}
                  <h4 className="line-clamp-2 text-xs font-medium text-slate-800 group-hover:text-blue-600 leading-snug">
                    {item.name}
                  </h4>

                  {/* Price */}
                  <div className="mt-auto pt-2">
                    <p className="text-sm font-black text-slate-950">
                      ${Number(item.price || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">Free shipping</p>
                  </div>

                  {/* Link wrapper */}
                  <Link
                    to={`/user/products/${item.id || item._id}`}
                    className="absolute inset-0 z-0"
                    aria-label={`View ${item.name}`}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No similar items available at this time.</p>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TABS: Description, Item Specifics, Warehouse & Shipping Details      */}
      {/* ===================================================================== */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`border-b-2 py-4 px-4 text-xs font-bold transition-colors ${
              activeTab === 'description'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Item Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specifics')}
            className={`border-b-2 py-4 px-4 text-xs font-bold transition-colors ${
              activeTab === 'specifics'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Item Specifics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`border-b-2 py-4 px-4 text-xs font-bold transition-colors ${
              activeTab === 'shipping'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Shipping &amp; WMS Custody
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 sm:p-8">
          {activeTab === 'description' && (
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Detailed Overview</h3>
              <p>{product.description || 'No detailed description provided by the seller.'}</p>
            </div>
          )}

          {activeTab === 'specifics' && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Item Specifics</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="text-slate-400 font-medium">Category</dt>
                  <dd className="font-semibold text-slate-800">{product.category || 'General'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="text-slate-400 font-medium">Brand</dt>
                  <dd className="font-semibold text-slate-800">{product.brand || 'Unbranded'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="text-slate-400 font-medium">Model / SKU</dt>
                  <dd className="font-mono font-semibold text-slate-800">{product.sku || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="text-slate-400 font-medium">Barcode / UPC</dt>
                  <dd className="font-mono text-slate-700">{product.barcode || 'N/A'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="text-slate-400 font-medium">Item Weight</dt>
                  <dd className="font-semibold text-slate-800">
                    {product.weight ? `${product.weight} ${product.weightUnit || 'gm'}` : 'Standard'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="text-slate-400 font-medium">Package Dimensions</dt>
                  <dd className="font-semibold text-slate-800">
                    {product.length && product.width && product.height
                      ? `${product.length} × ${product.width} × ${product.height} ${product.dimensionUnit || 'cm'}`
                      : 'Standard Box'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4 text-xs text-slate-700">
              <h3 className="text-sm font-bold text-slate-900">
                Fulfillment &amp; Warehouse Dispatch Information
              </h3>
              <p>
                {isWms
                  ? 'This item is physically received and authenticated in the Sellvro Central Warehouse (WMS). Upon checkout, your order will be automatically pushed to the warehouse dispatch queue for 24-48h courier pickup.'
                  : 'This item is maintained directly with the verified vendor. The supplier receives order notifications and labels to dispatch from their own facility.'}
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-slate-400 font-medium">Fulfillment Type:</span>
                  <strong className="text-slate-900">
                    {isWms ? 'Sellvro WMS Central Warehouse' : 'Supplier Self-Fulfillment'}
                  </strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Dispatch Facility:</span>
                  <strong className="text-slate-900">
                    {isWms
                      ? 'Sellvro Central Hub, Lahore'
                      : product.location && product.location !== '—'
                      ? product.location
                      : 'Vendor Stock Location'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close preview"
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={activeImage}
            alt={product.name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </UserLayout>
  )
}

export default ProductDetailPage
