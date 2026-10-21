import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Barcode,
  Boxes,
  CheckCircle2,
  Copy,
  DollarSign,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Warehouse,
} from 'lucide-react'
import PageHeader from '../admin/PageHeader.jsx'
import ProductPhotoUpload from './ProductPhotoUpload.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { productApi, getErrorMessage } from '../../lib/api.js'

function WmsInventoryProductForm({ onSwitchToSelf }) {
  const navigate = useNavigate()

  // WMS SKUs State (Loaded directly via API)
  const [wmsProducts, setWmsProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSku, setSelectedSku] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedSku, setCopiedSku] = useState(false)

  // Media & Photo State
  const [photos, setPhotos] = useState([])

  // Retail Price & Listing Description Customization
  const [retailPrice, setRetailPrice] = useState('')
  const [retailDescription, setRetailDescription] = useState('')

  // Optional stock addition
  const [additionalQty, setAdditionalQty] = useState('')

  // Submission States
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 1. Fetch WMS SKUs for this supplier from the API
  const fetchWmsSkus = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await productApi.wmsSkus()
      const list = Array.isArray(res?.data) ? res.data : []
      setWmsProducts(list)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch WMS SKUs from Sellvro inventory.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWmsSkus()
  }, [])

  // Currently selected product object
  const selectedProduct = useMemo(() => {
    if (!selectedSku) return null
    return wmsProducts.find((p) => p.sku === selectedSku) || null
  }, [selectedSku, wmsProducts])

  // Filtered list for search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return wmsProducts
    const q = searchQuery.toLowerCase().trim()
    return wmsProducts.filter(
      (p) =>
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)),
    )
  }, [wmsProducts, searchQuery])

  const [manualSkuInput, setManualSkuInput] = useState('')
  const [lookingUpSku, setLookingUpSku] = useState(false)

  // When a SKU is selected, auto-load its photos
  const handleSelectSku = (sku, explicitProduct = null) => {
    setSelectedSku(sku)
    setError('')
    setSuccess('')
    setAdditionalQty('')

    if (!sku) {
      setPhotos([])
      setRetailPrice('')
      setRetailDescription('')
      return
    }

    const found = explicitProduct || wmsProducts.find((p) => p.sku === sku)
    if (!found) return

    setRetailPrice(
      found.price !== undefined && found.price !== null && found.price !== ''
        ? String(found.price)
        : '',
    )
    setRetailDescription(found.description || '')

    const existingImages =
      Array.isArray(found.images) && found.images.length > 0
        ? found.images
        : found.image
        ? [found.image]
        : []

    const slots = Array(10).fill(null)
    existingImages.slice(0, 10).forEach((imgUrl, i) => {
      if (imgUrl) {
        slots[i] = {
          url: imgUrl,
          preview: imgUrl,
          isExisting: true,
          file: null,
        }
      }
    })
    setPhotos(slots)
  }

  // Direct manual SKU / barcode lookup via API
  const handleManualLookup = async (e) => {
    e?.preventDefault?.()
    const query = manualSkuInput.trim().toUpperCase()
    if (!query) {
      setError('Please enter a SKU or Barcode to look up.')
      return
    }

    setLookingUpSku(true)
    setError('')
    setSuccess('')
    try {
      const res = await productApi.wmsLookup(query)
      if (res?.data) {
        setWmsProducts((prev) => {
          const exists = prev.some((p) => p.sku === res.data.sku)
          return exists ? prev : [res.data, ...prev]
        })
        handleSelectSku(res.data.sku, res.data)
        setSuccess(`Found WMS record for SKU "${res.data.sku}"! Specifications and stock quantity loaded.`)
      } else {
        setError(`No warehouse inventory record found matching SKU "${query}".`)
      }
    } catch (err) {
      setError(getErrorMessage(err, `No warehouse inventory record found for SKU "${query}".`))
    } finally {
      setLookingUpSku(false)
    }
  }

  const handleCopySku = (skuText) => {
    if (!skuText) return
    navigator.clipboard?.writeText(skuText)
    setCopiedSku(true)
    setTimeout(() => setCopiedSku(false), 2000)
  }

  // Submit Handler: Attach Photos & Publish WMS Listing
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedProduct) {
      setError('Please select a WMS Product by SKU first.')
      return
    }

    const priceNum = Number(retailPrice)
    if (!retailPrice || Number.isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid retail selling price greater than 0.')
      return
    }

    const files = photos.filter((p) => p && p.file).map((p) => p.file)
    const existingImgs = photos
      .filter((p) => p && p.isExisting && (p.url || p.preview))
      .map((p) => p.url || p.preview)

    if (files.length === 0 && existingImgs.length === 0) {
      setError('Please upload at least 1 image for this WMS product listing.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        price: priceNum,
        description: retailDescription.trim(),
        existingImages: JSON.stringify(existingImgs),
        additionalQuantity: Number(additionalQty || 0),
      }

      const res = await productApi.attachWmsMedia(selectedProduct.id, payload, files)
      setSuccess(
        res.message ||
          `Photos attached successfully! "${selectedProduct.name}" (${selectedProduct.sku}) is now active on the marketplace.`,
      )

      // Refresh WMS products list
      fetchWmsSkus()

      // Revoke blob URLs
      photos.forEach((photo) => {
        if (photo?.preview?.startsWith('blob:')) URL.revokeObjectURL(photo.preview)
      })

      setTimeout(() => {
        navigate('/supplier/products')
      }, 1300)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update WMS product.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Supplier Panel • WMS Fulfillment Hub"
        title="Sell from WMS Inventory"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-xs font-bold text-primary-700 shadow-2xs">
            <Warehouse className="h-4 w-4 text-primary-600" />
            <span>WMS Inventory Channel</span>
          </span>
        }
        subtitle="Products in Sellvro WMS already have verified physical quantity, specifications, and SKU logged in the warehouse. Simply select the SKU below, attach your marketplace photos/videos, and publish."
      />

      {/* ── Notifications ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── SECTION 1: SKU SELECTION (Connected to API) ──────────────────── */}
        <Card className="p-5 shadow-xs border border-primary-100 bg-linear-to-b from-primary-50/30 to-white">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-xs shadow-2xs">
                  1
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Select WMS Inventory Item by SKU
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fetched directly from Sellvro Warehouse API for your supplier account
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchWmsSkus}
                disabled={loading}
                className="text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh WMS SKUs</span>
              </Button>
            </div>

            {/* WMS Integration Notice */}
            <div className="rounded-xl border border-primary-200/80 bg-primary-50/70 p-3 text-xs text-primary-950 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Sellvro Warehouse Database (Internal Intake Records): </span>
                <span>
                  External third-party WMS software API is not yet linked. Inventory SKUs and quantities are loaded directly from physical consignment stock logged at Sellvro Central Fulfillment Hub.
                </span>
              </div>
            </div>

            {/* SKU Dropdown & Quick Search Filter */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="wmsSkuDropdown"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  <Barcode className="h-3.5 w-3.5 text-primary-600" />
                  <span>Choose WMS SKU *</span>
                </label>
                <select
                  id="wmsSkuDropdown"
                  value={selectedSku}
                  onChange={(e) => handleSelectSku(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border-2 border-primary-200 bg-white px-3.5 text-sm font-semibold text-slate-900 shadow-xs transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer disabled:bg-slate-100"
                >
                  <option value="">
                    {loading
                      ? 'Connecting to Sellvro WMS Inventory…'
                      : wmsProducts.length === 0
                      ? '— No WMS products found for your account —'
                      : '-- Select Inbound WMS SKU to load details --'}
                  </option>
                  {filteredProducts.map((prod) => {
                    const vendorLabel =
                      prod.vendorName ||
                      prod.supplierBusinessName ||
                      (prod.supplier && prod.supplier !== '—' ? prod.supplier : '') ||
                      'Sellvro Supplier'
                    return (
                      <option key={prod.id || prod.sku} value={prod.sku}>
                        {prod.sku} — {prod.name} | Vendor: {vendorLabel} (Stock: {prod.quantity || 0} units | ${prod.price || 0})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="skuSearchInput"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <span>Filter / Search SKU</span>
                </label>
                <input
                  id="skuSearchInput"
                  type="text"
                  placeholder="e.g. SVRO-WMS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            {/* Direct Manual SKU Lookup */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <label
                htmlFor="manualSkuInput"
                className="mb-1 block text-xs font-bold text-slate-700"
              >
                Or Lookup by Consignment SKU / Barcode:
              </label>
              <div className="flex gap-2">
                <input
                  id="manualSkuInput"
                  type="text"
                  placeholder="e.g. Enter SKU from warehouse receipt..."
                  value={manualSkuInput}
                  onChange={(e) => setManualSkuInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleManualLookup()
                    }
                  }}
                  className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleManualLookup}
                  disabled={lookingUpSku || !manualSkuInput.trim()}
                  className="h-10 text-xs shrink-0"
                >
                  {lookingUpSku ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Search className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span>Lookup SKU</span>
                </Button>
              </div>
            </div>

            {/* Hint if no WMS items */}
            {!loading && wmsProducts.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">No WMS products found in your inventory yet.</p>
                <p className="mt-1 text-amber-800">
                  Because external 3rd-party WMS software API is not yet linked, items must be physically received and registered at the warehouse by the admin team. If you want to sell products stored at your own shop/facility instead, switch to direct selling below:
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onSwitchToSelf}
                  className="mt-3 bg-white text-xs border-amber-300 text-amber-900 hover:bg-amber-100/60"
                >
                  Switch to Supplier Direct Mode
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ── SECTION 2: WMS INVENTORY RECORD (Automatically Loaded from API) ── */}
        {selectedProduct ? (
          <Card className="overflow-hidden border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Verified WMS Inventory Spec Sheet</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Live from WMS API
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Warehouse SKU:</span>
                  <button
                    type="button"
                    onClick={() => handleCopySku(selectedProduct.sku)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-800 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    title="Click to copy SKU"
                  >
                    <span>{selectedProduct.sku}</span>
                    <Copy className="h-3 w-3 text-slate-400" />
                  </button>
                  {copiedSku && <span className="text-xs text-emerald-600 font-bold">Copied!</span>}
                </div>
              </div>
            </div>

            <div className="p-5">
              {/* Vendor & Supplier Origin Profile */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50/90 via-primary-50/50 to-indigo-50/30 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-xs">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-800">
                      Consignment Vendor / Supplier
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedProduct.vendorName ||
                        selectedProduct.supplierBusinessName ||
                        (selectedProduct.supplier && selectedProduct.supplier !== '—'
                          ? selectedProduct.supplier
                          : '') ||
                        'Sellvro Supplier'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
                      <span>
                        Vendor Code:{' '}
                        <strong className="font-mono font-bold text-slate-900">
                          {selectedProduct.supplierClientId || selectedProduct.supplierId || 'WMS-VEND'}
                        </strong>
                      </span>
                      {selectedProduct.supplierEmail && (
                        <span>
                          &bull; Email:{' '}
                          <strong className="text-slate-800">{selectedProduct.supplierEmail}</strong>
                        </span>
                      )}
                      {selectedProduct.supplierPhone && (
                        <span>
                          &bull; Phone:{' '}
                          <strong className="text-slate-800">{selectedProduct.supplierPhone}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Verified WMS Consignor
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Product Title & Description */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                      {selectedProduct.category || 'General Category'} &bull; {selectedProduct.brand || 'Unbranded'}
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {selectedProduct.name}
                    </h2>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      WMS Catalog Description:
                    </label>
                    <p className="mt-1 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 border border-slate-100">
                      {selectedProduct.description || 'No description provided in warehouse intake.'}
                    </p>
                  </div>

                  {/* Physical Warehouse Attributes */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <span className="block text-[11px] font-semibold text-slate-400">Wholesale Base Cost</span>
                      <span className="mt-0.5 block text-base font-bold text-slate-900">
                        ${Number(selectedProduct.price || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <span className="block text-[11px] font-semibold text-slate-400">Weight</span>
                      <span className="mt-0.5 block text-sm font-bold text-slate-800">
                        {selectedProduct.weight || '0'} {selectedProduct.weightUnit || 'gm'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <span className="block text-[11px] font-semibold text-slate-400">Dimensions</span>
                      <span className="mt-0.5 block text-sm font-bold text-slate-800">
                        {selectedProduct.length || '0'}×{selectedProduct.width || '0'}×{selectedProduct.height || '0'} {selectedProduct.dimensionUnit || 'cm'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <span className="block text-[11px] font-semibold text-slate-400">Barcode</span>
                      <span className="mt-0.5 block text-xs font-mono font-bold text-slate-800 truncate">
                        {selectedProduct.barcode || 'Generated'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warehouse Custody & Physical Quantity Column */}
                <div className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-primary-200 bg-primary-50/40 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-950">
                        Physical WMS Custody
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-white p-3.5 shadow-2xs border border-primary-100">
                      <span className="block text-xs font-semibold text-slate-500">
                        Current Physical Warehouse Stock
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-primary-700">
                          {selectedProduct.quantity || 0}
                        </span>
                        <span className="text-xs font-bold text-slate-600">units in WMS</span>
                      </div>
                      <Badge tone={selectedProduct.quantity > 0 ? 'success' : 'danger'} className="mt-2">
                        {selectedProduct.quantity > 0 ? 'Verified In Warehouse' : 'Out of Stock'}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0 text-primary-600 mt-0.5" />
                      <span>
                        <strong>Storage Location:</strong>{' '}
                        {selectedProduct.location || 'Sellvro Central WMS Hub - Bin Area'}
                      </span>
                    </div>
                  </div>

                  {/* Optional Stock Replenishment Input */}
                  <div className="rounded-xl border border-primary-200 bg-white p-3.5 shadow-2xs">
                    <label
                      htmlFor="inboundAddQty"
                      className="block text-xs font-bold text-slate-800"
                    >
                      + Add Inbound Stock (Optional)
                    </label>
                    <p className="text-[11px] text-slate-400 mb-2">
                      If you are sending extra physical stock to the warehouse:
                    </p>
                    <div className="relative">
                      <input
                        id="inboundAddQty"
                        type="number"
                        min="0"
                        placeholder="e.g. 25"
                        value={additionalQty}
                        onChange={(e) => setAdditionalQty(e.target.value.replace(/-/g, ''))}
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-8 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                      <Plus className="absolute right-2.5 top-3 h-4 w-4 text-primary-600 pointer-events-none" />
                    </div>

                    {Number(additionalQty) > 0 && (
                      <div className="mt-2 text-xs text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        Total after inbound:{' '}
                        <strong>
                          {Number(selectedProduct.quantity || 0) + Number(additionalQty)} units
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          /* Empty placeholder prompt when no SKU is chosen */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Boxes className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-base font-bold text-slate-800">
              No WMS Product Selected
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Please choose a SKU from the dropdown in Step 1. The product&apos;s verified warehouse stock,
              wholesale price, and technical specifications will be loaded automatically from the WMS API.
            </p>
          </div>
        )}

        {/* ── SECTION 3: RETAIL SELLING PRICE & MARKETPLACE DESCRIPTION ───── */}
        <Card className="p-5 shadow-xs border border-slate-200 bg-white">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-2xs">
                  2
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Retail Selling Price &amp; Marketplace Description
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set your buyer retail price and customize the marketing description for the marketplace.
                  </p>
                </div>
              </div>

              {selectedProduct && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Customizable by Supplier
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 pt-1">
              {/* Left Column: Retail Selling Price */}
              <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div>
                  <label
                    htmlFor="retailPriceInput"
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Marketplace Retail Selling Price *</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    The price buyers see and pay on the Sellvro marketplace.
                  </p>

                  <div className="mt-2.5 relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      $
                    </span>
                    <input
                      id="retailPriceInput"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 59.99"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                      disabled={!selectedProduct}
                      className="h-11 w-full rounded-xl border-2 border-slate-300 bg-white pl-8 pr-4 text-base font-extrabold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  {/* Wholesale Base vs Retail Margin Breakdown */}
                  {selectedProduct && (
                    <div className="mt-3.5 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-100">
                        <span>WMS Wholesale Base Cost:</span>
                        <strong className="text-slate-800">
                          ${Number(selectedProduct.price || 0).toFixed(2)}
                        </strong>
                      </div>

                      {Number(retailPrice) > 0 && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1 font-medium">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                            Estimated Margin:
                          </span>
                          <span
                            className={`font-bold ${
                              Number(retailPrice) >= Number(selectedProduct.price || 0)
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }`}
                          >
                            ${(Number(retailPrice) - Number(selectedProduct.price || 0)).toFixed(2)}
                            {Number(retailPrice) > 0 &&
                              ` (${(
                                ((Number(retailPrice) - Number(selectedProduct.price || 0)) /
                                  Number(retailPrice)) *
                                100
                              ).toFixed(1)}%)`}
                          </span>
                        </div>
                      )}

                      {Number(retailPrice) > 0 &&
                        Number(retailPrice) < Number(selectedProduct.price || 0) && (
                          <p className="mt-1.5 text-[11px] text-rose-600 font-semibold">
                            ⚠️ Note: Retail price is lower than WMS wholesale base cost!
                          </p>
                        )}
                    </div>
                  )}
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  💡 Physical stock custody remains verified in WMS. Only listing price changes.
                </div>
              </div>

              {/* Right Column: Marketplace Description */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="retailDescriptionInput"
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      <FileText className="h-4 w-4 text-primary-600" />
                      <span>Marketplace Product Description</span>
                    </label>

                    {selectedProduct && selectedProduct.description && (
                      <button
                        type="button"
                        onClick={() => setRetailDescription(selectedProduct.description || '')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                        title="Reset to warehouse intake description"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset to WMS Intake Note</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Add customer-appealing copy, bullet points, styling, or warranty details for buyers.
                  </p>

                  <div className="mt-2.5">
                    <textarea
                      id="retailDescriptionInput"
                      rows={5}
                      placeholder={
                        selectedProduct
                          ? 'Write an attractive marketing description for this WMS item...'
                          : 'Select a WMS SKU above to edit description...'
                      }
                      value={retailDescription}
                      onChange={(e) => setRetailDescription(e.target.value)}
                      disabled={!selectedProduct}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100 disabled:text-slate-400 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Formatting: plain text or paragraphs supported</span>
                  <span>{retailDescription.length} characters</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── SECTION 4: ADD / UPLOAD PRODUCT PHOTOS & VIDEOS ─────────────── */}
        <Card className="p-5 shadow-xs border border-slate-200 bg-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-xs shadow-2xs">
                3
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Upload Product Photos &amp; Video Demonstrations
                </h3>
                <p className="text-xs text-slate-500">
                  Attach high-quality product images for buyer store listings. Minimum 1 photo required.
                </p>
              </div>
            </div>

            <ProductPhotoUpload
              photos={photos}
              onChange={setPhotos}
              onError={setError}
              minPhotos={1}
              helperText={
                selectedProduct
                  ? `Attach photos for "${selectedProduct.name}" (${selectedProduct.sku}). Click any empty slot to add photos or video.`
                  : 'Select a WMS product SKU above first to view and upload listing media.'
              }
              disabled={!selectedProduct}
            />
          </div>
        </Card>

        {/* ── SECTION 4: ACTIONS & SUBMIT ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSwitchToSelf}
            className="border-slate-300 text-xs"
          >
            Switch to Direct / Self Fulfillment
          </Button>

          <Button
            type="submit"
            disabled={submitting || !selectedProduct}
            className="shadow-sm"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                <span>Publishing Directly to Marketplace…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                <span>Publish to Marketplace (Instant Live • No Admin Approval Needed)</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default WmsInventoryProductForm
