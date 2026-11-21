import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  X,
  Check,
  Link2,
  Plus,
  Globe,
  BarChart3,
  Tag,
  Award,
  Sparkles,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { adminApi, categoryApi, getErrorMessage } from '../../lib/api.js'

const MAX_PHOTOS = 10

function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRefs = useRef([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Options
  const [categoryObjects, setCategoryObjects] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])

  // Product Form
  const [newSisterSku, setNewSisterSku] = useState('')
  const [form, setForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    brand: '',
    condition: 'Brand New',
    handlingTime: '1 business day',
    deliveryTime: '2-3 Days',
    client: '',
    description: '',
    sku: '',
    price: '',
    commission: '10',
    quantity: '0',
    stockAlert: '10',
    location: '',
    status: 'active',
    stockExpiry: '',
    weight: '0',
    weightUnit: 'gm',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'cm',
    customizationAvailable: false,
    customizationInstructions: '',
    sisterSkus: [],
    sisterVariationType: 'Color',
    globalSearchVolume: '0',
    globalMonthlySales: '0',
    usMarketAverageSales: '0',
    productKeywords: ['', '', '', '', ''],
    rankingPriority: 'standard',
    adminEvaluationNotes: '',
  })

  // Photos: Array of 10 slots. Each item: { url?: string, file?: File, preview: string, isNew?: boolean }
  const [photoSlots, setPhotoSlots] = useState(Array(MAX_PHOTOS).fill(null))

  // Load dropdown options
  useEffect(() => {
    categoryApi
      .list()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setCategoryObjects(list)
        setCategories(list.map((c) => (typeof c === 'string' ? c : c.name)))
      })
      .catch(() => { })

    adminApi
      .suppliers()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : []
        setSuppliers(list)
      })
      .catch(() => { })

    adminApi
      .locations()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : []
        setLocations(list.map((l) => (typeof l === 'string' ? l : l.name)))
      })
      .catch(() => { })
  }, [])

  // Load product details
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')

    adminApi
      .product(id)
      .then((res) => {
        const prod = res?.product || res?.data || res
        if (!prod) {
          setError('Product not found.')
          return
        }

        setForm({
          name: prod.name || '',
          category: prod.category || '',
          subcategory: prod.subcategory || '',
          brand: prod.brand || '',
          condition: prod.condition || 'Brand New',
          handlingTime: prod.handlingTime || '1 business day',
          deliveryTime: prod.deliveryTime || '2-3 Days',
          client: prod.supplierId || prod.supplier?._id || prod.supplier?.id || '',
          description: prod.description || '',
          sku: prod.sku || '',
          price: prod.price !== undefined ? String(prod.price) : '',
          commission:
            prod.commission !== undefined && prod.commission !== null && Number(prod.commission) > 0
              ? String(prod.commission)
              : '10',
          quantity: prod.quantity !== undefined ? String(prod.quantity) : '0',
          stockAlert: prod.stockAlert !== undefined ? String(prod.stockAlert) : '10',
          location: prod.location && prod.location !== '—' ? prod.location : '',
          status: prod.status || 'approved',
          stockExpiry: prod.stockExpiry || prod.expiryDate || '',
          weight: prod.weight || '0',
          weightUnit: prod.weightUnit || 'gm',
          length: prod.length || '',
          width: prod.width || '',
          height: prod.height || '',
          dimensionUnit: prod.dimensionUnit || 'cm',
          customizationAvailable: Boolean(prod.customizationAvailable),
          customizationInstructions: prod.customizationInstructions || '',
          sisterSkus: Array.isArray(prod.sisterSkus) ? prod.sisterSkus : [],
          sisterVariationType: prod.sisterVariationType || 'Color',
          globalSearchVolume:
            prod.globalSearchVolume !== undefined && prod.globalSearchVolume !== null
              ? String(prod.globalSearchVolume)
              : '0',
          globalMonthlySales:
            prod.globalMonthlySales !== undefined && prod.globalMonthlySales !== null
              ? String(prod.globalMonthlySales)
              : '0',
          usMarketAverageSales:
            prod.usMarketAverageSales !== undefined && prod.usMarketAverageSales !== null
              ? String(prod.usMarketAverageSales)
              : '0',
          productKeywords: Array.isArray(prod.productKeywords)
            ? [...prod.productKeywords, '', '', '', ''].slice(0, 5)
            : ['', '', '', '', ''],
          rankingPriority: prod.rankingPriority || 'standard',
          adminEvaluationNotes: prod.adminEvaluationNotes || '',
        })

        // Populate photo slots
        const existingImages =
          Array.isArray(prod.images) && prod.images.length > 0
            ? prod.images
            : prod.image
              ? [prod.image]
              : []

        const newSlots = Array(MAX_PHOTOS).fill(null)
        existingImages.slice(0, MAX_PHOTOS).forEach((imgUrl, i) => {
          if (imgUrl) {
            newSlots[i] = {
              url: imgUrl,
              preview: imgUrl,
              isNew: false,
            }
          }
        })
        setPhotoSlots(newSlots)
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load product.'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  const updateField = (field) => (e) => {
    const val = e.target.value
    setForm((prev) => {
      const next = { ...prev, [field]: val }
      // If changing category, reset or check subcategory and auto-set commission
      if (field === 'category') {
        const found = categoryObjects.find((c) => (c.name || c) === val)
        const subList = Array.isArray(found?.subcategories) ? found.subcategories : []
        if (!subList.includes(prev.subcategory)) {
          next.subcategory = subList[0] || ''
        }
        if (found?.commissionRate !== undefined && found?.commissionRate !== null) {
          next.commission = String(found.commissionRate)
        }
      }
      return next
    })
    if (error) setError('')
  }

  // Handle Photo Slot Click
  const handleSlotClick = (index) => {
    fileInputRefs.current[index]?.click()
  }

  const handleFileSelected = (index, file) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    const img = new window.Image()

    img.onload = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height

      if (width < 1000 || height < 1000) {
        URL.revokeObjectURL(preview)
        setError(
          `Image rejected: "${file.name}" is ${width} × ${height} px. Product images must be at least 1000 × 1000 pixels (high-resolution). Please upload an image with resolution of 1000 × 1000 pixels or higher.`,
        )
        return
      }

      setPhotoSlots((prev) => {
        const next = [...prev]
        if (next[index]?.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(next[index].preview)
        }
        next[index] = { file, preview, isNew: true, width, height, isHighRes: true }
        return next
      })
      setError('')
    }

    img.onerror = () => {
      URL.revokeObjectURL(preview)
      setError(`Failed to read image "${file.name}". Please upload a valid image file.`)
    }

    img.src = preview
  }

  const handleRemovePhoto = (e, index) => {
    e.stopPropagation()
    setPhotoSlots((prev) => {
      const next = [...prev]
      if (next[index]?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(next[index].preview)
      }
      next[index] = null
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) {
      setError('Product name is required.')
      return
    }
    if (!form.sku.trim()) {
      setError('SKU is required.')
      return
    }

    const lowResSlot = photoSlots.find((s) => s && s.isNew && s.isLowRes)
    if (lowResSlot) {
      setError(
        `Cannot update product: Photo "${lowResSlot.file?.name || 'Image'}" is low-resolution (${lowResSlot.width} × ${lowResSlot.height} px). Minimum required resolution is 1000 × 1000 pixels. Please replace it with a high-resolution photo.`,
      )
      return
    }

    setSubmitting(true)
    try {
      // Collect remaining existing image URLs
      const existingImages = photoSlots
        .filter((slot) => slot && !slot.isNew && slot.url)
        .map((slot) => slot.url)

      // Collect newly uploaded files
      const newFiles = photoSlots
        .filter((slot) => slot && slot.isNew && slot.file)
        .map((slot) => slot.file)

      const payload = {
        name: form.name.trim(),
        category: form.category,
        subcategory: form.subcategory,
        brand: form.brand.trim(),
        condition: form.condition,
        handlingTime: form.handlingTime,
        deliveryTime: form.deliveryTime,
        supplier: form.client,
        client: form.client,
        description: form.description.trim(),
        sku: form.sku.trim().toUpperCase(),
        price: Number(form.price || 0),
        commission: Number(form.commission || 0),
        quantity: Number(form.quantity || 0),
        stockAlert: Number(form.stockAlert || 0),
        location: form.location,
        status: form.status,
        stockExpiry: form.stockExpiry,
        weight: form.weight,
        weightUnit: form.weightUnit,
        length: form.length,
        width: form.width,
        height: form.height,
        dimensionUnit: form.dimensionUnit,
        customizationAvailable: form.customizationAvailable ? 'true' : 'false',
        customizationInstructions: form.customizationInstructions || '',
        sisterSkus: JSON.stringify(form.sisterSkus || []),
        sisterVariationType: form.sisterVariationType || 'Color',
        globalSearchVolume: Math.max(0, parseInt(form.globalSearchVolume, 10) || 0),
        globalMonthlySales: Math.max(0, parseInt(form.globalMonthlySales, 10) || 0),
        usMarketAverageSales: Math.max(0, parseInt(form.usMarketAverageSales, 10) || 0),
        productKeywords: JSON.stringify(
          (form.productKeywords || []).map((k) => k.trim()).filter(Boolean).slice(0, 5),
        ),
        rankingPriority: form.rankingPriority || 'standard',
        adminEvaluationNotes: form.adminEvaluationNotes || '',
        existingImages: JSON.stringify(existingImages),
      }

      await adminApi.updateProduct(id, payload, newFiles)
      setSuccess('Product updated successfully!')
      setTimeout(() => {
        navigate('/admin/products')
      }, 800)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update product.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Get available subcategories for selected category
  const selectedCatObj = categoryObjects.find((c) => (c.name || c) === form.category)
  const availableSubcategories = Array.isArray(selectedCatObj?.subcategories)
    ? selectedCatObj.subcategories
    : []

  const subcategoryOptions = [
    { label: 'Select subcategory', value: '' },
    ...(form.subcategory && !availableSubcategories.includes(form.subcategory)
      ? [{ label: form.subcategory, value: form.subcategory }]
      : []),
    ...availableSubcategories.map((s) => ({ label: s, value: s })),
  ]

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Breadcrumb & Header */}
        <div className="mb-6">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Products Listing
          </Link>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Panel</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Edit Product</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
            <Check className="h-4 w-4 text-emerald-600" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500 border border-slate-100 shadow-sm">
            Loading product data…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Product photos Card */}
            <Card className="p-6 sm:p-7 shadow-soft">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                  1
                </span>
                Product photos
              </h2>

              {/* 10 Slots Grid: 5 columns */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                {photoSlots.map((slot, index) => {
                  const isMain = index === 0

                  return (
                    <div key={index} className="relative aspect-square">
                      <input
                        ref={(el) => (fileInputRefs.current[index] = el)}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/pjpeg,image/jfif,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.png,.webp,.gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (file) handleFileSelected(index, file)
                        }}
                      />

                      {slot ? (
                        <div
                          onClick={() => handleSlotClick(index)}
                          className="group relative h-full w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-all hover:border-blue-400"
                        >
                          <img
                            src={slot.preview}
                            alt={`Photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />

                          {/* "Main" badge on slot 1 */}
                          {isMain && (
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                              <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                Main
                              </span>
                            </div>
                          )}

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={(e) => handleRemovePhoto(e, index)}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-xs transition-transform hover:scale-110 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Remove photo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSlotClick(index)}
                          className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-600"
                        >
                          <Camera className="h-5 w-5 stroke-[1.8] text-slate-400" />
                          <span className="text-xs font-semibold text-slate-600">Add</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                Upload up to 10 photos. First image is the main listing photo. Supported formats: JPG, PNG, WEBP — max 5MB each.
              </p>
            </Card>

            {/* 2. Product details Card */}
            <Card className="p-6 sm:p-7 shadow-soft">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                  2
                </span>
                Product details
              </h2>

              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Product name *
                  </label>
                  <Input
                    value={form.name}
                    onChange={updateField('name')}
                    placeholder="e.g. 10'' Bull Whip Black"
                    required
                  />
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Category *
                    </label>
                    <Select
                      value={form.category}
                      onChange={updateField('category')}
                      options={[
                        { label: 'Select category', value: '' },
                        ...categories.map((c) => ({ label: c, value: c })),
                      ]}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Subcategory
                    </label>
                    <Select
                      value={form.subcategory}
                      onChange={updateField('subcategory')}
                      options={subcategoryOptions}
                    />
                  </div>
                </div>

                {/* Brand & Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Brand
                    </label>
                    <Input
                      value={form.brand}
                      onChange={updateField('brand')}
                      placeholder="e.g. Sony"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Condition
                    </label>
                    <Select
                      value={form.condition}
                      onChange={updateField('condition')}
                      options={[
                        { label: 'Brand New', value: 'Brand New' },
                        { label: 'New (Other)', value: 'New (Other)' },
                        { label: 'Like New', value: 'Like New' },
                        { label: 'Refurbished', value: 'Refurbished' },
                        { label: 'Used - Excellent', value: 'Used - Excellent' },
                        { label: 'Used - Good', value: 'Used - Good' },
                        { label: 'WMS Verified Authentic (Inspected)', value: 'WMS Verified Authentic (Inspected)' },
                      ]}
                    />
                  </div>
                </div>

                {/* Client / Supplier Dropdown */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Client / Supplier
                  </label>
                  <Select
                    value={form.client}
                    onChange={updateField('client')}
                    options={[
                      { label: 'Select client / supplier', value: '' },
                      ...suppliers.map((s) => {
                        const code =
                          s.clientId ||
                          s.supplierCode ||
                          `WMS-PAK${(parseInt(String(s.id).slice(-4), 16) % 9000) + 1000}`
                        const label = `${code} (${s.email || s.supplier || s.fullName})`
                        return { label, value: s.id }
                      }),
                    ]}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={updateField('description')}
                    placeholder="Describe your product..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </Card>

            {/* 3. SKU & inventory Card */}
            <Card className="p-6 sm:p-7 shadow-soft">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                  3
                </span>
                SKU &amp; inventory
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* SKU - System Predefined Series */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Product SKU (Predefined Series)
                    </label>
                    <Input
                      value={form.sku}
                      readOnly
                      disabled
                      placeholder="e.g. SVRO-0001"
                      className="font-mono bg-slate-50 text-slate-700 cursor-not-allowed font-semibold"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Predefined series pattern (SVRO-0001). Auto-managed by the system.
                    </p>
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Stock Quantity
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={updateField('quantity')}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Warehouse Location & Inventory Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Warehouse Location
                    </label>
                    <Select
                      value={form.location}
                      onChange={updateField('location')}
                      options={[
                        { label: 'Select location', value: '' },
                        ...locations.map((loc) => ({ label: loc, value: loc })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Inventory Status
                    </label>
                    <Select
                      value={form.status === 'active' ? 'approved' : form.status}
                      onChange={updateField('status')}
                      options={[
                        { label: 'Approved (Live on Marketplace)', value: 'approved' },
                        { label: 'Pending Approval', value: 'pending_approval' },
                        { label: 'Deactivated', value: 'inactive' },
                        { label: 'Rejected', value: 'rejected' },
                      ]}
                    />
                  </div>
                </div>

                {/* Stock Expiry & Stock Alert Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Stock Expiry
                    </label>
                    <Input
                      type="date"
                      value={form.stockExpiry}
                      onChange={updateField('stockExpiry')}
                      placeholder="mm/dd/yyyy"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Stock Alert (Low-Stock Threshold)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.stockAlert}
                      onChange={updateField('stockAlert')}
                      placeholder="e.g. 10 (Alert when below)"
                    />
                  </div>
                </div>

                {/* Price & Category Commission Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Price ($) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={updateField('price')}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Category Commission (Automatic)
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 text-xs">
                      <span className="font-semibold text-slate-600">
                        {form.category || 'General'}
                      </span>
                      <span className="rounded-md bg-indigo-100 border border-indigo-200 px-2 py-0.5 font-mono font-bold text-indigo-700">
                        {form.commission || 8}% Fee
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Automatically assigned from the category.
                    </p>
                  </div>
                </div>

                {/* Financial split preview */}
                {Number(form.price) > 0 && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/60 pb-2">
                      <span className="font-bold text-indigo-950">Financial Split Breakdown (Per Unit):</span>
                      <span className="font-semibold text-slate-500">Auto-calculated upon order placement</span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Customer Price</span>
                        <span className="font-bold text-slate-900">${Number(form.price || 0).toFixed(2)}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="block text-[10px] uppercase font-bold text-rose-500">Platform Fee ({form.commission || 0}%)</span>
                        <span className="font-bold text-rose-600">+${((Number(form.price || 0) * Number(form.commission || 0)) / 100).toFixed(2)}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="block text-[10px] uppercase font-bold text-emerald-600">Supplier Net Payout</span>
                        <span className="font-bold text-emerald-700">${((Number(form.price || 0) * (100 - Number(form.commission || 0))) / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 4. Shipping & specifications Card */}
            <Card className="p-6 sm:p-7 shadow-soft">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                  4
                </span>
                Shipping &amp; specifications
              </h2>

              <div className="space-y-4">
                {/* Weight */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Weight
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.weight}
                        onChange={updateField('weight')}
                        placeholder="0"
                      />
                    </div>
                    <Select
                      value={form.weightUnit}
                      onChange={updateField('weightUnit')}
                      options={[
                        { label: 'gm (grams)', value: 'gm' },
                        { label: 'g (grams)', value: 'g' },
                        { label: 'kg (kilograms)', value: 'kg' },
                        { label: 'lbs (pounds)', value: 'lbs' },
                        { label: 'oz (ounces)', value: 'oz' },
                      ]}
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Dimensions (L x W x H) &amp; Unit
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.length}
                      onChange={updateField('length')}
                      placeholder="Length"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.width}
                      onChange={updateField('width')}
                      placeholder="Width"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.height}
                      onChange={updateField('height')}
                      placeholder="Height"
                    />
                    <Select
                      value={form.dimensionUnit}
                      onChange={updateField('dimensionUnit')}
                      options={[
                        { label: 'cm (centimeters)', value: 'cm' },
                        { label: 'in (inches)', value: 'in' },
                        { label: 'mm (millimeters)', value: 'mm' },
                        { label: 'm (meters)', value: 'm' },
                      ]}
                    />
                  </div>
                </div>

                {/* Handling & Delivery Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Handling Time
                    </label>
                    <Select
                      value={form.handlingTime}
                      onChange={updateField('handlingTime')}
                      options={[
                        { label: 'Same business day', value: 'Same business day' },
                        { label: '1 business day', value: '1 business day' },
                        { label: '2 business days', value: '2 business days' },
                        { label: '3 business days', value: '3 business days' },
                        { label: '4-5 business days', value: '4-5 business days' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Delivery Time
                    </label>
                    <Select
                      value={form.deliveryTime}
                      onChange={updateField('deliveryTime')}
                      options={[
                        { label: '1 - 2 business days (Express)', value: '1 - 2 business days' },
                        { label: '2 - 3 business days (Standard)', value: '2 - 3 business days' },
                        { label: '3 - 5 business days (Economy)', value: '3 - 5 business days' },
                        { label: '1 Day (WMS Express Delivery)', value: '1 Day (WMS Express Delivery)' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 5. Product Customization Card */}
            <Card className="p-6 sm:p-7 shadow-soft">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                  5
                </span>
                Product Customization Option
              </h2>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(form.customizationAvailable)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customizationAvailable: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="block font-bold text-sm text-indigo-950">
                      Customization Available for this Product
                    </span>
                    <span className="block text-xs text-indigo-700 mt-0.5">
                      Enable if this product offers custom engraving, personalized sizing, color choices, or custom manufacturing.
                    </span>
                  </div>
                </label>

                {form.customizationAvailable && (
                  <div className="mt-4 pt-3 border-t border-indigo-100">
                    <label
                      htmlFor="customizationInstructions"
                      className="mb-1 block text-xs font-semibold text-slate-700"
                    >
                      Customization Guidelines &amp; Instructions for Buyer (Optional)
                    </label>
                    <textarea
                      id="customizationInstructions"
                      rows={3}
                      value={form.customizationInstructions || ''}
                      onChange={updateField('customizationInstructions')}
                      placeholder="e.g. Enter name up to 15 characters, specify preferred font style, choose custom color..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* 6. Sister SKUs Option */}
            <Card className="p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                  6
                </span>
                Sister SKUs (Link Related Variations)
              </h2>

              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-sky-950">
                      Connect Separately Listed Products as Sister SKUs
                    </h4>
                    <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">
                      Link multiple products that are essentially the same item but separately listed with different colors, sizes, or styles.
                      When a user views this product, all linked Sister SKUs will appear as clickable suggestions: <strong>&quot;Same Product Available in Different Colors&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Variation Attribute Type</label>
                    <Select
                      value={form.sisterVariationType || 'Color'}
                      onChange={updateField('sisterVariationType')}
                      className="w-full bg-white text-xs"
                    >
                      <option value="Color">Color (Same Product in Different Colors)</option>
                      <option value="Size">Size (Same Product in Different Sizes)</option>
                      <option value="Style">Style (Same Product in Different Styles)</option>
                      <option value="Material">Material (Same Product in Different Materials)</option>
                      <option value="Edition">Edition (Same Product in Different Editions)</option>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Add Sister SKU</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newSisterSku}
                        onChange={(e) => setNewSisterSku(e.target.value)}
                        placeholder="e.g. SVRO-00042"
                        className="bg-white uppercase text-xs font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const val = newSisterSku.trim().toUpperCase()
                            if (val && !form.sisterSkus.includes(val) && val !== form.sku.trim().toUpperCase()) {
                              setForm((p) => ({ ...p, sisterSkus: [...p.sisterSkus, val] }))
                              setNewSisterSku('')
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const val = newSisterSku.trim().toUpperCase()
                          if (val && !form.sisterSkus.includes(val) && val !== form.sku.trim().toUpperCase()) {
                            setForm((p) => ({ ...p, sisterSkus: [...p.sisterSkus, val] }))
                            setNewSisterSku('')
                          }
                        }}
                        className="bg-white shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1 text-sky-600" />
                        Add SKU
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-sky-100">
                  {form.sisterSkus?.length > 0 ? (
                    form.sisterSkus.map((sku) => (
                      <span
                        key={sku}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1 font-mono text-xs font-bold text-sky-950 shadow-2xs"
                      >
                        {sku}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              sisterSkus: p.sisterSkus.filter((s) => s !== sku),
                            }))
                          }
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No Sister SKUs linked yet.</span>
                  )}
                </div>
              </div>
            </Card>

            {/* 7. Product Research & Landing Page Priority */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    7
                  </span>
                  Product Research &amp; Market Evaluation (Landing Page Ranking)
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  Admin Exclusive
                </span>
              </div>

              <div className="space-y-5">
                {/* 3 Metric Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Field 1: Global Search Volume */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      1. Global Search Volume
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">Total estimated search volume for this product globally</p>
                    <Input
                      type="number"
                      min="0"
                      value={form.globalSearchVolume}
                      onChange={updateField('globalSearchVolume')}
                      placeholder="e.g. 50000"
                      className="bg-white font-mono text-xs font-bold"
                    />
                  </div>

                  {/* Field 2: Global Monthly Sales */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      2. Global Monthly Sales
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">Estimated monthly units sold worldwide</p>
                    <Input
                      type="number"
                      min="0"
                      value={form.globalMonthlySales}
                      onChange={updateField('globalMonthlySales')}
                      placeholder="e.g. 3500"
                      className="bg-white font-mono text-xs font-bold"
                    />
                  </div>

                  {/* Field 4: US Market Average Sales */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      3. US Market Average Sales
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">Average units sold in the US market</p>
                    <Input
                      type="number"
                      min="0"
                      value={form.usMarketAverageSales}
                      onChange={updateField('usMarketAverageSales')}
                      placeholder="e.g. 1800"
                      className="bg-white font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                {/* 5 Product Keywords */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800">
                      4. Five Product Keywords (SEO &amp; Search Discovery)
                    </label>
                    <span className="text-[11px] text-slate-400">Up to 5 relevant search terms</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    These keywords allow buyers to discover this product on the landing page search bar.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div key={idx} className="relative">
                        <Input
                          value={(form.productKeywords && form.productKeywords[idx]) || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setForm((prev) => {
                              const copy = [...(prev.productKeywords || ['', '', '', '', ''])]
                              copy[idx] = val
                              return { ...prev, productKeywords: copy }
                            })
                          }}
                          placeholder={`Keyword ${idx + 1}`}
                          className="bg-white text-xs pl-7"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Display Priority Radio Selector */}
                {/* <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-indigo-950">
                      5. Product Evaluation &amp; Landing Page Priority
                    </label>
                    <span className="text-xs font-bold text-indigo-700">
                      Controls position on the Landing Page
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800 mb-3">
                    Products with higher priority appear at the top of the landing page, medium below high, and low further down.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <label
                      className={`flex flex-col justify-between rounded-xl border-2 p-3 cursor-pointer transition ${
                        form.rankingPriority === 'high'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rankingPriority"
                        value="high"
                        checked={form.rankingPriority === 'high'}
                        onChange={updateField('rankingPriority')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs">High Priority</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <span className="text-[11px] font-normal text-slate-500 mt-1">Top of landing page</span>
                    </label>

                    <label
                      className={`flex flex-col justify-between rounded-xl border-2 p-3 cursor-pointer transition ${
                        form.rankingPriority === 'medium'
                          ? 'border-blue-500 bg-blue-50 text-blue-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rankingPriority"
                        value="medium"
                        checked={form.rankingPriority === 'medium'}
                        onChange={updateField('rankingPriority')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Medium Priority</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                      </div>
                      <span className="text-[11px] font-normal text-slate-500 mt-1">Middle showcase</span>
                    </label>

                    <label
                      className={`flex flex-col justify-between rounded-xl border-2 p-3 cursor-pointer transition ${
                        form.rankingPriority === 'low'
                          ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rankingPriority"
                        value="low"
                        checked={form.rankingPriority === 'low'}
                        onChange={updateField('rankingPriority')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Low Priority</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                      </div>
                      <span className="text-[11px] font-normal text-slate-500 mt-1">Further down</span>
                    </label>

                    <label
                      className={`flex flex-col justify-between rounded-xl border-2 p-3 cursor-pointer transition ${
                        form.rankingPriority === 'standard' || !form.rankingPriority
                          ? 'border-slate-500 bg-slate-100 text-slate-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rankingPriority"
                        value="standard"
                        checked={form.rankingPriority === 'standard' || !form.rankingPriority}
                        onChange={updateField('rankingPriority')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Standard</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                      </div>
                      <span className="text-[11px] font-normal text-slate-500 mt-1">Chronological</span>
                    </label>
                  </div>
                </div> */}

                {/* Admin Evaluation Notes */}
                {/* <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Admin Research Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.adminEvaluationNotes || ''}
                    onChange={updateField('adminEvaluationNotes')}
                    placeholder="Internal evaluation notes about market demand, trends, target audience..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div> */}
              </div>
            </Card>

            {/* Bottom Submit Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5 rounded-lg shadow-sm"
              >
                {submitting ? 'Updating…' : 'Update Product'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  )
}

export default EditProductPage
