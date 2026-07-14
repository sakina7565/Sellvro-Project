import { Pencil, Trash2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { CATEGORIES } from '../../lib/mockData.js'

function CategoriesPage() {
  return (
    <AdminLayout>
      <PageHeader title="Categories" />

      <Card className="mb-6 p-5 shadow-soft">
        <form
          className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_2fr_auto]"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="md:col-span-3">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Add Category</h2>
          </div>
          <Input id="categoryName" label="Name *" placeholder="Enter category name" />
          <Input id="categoryDescription" label="Description" placeholder="Enter description" />
          <Button type="submit" className="w-full md:mb-0.5 md:w-auto">
            Save
          </Button>
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-primary">Manage product categories</h2>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
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
              {CATEGORIES.map((category) => (
                <tr key={category.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{category.name}</td>
                  <td className="max-w-md px-5 py-4 text-slate-400">{category.description}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{category.products}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction icon={Pencil} tone="primary" aria-label="Edit category" />
                      <IconAction icon={Trash2} tone="danger" aria-label="Delete category" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {CATEGORIES.map((category) => (
            <MobileCard
              key={category.id}
              title={category.name}
              actions={
                <>
                  <IconAction icon={Pencil} tone="primary" aria-label="Edit category" />
                  <IconAction icon={Trash2} tone="danger" aria-label="Delete category" />
                </>
              }
            >
              <DetailRow label="Products" value={category.products} />
              <DetailRow label="Description" value={category.description} full />
            </MobileCard>
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default CategoriesPage
