import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Search, XCircle } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'
import {
  PRODUCT_STATUS_FILTER_OPTIONS,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  statusFilterToValue,
} from '../../lib/productStatus.js'

const FILTERS = [
  { label: 'Category' },
  { label: 'Price' },
  { label: 'Location' },
  { label: 'Product Status', options: PRODUCT_STATUS_FILTER_OPTIONS },
]

const TABLE_HEAD = ['Product', 'SKU', 'Category', 'Price', 'Stock', 'Supplier', 'Status', 'Details']

function ProductsListPage() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = (searchParams.get('q') || '').trim()

  const loadProducts = async () => {
    setError('')
    try {
      const data = await adminApi.products()
      setProducts(data.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load products.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    const statusValue = statusFilterToValue(statusFilter)
    const qLower = searchQuery.toLowerCase()

    return products.filter((product) => {
      if (statusValue && product.status !== statusValue) return false
      if (qLower) {
        const nameMatch = product.name?.toLowerCase().includes(qLower)
        const skuMatch = product.sku?.toLowerCase().includes(qLower)
        const catMatch = product.category?.toLowerCase().includes(qLower)
        const suppMatch = (product.supplierName || product.supplier?.fullName || '').toLowerCase().includes(qLower)
        const descMatch = product.description?.toLowerCase().includes(qLower)
        return Boolean(nameMatch || skuMatch || catMatch || suppMatch || descMatch)
      }
      return true
    })
  }, [products, statusFilter, searchQuery])

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    setSearchParams(next)
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Products Listing"
        action={
          <Button as={Link} to="/admin/product/create" size="sm">
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

      {searchQuery && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-2.5 text-sm text-primary-900">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <span>
              Searching for <strong className="font-semibold text-primary-950">"{searchQuery}"</strong> ({filteredProducts.length} results found)
            </span>
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-800 hover:underline"
          >
            <XCircle className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}

      <h2 className="mb-1 text-base font-bold text-slate-900">All products</h2>
      <p className="mb-4 text-sm text-slate-500">
        Click on the arrow in the <span className="font-semibold text-slate-700">Details</span> column to view full product details, set commission, and approve or activate items.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th
                    key={head}
                    className={`whitespace-nowrap px-5 py-3 font-medium ${head === 'Details' ? 'text-center' : ''}`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    No products found.
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.sku}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.category}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700 font-medium">${Number(product.price).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.quantity}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                      {PRODUCT_STATUS_LABEL[product.status] || product.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    <Link
                      to={`/admin/products/${product.id}`}
                      title="View product details & configure commission"
                      className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition-all hover:border-primary-500 hover:bg-primary-50 hover:text-primary active:scale-95"
                    >
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredProducts.map((product) => (
            <MobileCard
              key={product.id}
              title={product.name}
              subtitle={product.sku}
              badge={
                <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                  {PRODUCT_STATUS_LABEL[product.status] || product.status}
                </Badge>
              }
              actions={
                <Link
                  to={`/admin/products/${product.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-primary-500 hover:bg-primary-50 hover:text-primary transition-colors"
                >
                  <span>Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <DetailRow label="Category" value={product.category} />
              <DetailRow label="Price" value={`$${Number(product.price).toFixed(2)}`} />
              <DetailRow label="Stock" value={product.quantity} />
              <DetailRow label="Supplier" value={product.supplier} full />
            </MobileCard>
          ))}
        </div>

        <Pagination from={filteredProducts.length ? 1 : 0} to={filteredProducts.length} total={filteredProducts.length} />
      </Card>
    </AdminLayout>
  )
}

export default ProductsListPage
