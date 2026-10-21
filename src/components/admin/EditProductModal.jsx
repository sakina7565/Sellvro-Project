import { useEffect, useState } from 'react'
import { X, SquarePen, Tag, DollarSign, Layers, Package, Barcode, Percent, MapPin, FileText } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function EditProductModal({ isOpen, onClose, onSuccess, product }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    quantity: '',
    barcode: '',
    commission: '',
    status: 'approved',
    fulfillBy: 'warehouse',
    location: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .categories()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setCategories(list.map((c) => (typeof c === 'string' ? c : c.name)))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || '',
        price: product.price !== undefined ? String(product.price) : '',
        quantity: product.quantity !== undefined ? String(product.quantity) : '0',
        barcode: product.barcode || '',
        commission: product.commission !== undefined ? String(product.commission) : '0',
        status: product.status || 'approved',
        fulfillBy: product.fulfillBy || 'warehouse',
        location: product.location && product.location !== '—' ? product.location : '',
        description: product.description || '',
      })
      setError('')
    }
  }, [product])

  if (!isOpen || !product) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Product title is required.')
      return
    }
    if (!form.sku.trim()) {
      setError('SKU is required.')
      return
    }
    const priceNum = Number(form.price)
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setError('Valid price greater than $0 is required.')
      return
    }
    const qtyNum = Number(form.quantity)
    if (Number.isNaN(qtyNum) || qtyNum < 0) {
      setError('Stock quantity cannot be negative.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category.trim(),
        price: priceNum,
        quantity: qtyNum,
        barcode: form.barcode.trim(),
        commission: Number(form.commission || 0),
        status: form.status,
        fulfillBy: form.fulfillBy,
        location: form.location.trim(),
        description: form.description.trim(),
      }

      const res = await adminApi.updateProduct(product.id, payload)
      const updated = res.product || { ...product, ...payload }
      onSuccess?.(updated)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update product.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <SquarePen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Product</h3>
              <p className="text-xs text-slate-500">Update product specifications, inventory, and status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Product Title *</label>
            <Input
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. 10'' Bull Whip Black"
              required
            />
          </div>

          {/* SKU & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">SKU Code *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={form.sku}
                  onChange={handleChange('sku')}
                  placeholder="e.g. SVRO-00131"
                  className="pl-9 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
              {categories.length > 0 ? (
                <Select
                  value={form.category}
                  onChange={handleChange('category')}
                  options={categories.map((c) => ({ label: c, value: c }))}
                />
              ) : (
                <Input
                  value={form.category}
                  onChange={handleChange('category')}
                  placeholder="e.g. Other Leather Products"
                />
              )}
            </div>
          </div>

          {/* Price, Stock & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Price ($) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={handleChange('price')}
                  placeholder="0.00"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Stock Quantity</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange('quantity')}
                  placeholder="0"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Barcode / UPC</label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={form.barcode}
                  onChange={handleChange('barcode')}
                  placeholder="Optional barcode"
                  className="pl-9 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Status & Commission */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
              <Select
                value={form.status}
                onChange={handleChange('status')}
                options={[
                  { label: 'Approved', value: 'approved' },
                  { label: 'Active (Marketplace live)', value: 'active' },
                  { label: 'Pending Approval', value: 'pending_approval' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Rejected', value: 'rejected' },
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Admin Commission (%)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.commission}
                  onChange={handleChange('commission')}
                  placeholder="0"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Fulfillment & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Fulfillment Method</label>
              <Select
                value={form.fulfillBy}
                onChange={handleChange('fulfillBy')}
                options={[
                  { label: 'Sellvro WMS Warehouse', value: 'warehouse' },
                  { label: 'Supplier Direct (Self)', value: 'self' },
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Warehouse Location / Shelf</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={form.location}
                  onChange={handleChange('location')}
                  placeholder="e.g. Rack B-12"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Product specifications, notes, details..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading} className="gap-1.5 shadow-sm">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EditProductModal
