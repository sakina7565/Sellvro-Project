import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, X, Layers, Tag, AlertCircle, CheckCircle2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [subInput, setSubInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    loadCategories()
  }, [])

  const resetForm = () => {
    setName('')
    setDescription('')
    setSubcategoriesList([])
    setSubInput('')
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  const handleAddSubcategory = () => {
    const raw = subInput.trim()
    if (!raw) return

    // Allow comma-separated values in case user pastes or types multiple
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
    setError('')
  }

  const handleRemoveSubcategory = (indexToRemove) => {
    setSubcategoriesList((prev) => prev.filter((_, idx) => idx !== indexToRemove))
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

    // Auto-capture any subcategory currently typed into the input
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

    // Mandatory subcategory check: Cannot create category without at least 1 subcategory
    if (finalSubs.length === 0) {
      setError('Subcategory is required! Please add at least one subcategory before saving.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await adminApi.updateCategory(editingId, {
          name: trimmedName,
          description: description.trim(),
          subcategories: finalSubs,
        })
        setSuccess('Category updated successfully.')
      } else {
        await adminApi.createCategory({
          name: trimmedName,
          description: description.trim(),
          subcategories: finalSubs,
        })
        setSuccess('Category created successfully.')
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
    setSubcategoriesList(
      Array.isArray(category.subcategories) ? [...category.subcategories] : []
    )
    setSubInput('')
    setSuccess('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return
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

  return (
    <AdminLayout>
      <PageHeader title="Categories" />

      <Card className="mb-6 p-5 shadow-soft border border-slate-100">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Category' : 'Add New Category'}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              placeholder="e.g. Laptops, smartphones, and consumer electronics"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {subcategoriesList.length} subcategor{subcategoriesList.length === 1 ? 'y' : 'ies'} added
                </span>
              )}
            </div>

            {/* Input row with Add button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="subcategoryInput"
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSubcategory()
                    }
                  }}
                  placeholder="Enter subcategory name (e.g. Smart Watches, Laptops) and click Add"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSubcategory}
                disabled={!subInput.trim()}
                className="shrink-0 flex items-center gap-1.5 border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Subcategory
              </Button>
            </div>

            {/* Subcategories list tags */}
            {subcategoriesList.length > 0 ? (
              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  {subcategoriesList.map((sub, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-2xs group hover:border-blue-300 transition-colors"
                    >
                      <Tag className="h-3 w-3 text-blue-500" />
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategory(idx)}
                        className="ml-1 rounded p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                        title={`Remove "${sub}"`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {subcategoriesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSubcategoriesList([])}
                      className="text-[11px] text-slate-400 hover:text-rose-600 underline font-medium ml-1 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
                <p className="text-xs text-amber-800 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Category cannot be created without subcategories. Type a subcategory above and click <strong>"Add Subcategory"</strong> or press Enter.
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className={subcategoriesList.length === 0 && !subInput.trim() ? 'opacity-85' : ''}
            >
              {saving ? 'Saving…' : editingId ? 'Update Category' : 'Save Category'}
            </Button>
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </p>
        )}
      </Card>

      <h2 className="mb-3 text-sm font-bold text-primary">Manage product categories</h2>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Subcategories</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Description</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Products</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                    No categories yet. Create one above.
                  </td>
                </tr>
              )}
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                    {category.name}
                  </td>
                  <td className="max-w-md px-5 py-4">
                    {Array.isArray(category.subcategories) && category.subcategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {category.subcategories.map((sub, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100"
                          >
                            <Tag className="h-2.5 w-2.5 text-blue-500" />
                            {sub}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium italic">No subcategories</span>
                    )}
                  </td>
                  <td className="max-w-xs px-5 py-4 text-slate-400 text-xs">
                    {category.description || '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500 font-medium">
                    {category.products}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction
                        icon={Pencil}
                        tone="primary"
                        aria-label="Edit category"
                        onClick={() => handleEdit(category)}
                      />
                      <IconAction
                        icon={Trash2}
                        tone="danger"
                        aria-label="Delete category"
                        onClick={() => handleDelete(category.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {categories.map((category) => (
            <MobileCard
              key={category.id}
              title={category.name}
              actions={
                <>
                  <IconAction
                    icon={Pencil}
                    tone="primary"
                    aria-label="Edit category"
                    onClick={() => handleEdit(category)}
                  />
                  <IconAction
                    icon={Trash2}
                    tone="danger"
                    aria-label="Delete category"
                    onClick={() => handleDelete(category.id)}
                  />
                </>
              }
            >
              <DetailRow
                label="Subcategories"
                value={
                  Array.isArray(category.subcategories) && category.subcategories.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {category.subcategories.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  ) : (
                    'None'
                  )
                }
                full
              />
              <DetailRow label="Products" value={category.products} />
              <DetailRow label="Description" value={category.description || '—'} full />
            </MobileCard>
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default CategoriesPage
