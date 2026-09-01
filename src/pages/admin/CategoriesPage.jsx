import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!name.trim()) {
      setError('Category name is required.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await adminApi.updateCategory(editingId, { name: name.trim(), description: description.trim() })
        setSuccess('Category updated.')
      } else {
        await adminApi.createCategory({ name: name.trim(), description: description.trim() })
        setSuccess('Category created.')
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
    setSuccess('')
    setError('')
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

      <Card className="mb-6 p-5 shadow-soft">
        <form
          className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_2fr_auto]"
          onSubmit={handleSubmit}
        >
          <div className="md:col-span-3">
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              {editingId ? 'Edit Category' : 'Add Category'}
            </h2>
          </div>
          <Input
            id="categoryName"
            label="Name *"
            placeholder="Enter category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="categoryDescription"
            label="Description"
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2 md:mb-0.5">
            <Button type="submit" className="w-full md:w-auto" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" className="w-full md:w-auto" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
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
                <th className="whitespace-nowrap px-5 py-3 font-medium">Description</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Products</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                    No categories yet. Create one above.
                  </td>
                </tr>
              )}
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{category.name}</td>
                  <td className="max-w-md px-5 py-4 text-slate-400">{category.description || '—'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{category.products}</td>
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
