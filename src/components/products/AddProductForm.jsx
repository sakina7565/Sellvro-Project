import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Barcode,
  Boxes,
  Building2,
  CheckCircle2,
  FileText,
  LayoutGrid,
  Lock,
  PackagePlus,
  Plus,
  Save,
  Send,
  Sparkles,
  Tag,
  Warehouse,
} from 'lucide-react'
import PageHeader from '../admin/PageHeader.jsx'
import AddProductSection from './AddProductSection.jsx'
import ProductPhotoUpload from './ProductPhotoUpload.jsx'
import FormLabel from './FormLabel.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { categoryApi, productApi, adminApi, walletApi, getErrorMessage } from '../../lib/api.js'

const FIELD_CLASS =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const DISABLED_FIELD_CLASS =
  'h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 cursor-not-allowed select-none shadow-none focus:outline-none'

const TEXTAREA_CLASS =
  'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const DISABLED_TEXTAREA_CLASS =
  'w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed select-none shadow-none focus:outline-none'

function StatusBadge({ panel, publishActive, isWmsExisting }) {
  if (panel === 'admin' && publishActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        Live on marketplace
      </span>
    )
  }
  if (panel === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
        Needs approval later
      </span>
    )
  }
  if (isWmsExisting) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
        <Warehouse className="h-3.5 w-3.5 text-primary-600" /> WMS Inventory Update
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
      Pending Approval
    </span>
  )
}

