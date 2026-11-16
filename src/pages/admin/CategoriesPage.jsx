import { useEffect, useState } from 'react'
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Layers,
  Tag,
  AlertCircle,
  CheckCircle2,
  Percent,
  Building2,
  Search,
  Check,
  ShieldCheck,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function CategoriesPage() {
  const [activeTab, setActiveTab] = useState('product') // 'product' | 'business'

  // ── Product Categories State ──
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [commissionRate, setCommissionRate] = useState('8')
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [subInput, setSubInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Business Categories State ──
  const [businessCategories, setBusinessCategories] = useState([])
  const [bizName, setBizName] = useState('')
  const [bizDescription, setBizDescription] = useState('')
  const [bizEditingId, setBizEditingId] = useState(null)
  const [bizSaving, setBizSaving] = useState(false)
  const [bizSearch, setBizSearch] = useState('')

  // Load product categories
  const loadCategories = async () => {
    setError('')
    try {
      const data = await adminApi.categories()
      setCategories(data.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load categories.'))
    } finally {
      setLoading(false)
    }
  }

  // Load business categories
  const loadBusinessCategories = async () => {
    try {
      const data = await adminApi.businessCategories({ all: 'true' })
      setBusinessCategories(data.data || [])
    } catch (err) {
      console.warn('Failed to load business categories:', err)
    }
  }

  useEffect(() => {
    loadCategories()
    loadBusinessCategories()
  }, [])

  const resetForm = () => {
    setName('')
    setDescription('')
    setCommissionRate('8')
    setSubcategoriesList([])
    setSubInput('')
    setEditingId(null)
  }

  const resetBizForm = () => {
    setBizName('')
    setBizDescription('')
    setBizEditingId(null)
  }

  // ── Product Category Handlers ──
  const handleAddSubcategory = () => {
    const raw = subInput.trim()
    if (!raw) return

    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (items.length === 0) return

    setSubcategoriesList((prev) => {
      const next = [...prev]
      for (const item of items) {
        if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
          next.push(item)
        }
      }
      return next
    })
    setSubInput('')
  }

  const handleRemoveSubcategory = (indexToRemove) => {
    setSubcategoriesList((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubcategory()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Category name is required.')
      return
    }

    let finalSubs = [...subcategoriesList]
    if (subInput.trim()) {
      const extraItems = subInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const item of extraItems) {
        if (!finalSubs.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
          finalSubs.push(item)
        }
      }
      setSubcategoriesList(finalSubs)
      setSubInput('')
    }

    if (finalSubs.length === 0) {
      setError('Subcategory is required! Please add at least one subcategory before saving.')
      return
    }

    const rate = Math.max(0, Math.min(100, Number(commissionRate) || 8))

    setSaving(true)
    try {
      if (editingId) {
        await adminApi.updateCategory(editingId, {
          name: trimmedName,
          description: description.trim(),
          subcategories: finalSubs,
          commissionRate: rate,
        })
        setSuccess(`Category updated! Products in "${trimmedName}" will now use ${rate}% commission.`)
      } else {
        await adminApi.createCategory({
          name: trimmedName,
          description: description.trim(),
          subcategories: finalSubs,
          commissionRate: rate,
        })
        setSuccess(`Category created with ${rate}% marketplace commission.`)
      }
      resetForm()
      await loadCategories()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save category.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (category) => {
    setEditingId(category.id)
    setName(category.name)
    setDescription(category.description || '')
    setCommissionRate(category.commissionRate !== undefined ? String(category.commissionRate) : '8')
    setSubcategoriesList(
      Array.isArray(category.subcategories) ? [...category.subcategories] : []
    )
    setSubInput('')
    setSuccess('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product category?')) return
    setError('')
    setSuccess('')
    try {
      await adminApi.deleteCategory(id)
      setSuccess('Category deleted.')
      if (editingId === id) resetForm()
      await loadCategories()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete category.'))
    }
  }

  // ── Business Category Handlers ──
  const handleBizSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmed = bizName.trim()
    if (!trimmed) {
      setError('Business category name is required.')
      return
    }

    setBizSaving(true)
    try {
      if (bizEditingId) {
        await adminApi.updateBusinessCategory(bizEditingId, {
          name: trimmed,
          description: bizDescription.trim(),
        })
        setSuccess(`Business category "${trimmed}" updated successfully.`)
      } else {
        await adminApi.createBusinessCategory({
          name: trimmed,
          description: bizDescription.trim(),
        })
        setSuccess(`New business category "${trimmed}" created and available for registration.`)
      }
      resetBizForm()
      await loadBusinessCategories()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save business category.'))
    } finally {
      setBizSaving(false)
    }
  }

  const handleBizEdit = (item) => {
    setBizEditingId(item.id)
    setBizName(item.name)
    setBizDescription(item.description || '')
    setSuccess('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBizToggleStatus = async (item) => {
    setError('')
    setSuccess('')
    try {
      await adminApi.updateBusinessCategory(item.id, {
        isActive: !item.isActive,
      })
      setSuccess(`Business category status changed to ${!item.isActive ? 'Active' : 'Inactive'}.`)
      await loadBusinessCategories()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to change status.'))
    }
  }

  const handleBizDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this business category?')) return
    setError('')
    setSuccess('')
    try {
      await adminApi.deleteBusinessCategory(id)
      setSuccess('Business category deleted.')
      if (bizEditingId === id) resetBizForm()
      await loadBusinessCategories()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete business category.'))
    }
  }

  const filteredBizCategories = businessCategories.filter((c) =>
    c.name.toLowerCase().includes(bizSearch.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(bizSearch.toLowerCase()))
  )

  return (
    <AdminLayout>
      <PageHeader title="Category Management" />

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('product')
            setError('')
            setSuccess('')
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === 'product'
              ? 'border-primary text-primary bg-primary-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="h-4 w-4" />
          Product Categories & Commission Rates
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
            {categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('business')
            setError('')
            setSuccess('')
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === 'business'
              ? 'border-primary text-primary bg-primary-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Business Categories (Onboarding & Registration)
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
            {businessCategories.length}
          </span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>{success}</p>
        </div>
      )}

      {/* =====================================================================
          TAB 1: PRODUCT CATEGORIES & COMMISSION
          ===================================================================== */}
      {activeTab === 'product' && (
        <>
          <Card className="mb-6 p-5 shadow-soft border border-slate-100">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingId ? 'Edit Product Category' : 'Add New Product Category'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Categories organize products on the marketplace. At least 1 subcategory is mandatory.
                  </p>
                </div>
                {editingId && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                    Editing Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  id="categoryName"
                  label="Category Name *"
                  placeholder="e.g. Electronics & Gadgets"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  id="categoryDescription"
                  label="Description (Optional)"
                  placeholder="e.g. Laptops, smartphones"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Marketplace Commission Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="commissionRate"
                      min="0"
                      max="100"
                      step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="8"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm font-bold text-slate-800 transition-colors focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                      required
                    />
                    <span className="pointer-events-none absolute right-3 top-3 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Auto-applies to all products listed under this category.
                  </p>
                </div>
              </div>

              {/* Subcategories Section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Subcategories <span className="text-rose-500 font-bold">* (Required)</span>
                  </label>
                  {subcategoriesList.length === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      At least 1 subcategory required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                      {subcategoriesList.length} Subcategory{subcategoriesList.length > 1 ? 'ies' : ''} Defined
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={handleSubInputKeyDown}
                    placeholder="Type subcategory name (e.g. Brake Pads, Filters) and press Add or Enter"
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubcategory}
                    className="gap-1 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {subcategoriesList.map((sub, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-xs"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategory(idx)}
                        className="rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove subcategory"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Product Categories Table */}
          <Card className="p-5 shadow-soft border border-slate-100">
            <h2 className="mb-4 text-base font-bold text-slate-900">
              Active Marketplace Product Categories ({categories.length})
            </h2>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3">Marketplace Commission</th>
                    <th className="px-4 py-3">Subcategories</th>
                    <th className="px-4 py-3">Products</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                          <Percent className="h-3 w-3 text-emerald-600" />
                          {c.commissionRate ?? 8}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Array.isArray(c.subcategories) && c.subcategories.length > 0 ? (
                            c.subcategories.map((sub, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {sub}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{c.products || 0}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                        {c.description || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction icon={Pencil} onClick={() => handleEdit(c)} title="Edit" />
                          <IconAction
                            icon={Trash2}
                            tone="danger"
                            onClick={() => handleDelete(c.id)}
                            title="Delete"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                        No product categories created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="space-y-3 md:hidden">
              {categories.map((c) => (
                <MobileCard
                  key={c.id}
                  title={c.name}
                  actions={
                    <>
                      <IconAction icon={Pencil} onClick={() => handleEdit(c)} />
                      <IconAction icon={Trash2} tone="danger" onClick={() => handleDelete(c.id)} />
                    </>
                  }
                >
                  <DetailRow label="Commission Rate" value={`${c.commissionRate ?? 8}%`} />
                  <DetailRow label="Products" value={String(c.products || 0)} />
                  <DetailRow label="Description" value={c.description || '—'} full />
                </MobileCard>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* =====================================================================
          TAB 2: BUSINESS CATEGORIES (FOR REGISTRATION & ONBOARDING)
          ===================================================================== */}
      {activeTab === 'business' && (
        <>
          <Card className="mb-6 p-5 shadow-soft border border-slate-100">
            <form className="space-y-4" onSubmit={handleBizSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {bizEditingId ? 'Edit Business Category' : 'Add New Business Category'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      These categories appear in the Supplier & User Registration and Business Setup dropdowns.
                    </p>
                  </div>
                </div>

                {bizEditingId && (
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
                    Editing Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="bizName"
                  label="Business Category Name *"
                  placeholder="e.g. Solar & Renewable Energy, Textiles"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  required
                />
                <Input
                  id="bizDescription"
                  label="Description (Optional)"
                  placeholder="e.g. Photovoltaic cells, inverters, solar panels"
                  value={bizDescription}
                  onChange={(e) => setBizDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {bizEditingId && (
                  <Button type="button" variant="outline" onClick={resetBizForm}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={bizSaving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" />
                  {bizSaving ? 'Saving…' : bizEditingId ? 'Update Business Category' : 'Add Business Category'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Business Categories Table */}
          <Card className="p-5 shadow-soft border border-slate-100">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Registered Business Categories ({businessCategories.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Active categories are immediately available to applicants registering on Sellvro.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search business categories…"
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Availability</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBizCategories.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-teal-600" />
                        {item.name}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-sm">
                        {item.description || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleBizToggleStatus(item)}
                          className="group"
                          title="Click to toggle status"
                        >
                          {item.isActive ? (
                            <Badge tone="success" className="gap-1 cursor-pointer group-hover:opacity-80">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Active in Registration
                            </Badge>
                          ) : (
                            <Badge tone="neutral" className="gap-1 cursor-pointer group-hover:opacity-80">
                              Hidden (Inactive)
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction icon={Pencil} onClick={() => handleBizEdit(item)} title="Edit" />
                          <IconAction
                            icon={Trash2}
                            tone="danger"
                            onClick={() => handleBizDelete(item.id)}
                            title="Delete"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBizCategories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                        {bizSearch ? 'No matching business categories found.' : 'No business categories found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="space-y-3 md:hidden">
              {filteredBizCategories.map((item) => (
                <MobileCard
                  key={item.id}
                  title={item.name}
                  actions={
                    <>
                      <IconAction icon={Pencil} onClick={() => handleBizEdit(item)} />
                      <IconAction icon={Trash2} tone="danger" onClick={() => handleBizDelete(item.id)} />
                    </>
                  }
                >
                  <DetailRow
                    label="Status"
                    value={
                      <span
                        onClick={() => handleBizToggleStatus(item)}
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <DetailRow label="Description" value={item.description || '—'} full />
                </MobileCard>
              ))}
            </div>
          </Card>
        </>
      )}
    </AdminLayout>
  )
}

export default CategoriesPage
