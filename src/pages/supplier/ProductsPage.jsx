import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { SUPPLIER_PRODUCTS } from '../../lib/mockData.js'

const FILTERS = [
  { label: 'Select Category' },
  { label: 'Price' },
  { label: 'Location' },
  { label: 'Product Status' },
]

const TABLE_HEAD = ['Product', 'SKU', 'Category', 'Location', 'Price', 'Stock', 'Supplier', 'Status', 'Actions']

function SupplierProductsPage() {
  const isEmpty = SUPPLIER_PRODUCTS.length === 0

  return (
    <SupplierLayout>
      <PageHeader
        eyebrow="Supplier Panel"
        title="Products Listing"
        action={
          <Button as={Link} to="/supplier/product/create" size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <FilterBar filters={FILTERS} />

      <h2 className="mb-3 text-sm font-bold text-slate-900">Products in the marketplace</h2>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{isEmpty && <EmptyState message="No products found." colSpan={TABLE_HEAD.length} />}</tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="md:hidden">
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No products found.</p>}
        </div>
      </Card>

      <p className="mt-4 text-sm text-slate-500">
        Showing {SUPPLIER_PRODUCTS.length} to {SUPPLIER_PRODUCTS.length} of {SUPPLIER_PRODUCTS.length} results
      </p>
    </SupplierLayout>
  )
}

export default SupplierProductsPage