function makeSku() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SVRO-${suffix}`
}

const EMPTY_FORM = {
  name: '',
  category: '',
  brand: '',
  description: '',
  sku: '',
  price: '',
  fulfillBy: 'warehouse',
  quantity: '',
  weight: '',
  weightUnit: 'gm',
  length: '',
  width: '',
  height: '',
  dimensionUnit: 'cm',
  location: '',
  supplierAssign: '',
  barcode: '',
  commission: '',
  country: '',
}

function AddProductForm({ eyebrow, panel = 'supplier', defaultFulfillBy, onSwitchToWms }) {
  const navigate = useNavigate()
  const initialFulfillBy = defaultFulfillBy || (panel === 'supplier' ? 'self' : '')
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    fulfillBy: initialFulfillBy,
    sku: makeSku(),
  }))
  const [photos, setPhotos] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [publishActive, setPublishActive] = useState(panel === 'admin')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [marketplaceFee, setMarketplaceFee] = useState(8)

  // Load Admin-Configured Marketplace Platform Fee
  useEffect(() => {
    let active = true
    walletApi
      .marketplaceFee()
      .then((res) => {
        if (active && res?.marketplaceFeePercent !== undefined) {
          setMarketplaceFee(Number(res.marketplaceFeePercent))
        }
      })
      .catch(() => {
        walletApi
          .settings()
          .then((res) => {
            if (active && res?.data?.marketplaceFeePercent !== undefined) {
              setMarketplaceFee(Number(res.data.marketplaceFeePercent))
            }
          })
          .catch(() => {})
      })
    return () => {
      active = false
    }
  }, [])

  // ── WMS Inventory Mode States (for Supplier) ──────────────────────────────
  const [supplierWmsProducts, setSupplierWmsProducts] = useState([])
  const [loadingWmsProducts, setLoadingWmsProducts] = useState(false)
  const [selectedWmsProductId, setSelectedWmsProductId] = useState('')
  const [additionalQty, setAdditionalQty] = useState('')
  // 'existing' = restock/add media to existing WMS SKU; 'new' = submit new product for WMS entry
  const [wmsSubMode, setWmsSubMode] = useState(initialFulfillBy === 'warehouse' ? 'existing' : 'new')

  // Is form locked (read-only) for base details?
  const isWmsMode = panel === 'supplier' && form.fulfillBy === 'warehouse'
  const isWmsExisting = isWmsMode && wmsSubMode === 'existing'
  const isFormLocked = isWmsExisting

  // Load Categories
  useEffect(() => {
    let active = true
    categoryApi
      .list()
      .then((data) => {
        if (active) setCategories(data.data || [])
      })
      .catch(() => {
        if (active) setCategories([])
      })
    return () => {
      active = false
    }
  }, [])

  // Load Suppliers (Admin panel only)
  useEffect(() => {
    if (panel !== 'admin') return undefined
    let active = true
    adminApi
      .suppliers()
      .then((data) => {
        if (active) setSuppliers(data.data || [])
      })
      .catch(() => {
        if (active) setSuppliers([])
      })
    return () => {
      active = false
    }
  }, [panel])

  // Load Supplier's WMS Products (Supplier panel only)
  const loadSupplierWmsProducts = useCallback(() => {
    if (panel !== 'supplier') return
    setLoadingWmsProducts(true)
    productApi
      .mine()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : []
        const wmsList = list.filter(
          (p) => p.fulfillBy === 'warehouse' || p.inWarehouse === true,
        )
        setSupplierWmsProducts(wmsList)
      })
      .catch(() => {
        setSupplierWmsProducts([])
      })
      .finally(() => {
        setLoadingWmsProducts(false)
      })
  }, [panel])

  useEffect(() => {
    loadSupplierWmsProducts()
  }, [loadSupplierWmsProducts])

  // Handle switching Storage & Fulfillment Option (WMS vs Supplier Direct)
  const handleFulfillmentChange = (e) => {
    const val = e.target.value
    setError('')
    setSuccess('')
    setSelectedWmsProductId('')
    setAdditionalQty('')

    if (val === 'warehouse') {
      setForm({
        ...EMPTY_FORM,
        fulfillBy: 'warehouse',
        sku: '',
      })
      setPhotos([])
      setWmsSubMode('existing')
    } else {
      // 'self' -> Keep with supplier, sell direct on marketplace
      setForm({
        ...EMPTY_FORM,
        fulfillBy: 'self',
        sku: makeSku(),
      })
      setPhotos([])
      setWmsSubMode('new')
    }
  }

  // Handle selecting an existing WMS Product from the SKU dropdown
  const handleSelectWmsProduct = (e) => {
    const prodId = e.target.value
    setSelectedWmsProductId(prodId)
    setAdditionalQty('')
    setError('')
    setSuccess('')

    if (!prodId) {
      setForm({
        ...EMPTY_FORM,
        fulfillBy: 'warehouse',
        sku: '',
      })
      setPhotos([])
      return
    }

    const found = supplierWmsProducts.find((p) => p.id === prodId)
    if (!found) return

    setForm({
      name: found.name || '',
      category: found.category || '',
      brand: found.brand || '',
      description: found.description || '',
      sku: found.sku || '',
      price: found.price !== undefined ? String(found.price) : '',
      quantity: found.quantity !== undefined ? String(found.quantity) : '0',
      fulfillBy: 'warehouse',
      weight: found.weight || '',
      weightUnit: found.weightUnit || 'gm',
      length: found.length || '',
      width: found.width || '',
      height: found.height || '',
      dimensionUnit: found.dimensionUnit || 'cm',
      location: found.location || '',
      supplierAssign: '',
      barcode: found.barcode || '',
      commission: found.commission !== undefined ? String(found.commission) : '',
      country: found.country || '',
    })

    // Populate existing photos into slots
    const existingImages = Array.isArray(found.images) && found.images.length > 0
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

  const selectedWmsProduct = supplierWmsProducts.find((p) => p.id === selectedWmsProductId)

  const updateField = (field) => (event) => {
    if (isFormLocked) return
    let val = event.target.value
    if (['price', 'quantity', 'commission', 'weight', 'length', 'width', 'height'].includes(field)) {
      if (val.includes('-')) {
        val = val.replace(/-/g, '')
      }
      const num = Number(val)
      if (!Number.isNaN(num) && num < 0) return
    }
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const buildPayload = (status) => ({
    name: form.name,
    category: form.category,
    brand: form.brand,
    description: form.description,
    sku: form.sku,
    price: form.price,
    fulfillBy: form.fulfillBy,
    quantity: form.quantity,
    weight: form.weight,
    weightUnit: form.weightUnit,
    length: form.length,
    width: form.width,
    height: form.height,
    dimensionUnit: form.dimensionUnit,
    location: form.location,
    barcode: form.barcode,
    commission: panel === 'supplier' ? marketplaceFee : form.commission,
    country: form.country,
    status,
    supplier: form.supplierAssign,
    publishActive: publishActive ? 'true' : 'false',
  })

  // Save / Update Handler
  const saveProduct = async (status) => {
    setError('')
    setSuccess('')

    // ── WMS EXISTING RESTOCK & MEDIA FLOW ─────────────────────────────────────
    if (isWmsExisting) {
      if (!selectedWmsProductId) {
        setError('Please select an existing WMS product from the SKU dropdown above.')
        return
      }

      const addQtyNum = Number(additionalQty || 0)
      const newFiles = photos.filter((p) => p && p.file).map((p) => p.file)

      if (addQtyNum <= 0 && newFiles.length === 0) {
        setError('Please enter additional stock quantity to inbound or upload at least one new photo/video.')
        return
      }

      setSubmitting(true)
      try {
        const remainingExistingImages = photos
          .filter((p) => p && p.isExisting && (p.url || p.preview))
          .map((p) => p.url || p.preview)

        const payload = {
          additionalQuantity: addQtyNum,
          existingImages: JSON.stringify(remainingExistingImages),
        }

        const res = await productApi.update(selectedWmsProductId, payload, newFiles)
        setSuccess(
          res.message ||
            `WMS Product "${form.name}" updated successfully with ${addQtyNum > 0 ? `+${addQtyNum} stock units` : ''}${
              newFiles.length > 0 ? ` and ${newFiles.length} new photos` : ''
            }!`,
        )
        setAdditionalQty('')

        // Revoke blob URLs
        photos.forEach((photo) => {
          if (photo?.preview?.startsWith('blob:')) URL.revokeObjectURL(photo.preview)
        })

        // Reload supplier's WMS products list
        loadSupplierWmsProducts()

        window.setTimeout(() => navigate('/supplier/products'), 1200)
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update WMS product.'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    // ── STANDARD PRODUCT CREATION FLOW (Self / Direct OR Admin) ──────────────
    if (panel === 'admin') {
      if (!form.supplierAssign) {
        setError('Please assign a supplier.')
        return
      }
    } else if (panel !== 'supplier') {
      setError('Unknown panel type.')
      return
    }

    if (!form.name.trim() || !form.category) {
      setError('Product name and category are required.')
      return
    }
    if (form.price === '' || Number(form.price) <= 0) {
      setError('A valid positive price greater than 0 is required.')
      return
    }
    if (form.quantity !== '' && Number(form.quantity) < 0) {
      setError('Quantity cannot be negative.')
      return
    }
    if (form.commission !== '' && Number(form.commission) < 0) {
      setError('Commission cannot be negative.')
      return
    }
    if (panel === 'supplier' && !form.fulfillBy) {
      setError('Please select whether to store product in Sellvro Inventory (WMS) or keep with supplier.')
      return
    }

    const files = photos.filter(Boolean).map((item) => item.file)
    if (panel === 'supplier' && files.length < 2) {
      setError(
        files.length === 0
          ? 'Please upload at least 2 images for the product. Multiple images are required.'
          : 'Please upload at least 2 images. You cannot submit a product with only 1 image.',
      )
      return
    }

    setSubmitting(true)
    try {
      const data =
        panel === 'admin'
          ? await adminApi.createProduct(buildPayload(status), files)
          : await productApi.create(buildPayload(status), files)
      setSuccess(data.message)
      photos.forEach((photo) => {
        if (photo?.preview?.startsWith('blob:')) URL.revokeObjectURL(photo.preview)
      })
      setPhotos([])
      setForm({ ...EMPTY_FORM, sku: makeSku() })
      if (status !== 'draft') {
        const redirect = panel === 'admin' ? '/admin/products' : '/supplier/products'
        window.setTimeout(() => navigate(redirect), 900)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save product.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (panel === 'admin') {
      saveProduct(publishActive ? 'active' : 'pending_approval')
      return
    }
    if (isWmsExisting) {
      saveProduct('approved')
      return
    }
    saveProduct('pending_approval')
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={isWmsExisting ? 'Restock / Manage WMS Product' : 'Add Product'}
        action={<StatusBadge panel={panel} publishActive={publishActive} isWmsExisting={isWmsExisting} />}
        className="mb-6"
      />

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </p>
        )}

        {/* ── TOP PRIMARY SELECTOR: Storage & Fulfillment Option ───────────── */}
        {panel === 'supplier' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label
                  htmlFor="fulfillmentModeSelect"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <Warehouse className="h-4 w-4 text-primary" />
                  <span>Storage &amp; Fulfillment Option *</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select whether this product is stored in Sellvro&apos;s WMS warehouse or kept at your own facility.
                </p>
              </div>

              <div className="w-full sm:w-auto sm:min-w-[340px]">
                <select
                  id="fulfillmentModeSelect"
                  value={form.fulfillBy}
                  onChange={handleFulfillmentChange}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 shadow-xs transition-colors focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
                >
                  <option value="warehouse">
                    Store in Sellvro Inventory (WMS Fulfillment)
                  </option>
                  <option value="self">
                    Keep at My Own Facility (Supplier Direct / Marketplace Only)
                  </option>
                </select>
              </div>
            </div>

            {/* Mode Explanation Banner */}
            {isWmsMode ? (
              <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50/70 p-4 text-xs text-primary-950">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 rounded-md bg-primary-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-xs">
                      WMS MODE
                    </span>
                    <span className="leading-relaxed">
                      <strong>Sellvro Inventory (WMS Fulfillment):</strong> Base product information is
                      locked to maintain catalog &amp; warehouse barcode consistency. You can select an
                      existing WMS SKU to replenish warehouse stock and upload additional media.
                    </span>
                  </div>

                  {/* Sub-mode switcher in WMS mode */}
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-primary-200 bg-white p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setWmsSubMode('existing')
                        setError('')
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        wmsSubMode === 'existing'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Restock Existing SKU
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWmsSubMode('new')
                        setSelectedWmsProductId('')
                        setForm({ ...EMPTY_FORM, fulfillBy: 'warehouse', sku: makeSku() })
                        setPhotos([])
                        setError('')
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        wmsSubMode === 'new'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      New Inbound Item
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <span className="shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-xs">
                  DIRECT SELLING
                </span>
                <span className="leading-relaxed">
                  <strong>Supplier Direct Fulfillment (Self):</strong> You will hold inventory at your
                  own warehouse/shop and fulfill orders directly. Complete the full product form below
                  with at least 2 images and submit for admin marketplace approval.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── WMS SKU DROPDOWN SECTION (Active when in WMS Existing mode) ──── */}
        {isWmsExisting && (
          <div className="rounded-2xl border border-primary-200 bg-linear-to-b from-primary-50/40 to-white p-5 shadow-xs">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="wmsSkuSelect"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <Barcode className="h-4 w-4 text-primary" />
                  <span>Select WMS Product / SKU *</span>
                </label>
                <span className="text-xs font-medium text-slate-500">
                  {supplierWmsProducts.length} WMS product(s) available
                </span>
              </div>

              <select
                id="wmsSkuSelect"
                value={selectedWmsProductId}
                onChange={handleSelectWmsProduct}
                className="h-11 w-full rounded-xl border border-primary-300 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-xs transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
              >
                <option value="">
                  {loadingWmsProducts
                    ? 'Loading your WMS products…'
                    : supplierWmsProducts.length === 0
                    ? '— No WMS products found in your inventory —'
                    : '-- Select a WMS Product to Restock or Add Photos --'}
                </option>
                {supplierWmsProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} (Current Stock: {p.quantity || 0} | ${p.price || 0})
                  </option>
                ))}
              </select>

              {/* Informative Selected Product Card */}
              {selectedWmsProduct ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedWmsProduct.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-primary-700">
                          {selectedWmsProduct.sku}
                        </span>
                        <span>&bull;</span>
                        <span>{selectedWmsProduct.category}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700">${selectedWmsProduct.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      Current Stock: <strong className="text-slate-900">{selectedWmsProduct.quantity || 0}</strong>
                    </span>
                    <Badge tone={selectedWmsProduct.quantity > 5 ? 'success' : 'warning'}>
                      {selectedWmsProduct.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  💡 Select an existing SKU from the dropdown above to load its locked specs, add inbound
                  stock, and upload additional product photos/videos.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1: PRODUCT PHOTOS & MEDIA ──────────────────────────────── */}
        <AddProductSection
          step="1"
          title={isWmsExisting ? 'Product media & photos (Add more media)' : 'Product photos'}
        >
          <ProductPhotoUpload
            photos={photos}
            onChange={setPhotos}
            onError={setError}
            minPhotos={panel === 'supplier' && !isWmsExisting ? 2 : 1}
            helperText={
              isWmsExisting
                ? selectedWmsProduct
                  ? 'Existing photos are displayed below. Click any empty slot to upload additional photos or videos.'
                  : 'Select a WMS product above to view its existing media and upload additional photos.'
                : undefined
            }
          />
        </AddProductSection>

        {/* ── STEP 2: PRODUCT DETAILS ─────────────────────────────────────── */}
        <AddProductSection
          step="2"
          title={
            <div className="flex items-center justify-between w-full">
              <span>Product details</span>
              {isFormLocked && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Locked for WMS Inventory</span>
                </span>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            {/* Product Name */}
            <div>
              <div className="flex items-center justify-between">
                <FormLabel icon={Tag} htmlFor="productName" required={!isFormLocked}>
                  Product name
                </FormLabel>
                {isFormLocked && (
                  <span className="text-[11px] font-medium text-slate-400">Locked in WMS</span>
                )}
              </div>
              <input
                id="productName"
                type="text"
                disabled={isFormLocked}
                value={form.name}
                onChange={updateField('name')}
                placeholder={isFormLocked ? 'Select a WMS product above' : 'e.g. Sony WH-1000XM5 Wireless Headphones'}
                className={isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS}
              />
            </div>

            {/* Category & Brand */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <FormLabel icon={LayoutGrid} htmlFor="category" required={!isFormLocked}>
                    Category
                  </FormLabel>
                  {isFormLocked && (
                    <span className="text-[11px] font-medium text-slate-400">Locked</span>
                  )}
                </div>
                <select
                  id="category"
                  disabled={isFormLocked}
                  className={isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS}
                  value={form.category}
                  onChange={updateField('category')}
                >
                  <option value="" disabled>
                    {isFormLocked ? 'Locked in WMS' : 'Select category'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {!isFormLocked && categories.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No categories yet. Ask an admin to create categories first.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <FormLabel icon={Building2} htmlFor="brand">
                    Brand
                  </FormLabel>
                  {isFormLocked && (
                    <span className="text-[11px] font-medium text-slate-400">Locked</span>
                  )}
                </div>
                <input
                  id="brand"
                  type="text"
                  disabled={isFormLocked}
                  value={form.brand}
                  onChange={updateField('brand')}
                  placeholder={isFormLocked ? 'Locked in WMS' : 'e.g. Sony'}
                  className={isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between">
                <FormLabel icon={FileText} htmlFor="description">
                  Description
                </FormLabel>
                {isFormLocked && (
                  <span className="text-[11px] font-medium text-slate-400">Locked</span>
                )}
              </div>
              <textarea
                id="description"
                rows={isFormLocked ? 3 : 4}
                disabled={isFormLocked}
                value={form.description}
                onChange={updateField('description')}
                placeholder={isFormLocked ? 'Description is managed by Sellvro WMS' : "Describe your product — condition, features, what's included..."}
                className={isFormLocked ? DISABLED_TEXTAREA_CLASS : TEXTAREA_CLASS}
              />
            </div>

            {/* SKU Field (Editable in Self / Locked in WMS) */}
            <div>
              <div className="flex items-center justify-between">
                <FormLabel icon={Barcode} htmlFor="sku" required={!isFormLocked}>
                  SKU (Stock Keeping Unit)
                </FormLabel>
                {isFormLocked && (
                  <span className="text-[11px] font-medium text-slate-400">Locked</span>
                )}
              </div>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
                <input
                  id="sku"
                  type="text"
                  disabled={isFormLocked}
                  value={form.sku}
                  onChange={updateField('sku')}
                  placeholder={isFormLocked ? 'Select WMS SKU above' : 'Auto-generated SKU'}
                  className={`h-11 min-w-0 flex-1 border-0 px-3 text-sm placeholder:text-slate-400 focus:outline-none ${
                    isFormLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-transparent text-slate-800'
                  }`}
                />
                {!isFormLocked && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, sku: makeSku() }))}
                    className="inline-flex shrink-0 items-center gap-1.5 border-l border-slate-200 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </button>
                )}
              </div>
            </div>

            {/* Admin Panel Fields */}
            {panel === 'admin' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="price"
                  label="Price (USD) *"
                  type="number"
                  placeholder="0.00"
                  value={form.price}
                  onChange={updateField('price')}
                />
                <Input
                  id="quantity"
                  label="Quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={form.quantity}
                  onChange={updateField('quantity')}
                />
                <Select
                  id="supplier"
                  label="Assign to Supplier *"
                  value={form.supplierAssign}
                  onChange={updateField('supplierAssign')}
                >
                  <option value="" disabled>
                    Select Supplier
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplier}
                    </option>
                  ))}
                </Select>
                <Select
                  id="fulfillBy"
                  label="Fulfillment / Inventory"
                  value={form.fulfillBy}
                  onChange={updateField('fulfillBy')}
                >
                  <option value="">Select Fulfillment</option>
                  <option value="warehouse">Sellvro Inventory (WMS)</option>
                  <option value="self">With Supplier (Self)</option>
                </Select>
                <Select id="location" label="Location" value={form.location} onChange={updateField('location')}>
                  <option value="">Select Location (optional)</option>
                  <option value="warehouse-1">Warehouse 1</option>
                  <option value="warehouse-2">Warehouse 2</option>
                </Select>
              </div>
            )}

            {/* Supplier Panel Pricing & Quantity */}
            {panel === 'supplier' && (
              <div className="flex flex-col gap-4">
                {/* WMS RESTOCK QUANTITY SECTION */}
                {isWmsExisting ? (
                  <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <PackagePlus className="h-4 w-4 text-primary" />
                      <span>WMS Inventory Stock &amp; Pricing</span>
                    </h4>

                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Unit Price (USD) <span className="text-slate-400 font-normal">[Locked]</span>
                        </label>
                        <input
                          type="text"
                          disabled
                          value={`$${form.price || '0.00'}`}
                          className={DISABLED_FIELD_CLASS}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Current Warehouse Stock <span className="text-slate-400 font-normal">[In WMS]</span>
                        </label>
                        <input
                          type="text"
                          disabled
                          value={`${form.quantity || 0} units`}
                          className={DISABLED_FIELD_CLASS}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="additionalQtyInput"
                          className="mb-1 block text-xs font-bold text-primary-900"
                        >
                          + Add Inbound Stock (Quantity) *
                        </label>
                        <div className="relative">
                          <input
                            id="additionalQtyInput"
                            type="number"
                            min="0"
                            placeholder="e.g. 20"
                            value={additionalQty}
                            onChange={(e) => setAdditionalQty(e.target.value.replace(/-/g, ''))}
                            className="h-11 w-full rounded-lg border-2 border-primary-400 bg-white px-3 pr-8 text-sm font-bold text-slate-900 shadow-xs focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
                          />
                          <Plus className="absolute right-2.5 top-3.5 h-4 w-4 text-primary-600 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {Number(additionalQty) > 0 && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>
                          New Total Stock will be: <strong>{Number(form.quantity || 0)}</strong> + <strong>{Number(additionalQty)}</strong> = <strong className="text-emerald-950 underline decoration-emerald-500 underline-offset-2">{Number(form.quantity || 0) + Number(additionalQty)} units</strong>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        id="price"
                        label="Price (USD) *"
                        type="number"
                        placeholder="0.00"
                        value={form.price}
                        onChange={updateField('price')}
                      />
                      <Input
                        id="quantity"
                        label="Initial Stock Quantity *"
                        type="number"
                        placeholder="Enter quantity"
                        value={form.quantity}
                        onChange={updateField('quantity')}
                      />
                    </div>

                    {panel === 'supplier' && (
                      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-4 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs shadow-2xs mt-0.5">
                              %
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                                  Sellvro Marketplace Platform Fee
                                </span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  Set by Admin • Applied Per Sale
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500 leading-snug">
                                Because you are selling directly from your own shop/facility (Self-Fulfillment), Sellvro charges a platform marketplace fee on each completed sale.
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-block rounded-lg bg-amber-100 border border-amber-300 px-3 py-1 text-base font-extrabold text-amber-900 shadow-2xs">
                              {marketplaceFee}%
                            </span>
                          </div>
                        </div>

                        {Number(form.price) > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-amber-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg bg-white/95 border border-slate-200 p-2.5 shadow-2xs">
                              <span className="text-[11px] text-slate-500 block font-medium">Customer Selling Price</span>
                              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                                ${Number(form.price).toFixed(2)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/95 border border-amber-200 p-2.5 shadow-2xs">
                              <span className="text-[11px] text-amber-700 block font-medium">Marketplace Fee ({marketplaceFee}%)</span>
                              <span className="text-sm font-bold text-amber-700 block mt-0.5">
                                -${((Number(form.price) * marketplaceFee) / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 shadow-2xs">
                              <span className="text-[11px] text-emerald-700 block font-bold">Your Estimated Payout</span>
                              <span className="text-sm font-extrabold text-emerald-800 block mt-0.5">
                                ${(Number(form.price) - (Number(form.price) * marketplaceFee) / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </AddProductSection>

        {/* ── STEP 3: SPECIFICATIONS & DIMENSIONS ──────────────────────────── */}
        <AddProductSection
          step="3"
          title={
            <div className="flex items-center justify-between w-full">
              <span>Product &amp; specifications</span>
              {isFormLocked && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Locked</span>
                </span>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between">
                <FormLabel htmlFor="weight">Weight</FormLabel>
                {isFormLocked && (
                  <span className="text-[11px] font-medium text-slate-400">Locked in WMS</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="weight"
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  placeholder="0"
                  value={form.weight}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('weight')}
                  className={`${isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS} max-w-[120px]`}
                />
                <select
                  disabled={isFormLocked}
                  className={`${isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS} max-w-[100px]`}
                  value={form.weightUnit}
                  onChange={updateField('weightUnit')}
                >
                  <option value="gm">gm</option>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <FormLabel>Dimensions</FormLabel>
                {isFormLocked && (
                  <span className="text-[11px] font-medium text-slate-400">Locked in WMS</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  placeholder="L"
                  value={form.length}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('length')}
                  className={`${isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS} w-20 sm:w-24`}
                  aria-label="Length"
                />
                <span className="text-sm text-slate-400">×</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  placeholder="W"
                  value={form.width}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('width')}
                  className={`${isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS} w-20 sm:w-24`}
                  aria-label="Width"
                />
                <span className="text-sm text-slate-400">×</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  placeholder="H"
                  value={form.height}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('height')}
                  className={`${isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS} w-20 sm:w-24`}
                  aria-label="Height"
                />
                <select
                  disabled={isFormLocked}
                  className={`${isFormLocked ? DISABLED_FIELD_CLASS : FIELD_CLASS} w-24`}
                  value={form.dimensionUnit}
                  onChange={updateField('dimensionUnit')}
                  aria-label="Dimension unit"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            {panel === 'admin' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="barcode"
                  label="Barcode"
                  icon={Barcode}
                  placeholder="Enter barcode"
                  value={form.barcode}
                  onChange={updateField('barcode')}
                />
                <Input
                  id="commission"
                  label="Commission (%)"
                  placeholder="Enter commission"
                  value={form.commission}
                  onChange={updateField('commission')}
                />
                <Select id="country" label="Country" value={form.country} onChange={updateField('country')}>
                  <option value="" disabled>
                    Select Country
                  </option>
                  <option value="us">United States</option>
                  <option value="pk">Pakistan</option>
                </Select>
              </div>
            )}
          </div>
        </AddProductSection>

        {/* ── ACTION BUTTONS ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {panel === 'admin' ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={publishActive}
                onChange={(e) => setPublishActive(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              Publish as active on marketplace
            </label>
          ) : isWmsExisting ? (
            <Button
              type="button"
              variant="outline"
              className="border border-slate-200 bg-white"
              onClick={() => {
                setSelectedWmsProductId('')
                setAdditionalQty('')
                setForm({ ...EMPTY_FORM, fulfillBy: 'warehouse', sku: '' })
                setPhotos([])
              }}
            >
              Reset Selection
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {onSwitchToWms && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSwitchToWms}
                  className="border-slate-300 text-xs"
                >
                  Switch to WMS Channel
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="border border-slate-200 bg-white"
                disabled={submitting}
                onClick={() => saveProduct('draft')}
              >
                <Save className="h-4 w-4" />
                Save as draft
              </Button>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || (isWmsExisting && !selectedWmsProductId)}
            className="shadow-sm"
          >
            {isWmsExisting ? (
              <Save className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting
              ? 'Processing…'
              : panel === 'admin'
              ? publishActive
                ? 'Create & activate'
                : 'Create product'
              : isWmsExisting
              ? 'Update WMS Stock & Media'
              : 'Submit for approval'}
          </Button>
        </div>
      </form>
    </>
  )
}

export default AddProductForm
