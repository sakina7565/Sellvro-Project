import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Plus,
  X,
  Sparkles,
  Check,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { adminApi, categoryApi, getErrorMessage } from '../../lib/api.js'

const MAX_PHOTOS = 10

function makeSku() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 5; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SVRO-${suffix}`
}

function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRefs = useRef([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Options
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])

  // Product Form
  const [form, setForm] = useState({
    name: '',
    category: '',
    brand: '',
    client: '',
    description: '',
    sku: '',
    price: '',
    quantity: '0',
    location: '',
    status: 'active',
    stockExpiry: '',
    weight: '0',
    weightUnit: 'g',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'cm',
  })

  // Photos: Array of 10 slots. Each item: { url?: string, file?: File, preview: string, isNew?: boolean }
  const [photoSlots, setPhotoSlots] = useState(Array(MAX_PHOTOS).fill(null))

  // Load dropdown options
  useEffect(() => {
    categoryApi
      .list()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setCategories(list.map((c) => (typeof c === 'string' ? c : c.name)))
      })
      .catch(() => {})

    adminApi
      .suppliers()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : []
        setSuppliers(list)
      })
      .catch(() => {})

    adminApi
      .locations()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : []
        setLocations(list.map((l) => (typeof l === 'string' ? l : l.name)))
      })
      .catch(() => {})
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
          brand: prod.brand || '',
          client: prod.supplierId || prod.supplier?._id || prod.supplier?.id || '',
          description: prod.description || '',
          sku: prod.sku || '',
          price: prod.price !== undefined ? String(prod.price) : '',
          quantity: prod.quantity !== undefined ? String(prod.quantity) : '0',
          location: prod.location && prod.location !== '—' ? prod.location : '',
          status: prod.status || 'approved',
          stockExpiry: prod.stockExpiry || prod.expiryDate || '',
          weight: prod.weight || '0',
          weightUnit: prod.weightUnit || 'g',
          length: prod.length || '',
          width: prod.width || '',
          height: prod.height || '',
          dimensionUnit: prod.dimensionUnit || 'cm',
        })

        // Populate photo slots
        const existingImages = Array.isArray(prod.images) && prod.images.length > 0
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
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleGenerateSku = () => {
    setForm((prev) => ({ ...prev, sku: makeSku() }))
  }

  // Handle Photo Slot Click
  const handleSlotClick = (index) => {
    fileInputRefs.current[index]?.click()
  }

  const handleFileSelected = (index, file) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPhotoSlots((prev) => {
      const next = [...prev]
      if (next[index]?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(next[index].preview)
      }
      next[index] = { file, preview, isNew: true }
      return next
    })
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
        brand: form.brand.trim(),
        supplier: form.client,
        client: form.client,
        description: form.description.trim(),
        sku: form.sku.trim().toUpperCase(),
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 0),
        location: form.location,
        status: form.status,
        stockExpiry: form.stockExpiry,
        weight: form.weight,
        weightUnit: form.weightUnit,
        length: form.length,
        width: form.width,
        height: form.height,
        dimensionUnit: form.dimensionUnit,
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
                        accept="image/jpeg,image/jpg,image/png,image/webp"
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

                {/* Category & Brand */}
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
                      Brand
                    </label>
                    <Input
                      value={form.brand}
                      onChange={updateField('brand')}
                      placeholder="e.g. Sony"
                    />
                  </div>
                </div>

                {/* Client / Supplier Dropdown */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Client
                  </label>
                  <Select
                    value={form.client}
                    onChange={updateField('client')}
                    options={[
                      { label: 'Select client / supplier', value: '' },
                      ...suppliers.map((s) => {
                        const code = s.clientId || s.supplierCode || `WMS-PAK${(parseInt(String(s.id).slice(-4), 16) % 9000) + 1000}`
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
                  {/* SKU with Generate button */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      SKU *
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={form.sku}
                        onChange={updateField('sku')}
                        placeholder="e.g. SVRO-00131"
                        className="font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleGenerateSku}
                        className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
                      >
                        Generate
                      </button>
                    </div>
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
                      value={form.status}
                      onChange={updateField('status')}
                      options={[
                        { label: 'Active', value: 'active' },
                        { label: 'Approved', value: 'approved' },
                        { label: 'In Stock', value: 'active' },
                        { label: 'Pending Approval', value: 'pending_approval' },
                        { label: 'Draft', value: 'draft' },
                        { label: 'Rejected', value: 'rejected' },
                      ]}
                    />
                  </div>
                </div>

                {/* Stock Expiry */}
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

                  {/* Price */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Price ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={updateField('price')}
                      placeholder="0.00"
                    />
                  </div>
                </div>
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
                        { label: 'g', value: 'g' },
                        { label: 'gm', value: 'gm' },
                        { label: 'kg', value: 'kg' },
                        { label: 'lbs', value: 'lbs' },
                        { label: 'oz', value: 'oz' },
                      ]}
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Dimensions
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.length}
                      onChange={updateField('length')}
                      placeholder="L"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.width}
                      onChange={updateField('width')}
                      placeholder="W"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.height}
                      onChange={updateField('height')}
                      placeholder="H"
                    />
                    <Select
                      value={form.dimensionUnit}
                      onChange={updateField('dimensionUnit')}
                      options={[
                        { label: 'cm', value: 'cm' },
                        { label: 'in', value: 'in' },
                        { label: 'mm', value: 'mm' },
                      ]}
                    />
                  </div>
                </div>
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
