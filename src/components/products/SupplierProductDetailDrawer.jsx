import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  SquarePen,
  Barcode,
  Sparkles,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  Clock,
  Truck,
  MapPin,
  Tag,
  DollarSign,
  TrendingUp,
  Award,
  Globe,
  Scissors,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import ProductImage from '../ui/ProductImage.jsx'
import { mediaUrl } from '../../lib/api.js'
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_TONE } from '../../lib/productStatus.js'

export default function SupplierProductDetailDrawer({
  isOpen,
  onClose,
  product,
  onOpenBarcode,
  onOpenSuggestions,
  onOpenPriority,
}) {
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  if (!isOpen || !product) return null

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image
      ? [product.image]
      : []

  const activeImage = images[activeImageIdx] || images[0] || null

  const price = Number(product.price || 0)
  const feePercent = Number(product.commission || 8)
  const feeAmount = (price * feePercent) / 100
  const netEarnings = price - feeAmount

  const isWms = Boolean(product.isWmsVerified || product.inWarehouse || product.fulfillBy === 'warehouse')
  const statusTone = PRODUCT_STATUS_TONE[product.status] || 'neutral'
  const statusLabel = PRODUCT_STATUS_LABEL[product.status] || product.status || 'Active'

  const keywords = Array.isArray(product.productKeywords) ? product.productKeywords : []
  const sisterSkus = Array.isArray(product.sisterSkus) ? product.sisterSkus : []

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-sm font-extrabold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                {product.sku}
              </span>
              <Badge tone={statusTone} className="font-bold">
                {statusLabel}
              </Badge>
              {isWms && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  WMS Verified
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-6 py-2.5 shrink-0 text-xs">
            <Button
              as={Link}
              to={`/supplier/products/${product.id}/edit`}
              size="sm"
              className="h-8 gap-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <SquarePen className="h-3.5 w-3.5" />
              Edit Product
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenBarcode?.(product)
              }}
              className="h-8 gap-1.5 font-semibold text-slate-700"
            >
              <Barcode className="h-3.5 w-3.5 text-slate-500" />
              Barcode
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenSuggestions?.(product)
              }}
              className="h-8 gap-1.5 font-semibold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Suggestions ({sisterSkus.length})
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenPriority?.(product)
              }}
              className="h-8 gap-1.5 font-semibold text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100/50"
            >
              <BarChart3 className="h-3.5 w-3.5 text-purple-600" />
              Ranking ({product.rankingPriority || 'standard'})
            </Button>

            <a
              href={`/product/${product.id}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
            >
              <span>View Live</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Category Banner */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                <Tag className="h-3.5 w-3.5" />
                <span>{product.category || 'General'}</span>
                {product.subcategory && (
                  <span className="text-slate-400">› {product.subcategory}</span>
                )}
                {product.brand && (
                  <span className="text-slate-500 font-normal ml-1">• Brand: <strong>{product.brand}</strong></span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
                {product.name}
              </h2>
            </div>

            {/* Media Gallery */}
            <div className="space-y-3">
              <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                {activeImage ? (
                  <img
                    src={mediaUrl(activeImage)}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs">No image available</div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        activeImageIdx === idx ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={mediaUrl(img)}
                        alt={`Thumb ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Key Economics & Inventory Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Retail Price</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  ${price.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-[11px] font-semibold text-emerald-800">You Earn (Net)</p>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                  +${netEarnings.toFixed(2)}
                </p>
                <p className="text-[10px] text-emerald-600/80 font-medium">Fee: {feePercent}%</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Inventory Stock</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {product.quantity ?? 0} <span className="text-xs font-normal text-slate-500">units</span>
                </p>
                {isWms && <p className="text-[10px] font-bold text-emerald-600">WMS Synced</p>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Stock Alert</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {product.stockAlert ?? 10} <span className="text-xs font-normal text-slate-500">low mark</span>
                </p>
              </div>
            </div>

            {/* Product Specifications & Shipping */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Shipping &amp; Physical Specifications
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Condition</span>
                  <span className="font-semibold text-slate-700">{product.condition || 'Brand New'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Package Weight</span>
                  <span className="font-semibold text-slate-700">
                    {product.weight ? `${product.weight} ${product.weightUnit || 'gm'}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Dimensions (L × W × H)</span>
                  <span className="font-semibold text-slate-700">
                    {product.length && product.width && product.height
                      ? `${product.length} × ${product.width} × ${product.height} ${product.dimensionUnit || 'cm'}`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Handling Time</span>
                  <span className="font-semibold text-slate-700">{product.handlingTime || '1 business day'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Delivery Time</span>
                  <span className="font-semibold text-slate-700">{product.deliveryTime || '2-3 Days'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Location</span>
                  <span className="font-semibold text-slate-700">{product.location || 'Central Facility'}</span>
                </div>
              </div>
            </div>

            {/* Customization Details */}
            {product.customizationAvailable && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Scissors className="h-4 w-4 text-indigo-600" />
                  <span>Customizable Product Enabled</span>
                </div>
                <p className="text-xs text-indigo-800/80 leading-relaxed">
                  {product.customizationInstructions || 'Buyer can provide personalized requirements at checkout.'}
                </p>
              </div>
            )}

            {/* Sister SKUs & Variations */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Sister SKUs (Linked Variations)
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">
                  Variation: <strong>{product.sisterVariationType || 'Color'}</strong>
                </span>
              </div>

              {sisterSkus.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No sister SKUs linked. Use the &quot;Suggestions&quot; button above to link other colors/sizes.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sisterSkus.map((sku) => (
                    <span
                      key={sku}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-900"
                    >
                      <Sparkles className="h-3 w-3 text-amber-600" />
                      {sku}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Product Research & Ranking Priority */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  Market Research &amp; Landing Page Priority
                </h3>
                <span className="rounded-full bg-purple-100 border border-purple-300 px-2.5 py-0.5 text-xs font-bold uppercase text-purple-900">
                  {product.rankingPriority || 'standard'} Priority
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="rounded-xl bg-white border border-purple-100 p-2.5">
                  <span className="text-slate-400 block text-[10px]">Search Volume</span>
                  <span className="font-extrabold text-slate-800">
                    {Number(product.globalSearchVolume || 0).toLocaleString()} /mo
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-purple-100 p-2.5">
                  <span className="text-slate-400 block text-[10px]">Monthly Sales</span>
                  <span className="font-extrabold text-slate-800">
                    {Number(product.globalMonthlySales || 0).toLocaleString()} units
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-purple-100 p-2.5">
                  <span className="text-slate-400 block text-[10px]">US Market Sales</span>
                  <span className="font-extrabold text-slate-800">
                    {Number(product.usMarketAverageSales || 0).toLocaleString()} units
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-purple-100 p-2.5">
                  <span className="text-slate-400 block text-[10px]">Ranking Score</span>
                  <span className="font-extrabold text-purple-700">
                    {Number(product.rankingScore || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {keywords.length > 0 && (
                <div className="pt-2 border-t border-purple-100">
                  <span className="text-[11px] font-bold text-purple-900 block mb-1.5">
                    Target High-Intent Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-800"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Product Description
              </h3>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {product.description || 'No description provided.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
