import { useEffect, useState } from 'react'
<<<<<<< HEAD
import { X, SquarePen, Tag, DollarSign, Layers, Package, Barcode, Percent, MapPin, FileText, Link2, Plus } from 'lucide-react'
=======
import { X, SquarePen, Tag, DollarSign, Package, Barcode, Percent, MapPin } from 'lucide-react'
>>>>>>> origin/main
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function EditProductModal({ isOpen, onClose, onSuccess, product }) {
  const [categories, setCategories] = useState([])
  const [newSisterSku, setNewSisterSku] = useState('')
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
        subcategory: product.subcategory || '',
        handlingTime: product.handlingTime || '',
        deliveryTime: product.deliveryTime || '',
        price: product.price !== undefined ? String(product.price) : '',
        quantity: product.quantity !== undefined ? String(product.quantity) : '0',
        barcode: product.barcode || '',
        commission: product.commission !== undefined ? String(product.commission) : '0',
        status: product.status || 'approved',
        fulfillBy: product.fulfillBy || 'warehouse',
        location: product.location && product.location !== '—' ? product.location : '',
        description: product.description || '',
        customizationAvailable: Boolean(product.customizationAvailable),
        customizationInstructions: product.customizationInstructions || '',
        sisterSkus: Array.isArray(product.sisterSkus) ? product.sisterSkus : [],
        sisterVariationType: product.sisterVariationType || 'Color',
        globalSearchVolume:
          product.globalSearchVolume !== undefined && product.globalSearchVolume !== null
            ? String(product.globalSearchVolume)
            : '0',
        globalMonthlySales:
          product.globalMonthlySales !== undefined && product.globalMonthlySales !== null
            ? String(product.globalMonthlySales)
            : '0',
        usMarketAverageSales:
          product.usMarketAverageSales !== undefined && product.usMarketAverageSales !== null
            ? String(product.usMarketAverageSales)
            : '0',
        productKeywords: Array.isArray(product.productKeywords)
          ? [...product.productKeywords, '', '', '', ''].slice(0, 5)
          : ['', '', '', '', ''],
        rankingPriority: product.rankingPriority || 'standard',
        adminEvaluationNotes: product.adminEvaluationNotes || '',
      })
      setNewSisterSku('')
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
        subcategory: form.subcategory?.trim() || product.subcategory || '',
        handlingTime: form.handlingTime || product.handlingTime || '1 business day',
        deliveryTime:
          form.fulfillBy === 'warehouse'
            ? '1 Day (WMS Express Delivery)'
            : form.deliveryTime || product.deliveryTime || '2 - 3 business days',
        price: priceNum,
        quantity: qtyNum,
        barcode: form.barcode.trim(),
        commission: Number(form.commission || 0),
        status: form.status,
        fulfillBy: form.fulfillBy,
        location: form.location.trim(),
        description: form.description.trim(),
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
                value={form.status === 'active' ? 'approved' : form.status}
                onChange={handleChange('status')}
                options={[
                  { label: 'Approved (Live on Marketplace)', value: 'approved' },
                  { label: 'Pending Approval', value: 'pending_approval' },
                  { label: 'Deactivated', value: 'inactive' },
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

          {/* Handling & Delivery Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Handling / Dispatch Time (SLA)
              </label>
              <Select
                value={form.handlingTime || '24 Hours (1 business day)'}
                onChange={handleChange('handlingTime')}
                options={[
                  { label: 'Within 12 Hours (Same Day Fast Handover)', value: 'Within 12 Hours (Same Day Fast Handover)' },
                  { label: '24 Hours (1 business day)', value: '24 Hours (1 business day)' },
                  { label: '48 Hours (2 business days)', value: '48 Hours (2 business days)' },
                  { label: '3 Days (72 hours)', value: '3 Days (72 hours)' },
                  { label: '4 - 5 Days', value: '4 - 5 Days' },
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Customer Delivery Window
              </label>
              <Input
                value={form.deliveryTime}
                onChange={handleChange('deliveryTime')}
                placeholder="e.g. 2 - 3 business days"
              />
            </div>
          </div>

          {/* Product Customization Option */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(form.customizationAvailable)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    customizationAvailable: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="block font-bold text-xs text-indigo-950">
                  Customization Available for this Product
                </span>
                <span className="block text-[11px] text-indigo-700">
                  Allow buyers to specify personalized engraving, custom dimensions, color choices, or custom notes.
                </span>
              </div>
            </label>

            {form.customizationAvailable && (
              <div className="mt-3 pt-2.5 border-t border-indigo-100">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Customization Instructions for Buyer
                </label>
                <textarea
                  rows={2}
                  value={form.customizationInstructions}
                  onChange={handleChange('customizationInstructions')}
                  placeholder="e.g. Enter name to engrave (up to 15 chars), specify custom color..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}
          </div>

          {/* Sister SKUs Option */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-sky-600" />
              <span className="font-bold text-xs text-sky-950">
                Sister SKUs (Link Related Products)
              </span>
            </div>
            <p className="text-[11px] text-sky-800 mb-3">
              Connect this product with other colors, sizes, or variations. Displays &quot;Same Product Available in Different Colors&quot; on the product page.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Variation Attribute</label>
                <Select
                  value={form.sisterVariationType || 'Color'}
                  onChange={handleChange('sisterVariationType')}
                  className="w-full bg-white text-xs"
                >
                  <option value="Color">Color (Different Colors)</option>
                  <option value="Size">Size (Different Sizes)</option>
                  <option value="Style">Style (Different Styles)</option>
                  <option value="Material">Material (Different Materials)</option>
                  <option value="Edition">Edition (Different Editions)</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Add Sister SKU</label>
                <div className="flex items-center gap-1.5">
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
                    className="bg-white shrink-0 text-xs px-2.5"
                  >
                    <Plus className="h-3.5 w-3.5 mr-0.5 text-sky-600" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Chips of linked SKUs */}
            <div className="flex flex-wrap gap-1.5">
              {form.sisterSkus?.length > 0 ? (
                form.sisterSkus.map((sku) => (
                  <span
                    key={sku}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-sky-900 shadow-2xs"
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
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic">No Sister SKUs linked yet.</span>
              )}
            </div>
          </div>

          {/* Product Research & Evaluation */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-950">
                Product Research &amp; Landing Page Ranking
              </span>
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                Market Evaluation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">Global Search Volume</label>
                <Input
                  type="number"
                  min="0"
                  value={form.globalSearchVolume}
                  onChange={handleChange('globalSearchVolume')}
                  placeholder="e.g. 50000"
                  className="bg-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">Global Monthly Sales</label>
                <Input
                  type="number"
                  min="0"
                  value={form.globalMonthlySales}
                  onChange={handleChange('globalMonthlySales')}
                  placeholder="e.g. 2500"
                  className="bg-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">US Market Avg Sales</label>
                <Input
                  type="number"
                  min="0"
                  value={form.usMarketAverageSales}
                  onChange={handleChange('usMarketAverageSales')}
                  placeholder="e.g. 1200"
                  className="bg-white text-xs font-mono"
                />
              </div>
            </div>

            {/* 5 Keywords */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">5 Product Keywords</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <Input
                    key={idx}
                    value={(form.productKeywords && form.productKeywords[idx]) || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm((p) => {
                        const copy = [...(p.productKeywords || ['', '', '', '', ''])]
                        copy[idx] = val
                        return { ...p, productKeywords: copy }
                      })
                    }}
                    placeholder={`Keyword ${idx + 1}`}
                    className="bg-white text-[11px]"
                  />
                ))}
              </div>
            </div>

            {/* Priority Selection */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">Landing Page Priority</label>
              <Select
                value={form.rankingPriority || 'standard'}
                onChange={handleChange('rankingPriority')}
                className="w-full bg-white text-xs"
              >
                <option value="high">High Priority (Top of Landing Page)</option>
                <option value="medium">Medium Priority (Middle Section)</option>
                <option value="low">Low Priority (Further Down)</option>
                <option value="standard">Standard (Default Chronological)</option>
              </Select>
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
