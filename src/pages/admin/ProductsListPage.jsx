import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Power, PowerOff, X } from 'lucide-react'
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
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'

const FILTERS = [
  { label: 'Category' },
  { label: 'Price' },
  { label: 'Location' },
  { label: 'Product Status', options: PRODUCT_STATUS_FILTER_OPTIONS },
]

const TABLE_HEAD = ['Product', 'SKU', 'Category', 'Price', 'Stock', 'Supplier', 'Status', 'Action']

function ProductActions({ product, onApprove, onReject, onActivate, onDeactivate }) {
  if (product.status === 'pending_approval' || product.status === 'draft') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove(product.id)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(product.id)}
          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    )
  }

  if (product.status === 'approved') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onActivate(product.id)}
          className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-100"
        >
          <Power className="h-3.5 w-3.5" />
          Activate
        </button>
        <button
          type="button"
          onClick={() => onReject(product.id)}
          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    )
  }

  if (product.status === 'active') {
    return (
      <button
        type="button"
        onClick={() => onDeactivate(product.id)}
        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
      >
        <PowerOff className="h-3.5 w-3.5" />
        Deactivate
      </button>
    )
  }

  if (product.status === 'rejected') {
    return (
      <button
        type="button"
        onClick={() => onApprove(product.id)}
        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        <Check className="h-3.5 w-3.5" />
        Re-approve
      </button>
    )
  }

  return <span className="text-xs text-slate-400">—</span>
}

function ProductsListPage() {
  const { pushToast } = useDisputeNotifications()
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All Statuses')

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
    if (!statusValue) return products
    return products.filter((product) => product.status === statusValue)
  }, [products, statusFilter])

  const runAction = async (action, id, successMessage) => {
    setError('')
    try {
      const data = await action(id)
      pushToast({ message: data.message || successMessage })
      await loadProducts()
    } catch (err) {
      setError(getErrorMessage(err, 'Action failed.'))
    }
  }

  const handleApprove = async (id) => {
    try {
      const commissionInput = window.prompt('Commission % (optional, leave blank to keep current):', '')
      if (commissionInput === null) return
      const body = {}
      if (commissionInput.trim() !== '') {
        body.commission = Number(commissionInput)
      }
      const data = await adminApi.approveProduct(id, body)
      pushToast({ message: data.message || 'Product approved.' })
      await loadProducts()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve product.'))
    }
  }

  const handleReject = (id) => runAction(adminApi.rejectProduct, id, 'Product rejected.')
  const handleActivate = (id) => runAction(adminApi.activateProduct, id, 'Product activated.')
  const handleDeactivate = (id) => runAction(adminApi.deactivateProduct, id, 'Product deactivated.')

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

      <h2 className="mb-3 text-sm font-bold text-slate-900">All products</h2>
      <p className="mb-4 text-sm text-slate-500">
        Approve products first, then activate them to make them visible on the user marketplace.
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
                  <th key={head} className="whitespace-nowrap px-5 py-3 font-medium">
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
                <tr key={product.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.sku}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.category}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">${Number(product.price).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.quantity}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                      {PRODUCT_STATUS_LABEL[product.status] || product.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <ProductActions
                      product={product}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onActivate={handleActivate}
                      onDeactivate={handleDeactivate}
                    />
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
                <ProductActions
                  product={product}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                />
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
