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
  Lock,
  Layers,
  Scissors,
  Package,
  Truck,
  ShieldCheck,
  DollarSign,
  Boxes,
  FileText,
  AlertCircle,
  Video,
} from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { productApi, categoryApi, mediaUrl, getErrorMessage } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

const MAX_PHOTOS = 10

export default function SupplierEditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRefs = useRef([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Catalog & Category Options
  const [categoryObjects, setCategoryObjects] = useState([])
  const [categories, setCategories] = useState([])
  const [myOtherProducts, setMyOtherProducts] = useState([])

  // Form State
  const [newSisterSku, setNewSisterSku] = useState('')
  const [isWmsLocked, setIsWmsLocked] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    brand: '',
    condition: 'Brand New',
    handlingTime: '1 business day',
    deliveryTime: '2-3 Days',
    description: '',
    sku: '',
    price: '',
    commission: '8',
    quantity: '0',
    stockAlert: '10',
    stockExpiry: '',
    location: '',
    status: 'active',
    weight: '0',
    weightUnit: 'gm',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'cm',
    videoUrl: '',
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

  // Load Categories & Supplier Products
  useEffect(() => {
    categoryApi
      .list()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setCategoryObjects(list)
        setCategories(list.map((c) => (typeof c === 'string' ? c : c.name)))
      })
      .catch(() => {})

    productApi
      .mine()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : []
        setMyOtherProducts(list.filter((p) => String(p.id || p._id) !== String(id)))
      })
      .catch(() => {})
  }, [id])

  // Load Product Data
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')

    productApi
      .get(id)
      .then((res) => {
        const prod = res?.product || res?.data || res
        if (!prod) {
          setError('Product not found.')
          return
        }

        const isWms = Boolean(prod.isWmsVerified || prod.inWarehouse || prod.fulfillBy === 'warehouse')
        setIsWmsLocked(isWms)

        // Parse Keywords (ensure 5 slots)
        const kwList = Array.isArray(prod.productKeywords) ? prod.productKeywords : []
        const kwSlots = ['', '', '', '', '']
        kwList.slice(0, 5).forEach((kw, i) => {
          kwSlots[i] = kw || ''
        })

        setForm({
          name: prod.name || '',
          category: typeof prod.category === 'object' ? prod.category?.name : prod.category || '',
          subcategory: prod.subcategory || '',
          brand: prod.brand || '',
          condition: prod.condition || 'Brand New',
          handlingTime: prod.handlingTime || '1 business day',
          deliveryTime: prod.deliveryTime || '2-3 Days',
          description: prod.description || '',
          sku: prod.sku || '',
          price: prod.price !== undefined ? String(prod.price) : '',
          commission: prod.commission !== undefined ? String(prod.commission) : '8',
          quantity: prod.quantity !== undefined ? String(prod.quantity) : '0',
          stockAlert: prod.stockAlert !== undefined ? String(prod.stockAlert) : '10',
          stockExpiry: prod.stockExpiry || '',
          location: prod.location || '',
          status: prod.status || 'active',
          weight: prod.weight || '0',
          weightUnit: prod.weightUnit || 'gm',
          length: prod.length || '',
          width: prod.width || '',
          height: prod.height || '',
          dimensionUnit: prod.dimensionUnit || 'cm',
          videoUrl: prod.videoUrl || '',
          customizationAvailable: Boolean(prod.customizationAvailable),
          customizationInstructions: prod.customizationInstructions || '',
          sisterSkus: Array.isArray(prod.sisterSkus) ? prod.sisterSkus : [],
          sisterVariationType: prod.sisterVariationType || 'Color',
          globalSearchVolume:
            prod.globalSearchVolume !== undefined ? String(prod.globalSearchVolume) : '0',
          globalMonthlySales:
            prod.globalMonthlySales !== undefined ? String(prod.globalMonthlySales) : '0',
          usMarketAverageSales:
            prod.usMarketAverageSales !== undefined ? String(prod.usMarketAverageSales) : '0',
          productKeywords: kwSlots,
          rankingPriority: prod.rankingPriority || 'standard',
          adminEvaluationNotes: prod.adminEvaluationNotes || '',
        })

        // Populate photo slots from existing images
        const existingImages = Array.isArray(prod.images) && prod.images.length > 0
          ? prod.images
          : prod.image
            ? [prod.image]
            : []

        const initialSlots = Array(MAX_PHOTOS).fill(null)
        existingImages.slice(0, MAX_PHOTOS).forEach((imgUrl, i) => {
          initialSlots[i] = {
            url: imgUrl,
            preview: mediaUrl(imgUrl),
            isNew: false,
          }
        })
        setPhotoSlots(initialSlots)
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
      // Category change updates subcategories
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

  // Sister SKUs management
  const handleAddSisterSku = (skuToAdd) => {
    const clean = String(skuToAdd || '').trim().toUpperCase()
    if (!clean) return
    if (clean === form.sku.trim().toUpperCase()) {
      setError(`Cannot add self-SKU (${clean}) as a sister SKU.`)
      return
    }
    if (form.sisterSkus.includes(clean)) {
      setError(`SKU "${clean}" is already added as a Sister SKU.`)
      return
    }
    setForm((prev) => ({
      ...prev,
      sisterSkus: [...prev.sisterSkus, clean],
    }))
    setNewSisterSku('')
    setError('')
  }

  const handleRemoveSisterSku = (skuToRemove) => {
    setForm((prev) => ({
      ...prev,
      sisterSkus: prev.sisterSkus.filter((s) => s !== skuToRemove),
    }))
  }

  const handleKeywordChange = (index, value) => {
    setForm((prev) => {
      const kws = [...(prev.productKeywords || ['', '', '', '', ''])]
      kws[index] = value
      return { ...prev, productKeywords: kws }
    })
  }

  // Calculated Preview Ranking Score
  const previewScore = (() => {
    const priorityWeights = {
      high: 10000000,
      medium: 5000000,
      low: 1000000,
      standard: 0,
    }
    const pWeight = priorityWeights[form.rankingPriority] || 0
    const sales = Math.max(0, parseInt(form.globalMonthlySales, 10) || 0) * 100
    const usSales = Math.max(0, parseInt(form.usMarketAverageSales, 10) || 0) * 150
    const search = Math.max(0, parseInt(form.globalSearchVolume, 10) || 0) * 1
    const kwCount = (form.productKeywords || []).filter((k) => k.trim()).length * 500
    return pWeight + sales + usSales + search + kwCount
  })()

  // Dynamic Subcategories for currently selected Category
  const currentCategoryObj = categoryObjects.find(
    (c) => (c.name || c) === form.category,
  )
  const availableSubcategories = Array.isArray(currentCategoryObj?.subcategories)
    ? currentCategoryObj.subcategories
    : []

  // Price calculations & recommendations
  const numericPrice = Number(form.price || 0)
  const minRecommendedPrice = (numericPrice * 0.9).toFixed(2)
  const maxRecommendedPrice = (numericPrice * 1.5).toFixed(2)
  const feeRate = Number(form.commission || 8)
  const feePerUnit = (numericPrice * feeRate) / 100
  const estimatedNetEarn = numericPrice - feePerUnit

  const handleSubmit = async (e, targetStatus = null) => {
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
    if (numericPrice <= 0) {
      setError('A valid positive retail price is required.')
      return
    }

    const validPhotoCount = photoSlots.filter(Boolean).length
    if (validPhotoCount < 2) {
      setError('Product must have at least 2 images. Please upload multiple high-resolution photos.')
      return
    }

    setSubmitting(true)
    try {
      const existingImages = photoSlots
        .filter((slot) => slot && !slot.isNew && slot.url)
        .map((slot) => slot.url)

      const newFiles = photoSlots
        .filter((slot) => slot && slot.isNew && slot.file)
        .map((slot) => slot.file)

      const nextStatus = targetStatus || form.status

      const payload = {
        name: form.name.trim(),
        category: form.category,
        subcategory: form.subcategory,
        brand: form.brand.trim(),
        condition: form.condition,
        handlingTime: form.handlingTime,
        deliveryTime: form.deliveryTime,
        description: form.description.trim(),
        sku: form.sku.trim().toUpperCase(),
        price: Number(form.price || 0),
        commission: Number(form.commission || 0),
        quantity: Number(form.quantity || 0),
        stockAlert: Number(form.stockAlert || 10),
        stockExpiry: form.stockExpiry,
        location: form.location,
        status: nextStatus,
        resubmit: targetStatus === 'pending_approval' ? 'true' : 'false',
        weight: form.weight,
        weightUnit: form.weightUnit,
        length: form.length,
        width: form.width,
        height: form.height,
        dimensionUnit: form.dimensionUnit,
        videoUrl: form.videoUrl.trim(),
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
        existingImages: JSON.stringify(existingImages),
      }

      await productApi.update(id, payload, newFiles)
      setSuccess(
        nextStatus === 'pending_approval'
          ? 'Product submitted for Admin approval successfully!'
          : 'Product updated successfully! All changes have been saved.'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        navigate('/supplier/products')
      }, 1200)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update product.'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SupplierLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/supplier/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Products</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">
              Editing: {form.sku || 'Product'}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 capitalize">
              {form.status}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Edit Product Listing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify product details, pricing, stock, sister SKUs, customization, and market research information.
          </p>
        </div>

        {/* Success & Error Banners */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 shadow-2xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-2xs flex items-center gap-2.5">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <Card className="p-12 text-center text-slate-400 text-sm">
            Loading product data...
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── CARD 1: PRODUCT PHOTOS & MEDIA ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    1
                  </span>
                  Product Photos &amp; Media (Min. 2 Photos, Max. 10)
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  Min 1000 × 1000 px resolution required
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {photoSlots.map((slot, index) => (
                  <div
                    key={index}
                    onClick={() => handleSlotClick(index)}
                    className={`group relative flex h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed transition cursor-pointer overflow-hidden ${
                      slot
                        ? 'border-transparent bg-slate-100 shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 hover:border-primary-400 hover:bg-primary-50/30'
                    }`}
                  >
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[index] = el)}
                      onChange={(e) => handleFileSelected(index, e.target.files?.[0])}
                      accept="image/*"
                      className="hidden"
                    />

                    {slot ? (
                      <>
                        <img
                          src={slot.preview}
                          alt={`Slot ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleRemovePhoto(e, index)}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-80 hover:opacity-100 transition shadow-xs"
                          title="Remove photo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          #{index + 1} {index === 0 ? 'Cover' : ''}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Camera className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {index === 0 ? 'Cover Photo' : `Slot ${index + 1}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Video URL */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-slate-500" />
                  Product Video URL (Optional)
                </label>
                <Input
                  type="url"
                  value={form.videoUrl}
                  onChange={updateField('videoUrl')}
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  className="text-xs"
                />
              </div>
            </Card>

            {/* ── CARD 2: BASIC PRODUCT INFORMATION ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    2
                  </span>
                  Product Details &amp; Categorization
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Title / Item Name *
                  </label>
                  <Input
                    value={form.name}
                    onChange={updateField('name')}
                    placeholder="e.g. Genuine Leather Formal Belt (Brown)"
                    required
                    className="font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <Select
                    value={form.category}
                    onChange={updateField('category')}
                    options={categories.map((c) => ({ label: c, value: c }))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subcategory
                  </label>
                  <Select
                    value={form.subcategory}
                    onChange={updateField('subcategory')}
                    options={[
                      { label: 'None', value: '' },
                      ...availableSubcategories.map((sub) => ({ label: sub, value: sub })),
                    ]}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand Name
                  </label>
                  <Input
                    value={form.brand}
                    onChange={updateField('brand')}
                    placeholder="e.g. Sellvro Signature"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Condition
                  </label>
                  <Select
                    value={form.condition}
                    onChange={updateField('condition')}
                    options={[
                      { label: 'Brand New', value: 'Brand New' },
                      { label: 'Like New (Open Box)', value: 'Like New' },
                      { label: 'Refurbished', value: 'Refurbished' },
                      { label: 'Used - Excellent', value: 'Used - Excellent' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={updateField('description')}
                    placeholder="Provide a detailed description of features, materials, and warranty..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition"
                  />
                </div>
              </div>
            </Card>

            {/* ── CARD 3: PRICING, INVENTORY & MARGINS ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    3
                  </span>
                  Pricing, Stock &amp; Inventory Management
                </h2>
                {isWmsLocked && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    WMS Verified Stock
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Retail Price ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.price}
                      onChange={updateField('price')}
                      placeholder="0.00"
                      required
                      className="pl-8 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Marketplace Fee (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.commission}
                    onChange={updateField('commission')}
                    className="font-mono text-xs font-semibold bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product SKU *
                  </label>
                  <Input
                    value={form.sku}
                    onChange={updateField('sku')}
                    placeholder="e.g. SVRO-1025"
                    required
                    className="font-mono text-xs font-bold uppercase"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Available Stock
                    </label>
                    {isWmsLocked && (
                      <span className="text-[10px] font-bold text-emerald-600">Locked in WMS</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    disabled={isWmsLocked}
                    value={form.quantity}
                    onChange={updateField('quantity')}
                    className={`font-mono text-xs ${isWmsLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stockAlert}
                    onChange={updateField('stockAlert')}
                    placeholder="10"
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stock Expiry Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={form.stockExpiry}
                    onChange={updateField('stockExpiry')}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Price Intelligence & Margin Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  Price Intelligence &amp; Margin Breakdown
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                    <span className="text-slate-400 block text-[10px]">Min Recommended Price</span>
                    <span className="font-mono font-bold text-slate-700">${minRecommendedPrice}</span>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                    <span className="text-slate-400 block text-[10px]">Max Recommended Price</span>
                    <span className="font-mono font-bold text-slate-700">${maxRecommendedPrice}</span>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                    <span className="text-slate-400 block text-[10px]">Marketplace Fee ({feeRate}%)</span>
                    <span className="font-mono font-bold text-rose-600">-${feePerUnit.toFixed(2)}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                    <span className="text-emerald-800 block text-[10px] font-bold">Estimated Net Earnings</span>
                    <span className="font-mono font-extrabold text-emerald-700">+${estimatedNetEarn.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── CARD 4: SHIPPING & PHYSICAL SPECIFICATIONS ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    4
                  </span>
                  Shipping &amp; Physical Specifications
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Package Weight
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.weight}
                      onChange={updateField('weight')}
                      className="font-mono text-xs"
                    />
                    <select
                      value={form.weightUnit}
                      onChange={updateField('weightUnit')}
                      className="rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                    >
                      <option value="gm">gm</option>
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Length</label>
                  <Input
                    type="number"
                    step="any"
                    value={form.length}
                    onChange={updateField('length')}
                    placeholder="0"
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Width</label>
                  <Input
                    type="number"
                    step="any"
                    value={form.width}
                    onChange={updateField('width')}
                    placeholder="0"
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Height</label>
                  <Input
                    type="number"
                    step="any"
                    value={form.height}
                    onChange={updateField('height')}
                    placeholder="0"
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Handling Time</label>
                  <Select
                    value={form.handlingTime}
                    onChange={updateField('handlingTime')}
                    options={[
                      { label: 'Same Day (Fast-Track)', value: 'Same Day' },
                      { label: '1 business day', value: '1 business day' },
                      { label: '2 business days', value: '2 business days' },
                      { label: '3 business days', value: '3 business days' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Time</label>
                  <Select
                    value={form.deliveryTime}
                    onChange={updateField('deliveryTime')}
                    options={[
                      { label: '1-2 Days (Express)', value: '1-2 Days' },
                      { label: '2-3 Days (Standard)', value: '2-3 Days' },
                      { label: '3-5 Days (Economy)', value: '3-5 Days' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shipment Origin / Facility Location
                  </label>
                  <Input
                    value={form.location}
                    onChange={updateField('location')}
                    placeholder="e.g. Karachi Hub / Supplier Facility"
                    className="text-xs"
                  />
                </div>
              </div>
            </Card>

            {/* ── CARD 5: CUSTOMIZATION OPTION ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    5
                  </span>
                  Product Customization Option
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.customizationAvailable}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customizationAvailable: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              <p className="text-xs text-slate-500">
                Allow customers to provide custom text, logos, or sizing tailored for this item at checkout.
              </p>

              {form.customizationAvailable && (
                <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-3.5 space-y-2">
                  <label className="block text-xs font-bold text-primary-950">
                    Customization Instructions for Buyer
                  </label>
                  <textarea
                    rows={3}
                    value={form.customizationInstructions}
                    onChange={updateField('customizationInstructions')}
                    placeholder="e.g. Please enter initials to be embossed on the leather strap (max 4 characters)..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
                  />
                </div>
              )}
            </Card>

            {/* ── CARD 6: SISTER SKUS ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    6
                  </span>
                  Sister SKUs (Link Related Variations)
                </h2>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                  Cross-Promotion
                </span>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-amber-900/80 space-y-1">
                <p className="font-bold text-amber-950">Cross-Product Variation Linking</p>
                <p>
                  Connect separately listed products belonging to the same group (e.g., Black, Brown, and Blue belts).
                  The marketplace will automatically display them under <strong>&quot;Same Product Available in Different Colors / Variations&quot;</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Variation Attribute Type
                  </label>
                  <Select
                    value={form.sisterVariationType}
                    onChange={updateField('sisterVariationType')}
                    options={[
                      { label: 'Color', value: 'Color' },
                      { label: 'Size', value: 'Size' },
                      { label: 'Style', value: 'Style' },
                      { label: 'Material', value: 'Material' },
                      { label: 'Design', value: 'Design' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Add Existing SKU from Your Catalog
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type SKU (e.g. SVRO-1004)..."
                      value={newSisterSku}
                      onChange={(e) => setNewSisterSku(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSisterSku(newSisterSku)
                        }
                      }}
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-bold text-slate-800 focus:border-primary-400 focus:outline-none"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddSisterSku(newSisterSku)}
                      className="px-4 font-bold text-xs"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Select from my products */}
              {myOtherProducts.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Quick Select from Your Listed Products:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                    {myOtherProducts
                      .filter((p) => !form.sisterSkus.includes(String(p.sku).toUpperCase()))
                      .slice(0, 10)
                      .map((p) => (
                        <button
                          key={p.id || p.sku}
                          type="button"
                          onClick={() => handleAddSisterSku(p.sku)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-slate-400" />
                          <span>{p.sku}</span>
                          <span className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-[120px]">
                            ({p.name})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Linked Sister SKUs List */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  Currently Linked Sister SKUs ({form.sisterSkus.length}):
                </span>
                {form.sisterSkus.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No sister SKUs linked to this product.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {form.sisterSkus.map((sku) => (
                      <span
                        key={sku}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-900"
                      >
                        <Link2 className="h-3.5 w-3.5 text-amber-600" />
                        <span>{sku}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSisterSku(sku)}
                          className="rounded-full p-0.5 text-amber-700 hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer"
                          title="Remove SKU"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* ── CARD 7: PRODUCT RESEARCH & MARKET EVALUATION ── */}
            <Card className="p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">
                    7
                  </span>
                  Product Research &amp; Market Evaluation (Landing Page Ranking)
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Ranking Score:</span>
                  <span className="font-mono text-sm font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                    {previewScore.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. Global Search Volume (monthly)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={form.globalSearchVolume}
                    onChange={updateField('globalSearchVolume')}
                    placeholder="e.g. 15000"
                    className="font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Global Monthly Sales (units)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={form.globalMonthlySales}
                    onChange={updateField('globalMonthlySales')}
                    placeholder="e.g. 3200"
                    className="font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. US Market Average Sales (units)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={form.usMarketAverageSales}
                    onChange={updateField('usMarketAverageSales')}
                    placeholder="e.g. 1850"
                    className="font-mono text-xs font-bold"
                  />
                </div>
              </div>

              {/* 5 Product Keywords */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Five Relevant Product Keywords (Search &amp; Discovery)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  High-intent search terms buyers use to discover this product on the marketplace
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        #{i + 1}
                      </span>
                      <Input
                        value={form.productKeywords?.[i] || ''}
                        onChange={(e) => handleKeywordChange(i, e.target.value)}
                        placeholder={`Keyword ${i + 1}`}
                        className="pl-7 text-xs font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Tier Selection */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Landing Page Priority Tier
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: 'high', label: 'High Priority', desc: 'Top of Landing Page', color: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
                    { id: 'medium', label: 'Medium Priority', desc: 'Featured Mid-Tier', color: 'border-blue-400 bg-blue-50 text-blue-900' },
                    { id: 'low', label: 'Low Priority', desc: 'Standard Catalog', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                    { id: 'standard', label: 'Standard', desc: 'Default Order', color: 'border-slate-300 bg-slate-50 text-slate-900' },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, rankingPriority: tier.id }))}
                      className={`rounded-xl border-2 p-3 text-left transition cursor-pointer ${
                        form.rankingPriority === tier.id ? tier.color + ' shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <p className="text-xs font-bold">{tier.label}</p>
                      <p className="text-[10px] opacity-75">{tier.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-5">
              <Button
                as={Link}
                to="/supplier/products"
                variant="outline"
                disabled={submitting}
                className="font-bold text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-3">
                {(form.status === 'draft' || form.status === 'rejected') && (
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={(e) => handleSubmit(e, 'pending_approval')}
                    className="bg-amber-600 hover:bg-amber-700 font-extrabold text-white text-xs px-5 h-11 shadow-sm"
                  >
                    {submitting ? 'Submitting…' : 'Submit for Admin Approval'}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-600 font-extrabold text-white text-xs px-6 h-11 shadow-sm"
                >
                  {submitting ? 'Updating Product...' : 'Update Product'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </SupplierLayout>
  )
}
