import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Barcode,
  Building2,
  FileText,
  LayoutGrid,
  Save,
  Send,
  Sparkles,
  Tag,
} from 'lucide-react'
import PageHeader from '../admin/PageHeader.jsx'
import AddProductSection from './AddProductSection.jsx'
import ProductPhotoUpload from './ProductPhotoUpload.jsx'
import FormLabel from './FormLabel.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Button from '../ui/Button.jsx'
import { categoryApi, productApi, adminApi, getErrorMessage } from '../../lib/api.js'

const FIELD_CLASS =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const TEXTAREA_CLASS =
  'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

function StatusBadge({ panel, publishActive }) {
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
  fulfillBy: '',
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

function AddProductForm({ eyebrow, panel = 'supplier' }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [photos, setPhotos] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [publishActive, setPublishActive] = useState(panel === 'admin')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const updateField = (field) => (event) => {
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
    commission: form.commission,
    country: form.country,
    status,
    supplier: form.supplierAssign,
    publishActive: publishActive ? 'true' : 'false',
  })

  const saveProduct = async (status) => {
    setError('')
    setSuccess('')

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
    saveProduct('pending_approval')
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Add Product"
        action={<StatusBadge panel={panel} publishActive={publishActive} />}
        className="mb-6"
      />

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <AddProductSection step="1" title="Product photos">
          <ProductPhotoUpload
            photos={photos}
            onChange={setPhotos}
            onError={setError}
            minPhotos={panel === 'supplier' ? 2 : 1}
          />
        </AddProductSection>

        <AddProductSection step="2" title="Product details">
          <div className="flex flex-col gap-4">
            <div>
              <FormLabel icon={Tag} htmlFor="productName" required>
                Product name
              </FormLabel>
              <input
                id="productName"
                type="text"
                value={form.name}
                onChange={updateField('name')}
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FormLabel icon={LayoutGrid} htmlFor="category" required>
                  Category
                </FormLabel>
                <select id="category" className={FIELD_CLASS} value={form.category} onChange={updateField('category')}>
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No categories yet. Ask an admin to create categories first.
                  </p>
                )}
              </div>
              <div>
                <FormLabel icon={Building2} htmlFor="brand">
                  Brand
                </FormLabel>
                <input
                  id="brand"
                  type="text"
                  value={form.brand}
                  onChange={updateField('brand')}
                  placeholder="e.g. Sony"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <FormLabel icon={FileText} htmlFor="description">
                Description
              </FormLabel>
              <textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={updateField('description')}
                placeholder="Describe your product — condition, features, what's included..."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div>
              <FormLabel icon={Barcode} htmlFor="sku" required>
                SKU
              </FormLabel>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
                <input
                  id="sku"
                  type="text"
                  value={form.sku}
                  onChange={updateField('sku')}
                  placeholder="Auto-generated SKU"
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, sku: makeSku() }))}
                  className="inline-flex shrink-0 items-center gap-1.5 border-l border-slate-200 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate
                </button>
              </div>
            </div>

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
                  <option value="">
                    Select Location (optional)
                  </option>
                  <option value="warehouse-1">Warehouse 1</option>
                  <option value="warehouse-2">Warehouse 2</option>
                </Select>
              </div>
            )}

            {panel === 'supplier' && (
              <div className="flex flex-col gap-4">
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
                </div>

                <div>
                  <Select
                    id="fulfillBy"
                    label="Storage & Fulfillment Option *"
                    value={form.fulfillBy}
                    onChange={updateField('fulfillBy')}
                  >
                    <option value="" disabled>
                      Select where this product is kept
                    </option>
                    <option value="warehouse">Store in Sellvro Inventory (WMS Fulfillment)</option>
                    <option value="self">Keep at My Own Facility (Supplier Fulfillment)</option>
                  </Select>

                  {form.fulfillBy === 'warehouse' && (
                    <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-primary-200 bg-primary-50/70 p-3 text-xs text-primary-900">
                      <span className="shrink-0 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        WMS
                      </span>
                      <span>
                        <strong>Stored in Sellvro Inventory:</strong> This product will be kept in Sellvro's warehouse and will prominently display the <strong>WMS</strong> badge on the user store.
                      </span>
                    </div>
                  )}

                  {form.fulfillBy === 'self' && (
                    <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      <span className="shrink-0 rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Self
                      </span>
                      <span>
                        <strong>Kept with Supplier:</strong> You will hold inventory at your own facility and fulfill orders directly. The product will appear in the user store <strong>without the WMS badge</strong>.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </AddProductSection>

        <AddProductSection step="3" title="Product & specifications">
          <div className="flex flex-col gap-4">
            <div>
              <FormLabel htmlFor="weight">Weight</FormLabel>
              <div className="flex gap-2">
                <input
                  id="weight"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.weight}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('weight')}
                  className={`${FIELD_CLASS} max-w-[120px]`}
                />
                <select className={`${FIELD_CLASS} max-w-[100px]`} value={form.weightUnit} onChange={updateField('weightUnit')}>
                  <option value="gm">gm</option>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>

            <div>
              <FormLabel>Dimensions</FormLabel>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="L"
                  value={form.length}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('length')}
                  className={`${FIELD_CLASS} w-20 sm:w-24`}
                  aria-label="Length"
                />
                <span className="text-sm text-slate-400">×</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="W"
                  value={form.width}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('width')}
                  className={`${FIELD_CLASS} w-20 sm:w-24`}
                  aria-label="Width"
                />
                <span className="text-sm text-slate-400">×</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="H"
                  value={form.height}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onChange={updateField('height')}
                  className={`${FIELD_CLASS} w-20 sm:w-24`}
                  aria-label="Height"
                />
                <select
                  className={`${FIELD_CLASS} w-24`}
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
          ) : (
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
          )}
          <Button type="submit" disabled={submitting}>
            <Send className="h-4 w-4" />
            {submitting
              ? 'Submitting…'
              : panel === 'admin'
                ? publishActive
                  ? 'Create & activate'
                  : 'Create product'
                : 'Submit for approval'}
          </Button>
        </div>
      </form>
    </>
  )
}

export default AddProductForm
