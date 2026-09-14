import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { productApi, getErrorMessage } from '../../lib/api.js'
import {
  PRODUCT_STATUS_FILTER_OPTIONS,
  PRODUCT_STATUS_HINT,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  statusFilterToValue,
} from '../../lib/productStatus.js'

const FILTERS = [
  { label: 'Select Category' },
  { label: 'Price' },
  { label: 'Location' },
  { label: 'Product Status', options: PRODUCT_STATUS_FILTER_OPTIONS },
]

const TABLE_HEAD = ['Product', 'SKU', 'Category', 'Price', 'Stock', 'Status', 'Notes']

function SupplierProductsPage() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All Statuses')

  useEffect(() => {
    let active = true
    productApi
      .mine()
      .then((data) => {
        if (active) setProducts(data.data || [])
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load products.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const statusValue = statusFilterToValue(statusFilter)
    if (!statusValue) return products
    return products.filter((product) => product.status === statusValue)
  }, [products, statusFilter])

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

      <FilterBar
        filters={FILTERS.map((filter) =>
          filter.label === 'Product Status'
            ? { ...filter, value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) }
            : filter,
        )}
      />

      <h2 className="mb-1 text-sm font-bold text-slate-900">Your products</h2>
      <p className="mb-4 text-sm text-slate-500">
        Submitted products stay hidden until an admin uses <span className="font-medium text-slate-700">Approve &amp; Activate</span> (or Approve, then Activate). Only Active products appear for users.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredProducts.length === 0 && (
                <EmptyState message="No products found." colSpan={TABLE_HEAD.length} />
              )}
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.sku}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.category}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">${Number(product.price).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.quantity}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                      {PRODUCT_STATUS_LABEL[product.status] || product.status}
                    </Badge>
                  </td>
                  <td className="max-w-[220px] px-5 py-4 text-xs text-slate-500">
                    {PRODUCT_STATUS_HINT[product.status] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredProducts.length === 0 && !loading && <p className="text-sm text-slate-500">No products found.</p>}
          {filteredProducts.map((product) => (
            <div key={product.id} className="rounded-lg border border-slate-100 p-3">
              <p className="font-semibold text-slate-800">{product.name}</p>
              <p className="text-xs text-slate-400">{product.sku}</p>
              <p className="mt-1 text-sm text-slate-600">${Number(product.price).toFixed(2)}</p>
              <Badge className="mt-2" tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                {PRODUCT_STATUS_LABEL[product.status] || product.status}
              </Badge>
              <p className="mt-2 text-xs text-slate-500">{PRODUCT_STATUS_HINT[product.status]}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-sm text-slate-500">
        Showing {filteredProducts.length} of {products.length} results
      </p>
    </SupplierLayout>
  )
}

export default SupplierProductsPage
