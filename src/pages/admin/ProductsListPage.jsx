import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  SquarePen,
  Barcode,
  Info,
  AlertTriangle,
  Search,
  XCircle,
  Check,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import BarcodeModal from '../../components/admin/BarcodeModal.jsx'
import CreateDisputeModal from '../../components/admin/CreateDisputeModal.jsx'
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

const TABLE_HEAD = [
  'Product title',
  'SKU',
  'Category',
  'Stock',
  'Price & Cut',
  'Supplier',
  'Status',
  'Action',
]

/**
 * Format deterministic client ID (e.g. WMS-PAK1034) or use explicit supplier clientId.
 */
function getSupplierClientId(product) {
  if (product.supplierClientId) return product.supplierClientId
  if (product.clientId) return product.clientId
  if (product.client) return product.client
  const idStr = String(product.supplierId || '')
  if (idStr.startsWith('WMS-')) return idStr
  if (!idStr) return 'WMS-PAK1001'

  let hash = 0
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i)
    hash |= 0
  }
  const code = 1000 + Math.abs(hash % 9000)
  return `WMS-PAK${code}`
}

function ProductsListPage() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = (searchParams.get('q') || '').trim()

  // Modal state
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false)
  const [disputeProduct, setDisputeProduct] = useState(null)
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [disputeSuccessToast, setDisputeSuccessToast] = useState('')

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
        const clientCode = getSupplierClientId(product).toLowerCase()
        const clientMatch = clientCode.includes(qLower)
        const descMatch = product.description?.toLowerCase().includes(qLower)
        return Boolean(nameMatch || skuMatch || catMatch || suppMatch || clientMatch || descMatch)
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

      {disputeSuccessToast && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{disputeSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDisputeSuccessToast('')}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {searchQuery && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-2.5 text-sm text-primary-900">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <span>
              Searching for <strong className="font-semibold text-primary-950">&quot;{searchQuery}&quot;</strong> ({filteredProducts.length} results found)
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
        Manage products, print barcodes, edit inventory, inspect details, and resolve disputes.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th
                    key={head}
                    className={`whitespace-nowrap px-5 py-3 font-medium ${head === 'Action' ? 'text-center' : ''}`}
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
              {filteredProducts.map((product) => {
                const clientId = getSupplierClientId(product)

                return (
                  <tr key={product.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 last:border-0">
                    {/* Product Title */}
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      {product.name}
                    </td>

                    {/* SKU */}
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900 font-mono">
                      {product.sku}
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {product.category}
                    </td>

                    {/* Stock */}
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 font-medium">
                      {product.quantity ?? 0}
                    </td>

                    {/* Price & Cut */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-bold text-slate-800">${Number(product.price || 0).toFixed(2)}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mt-0.5" title="Sellvro Marketplace Commission Cut">
                        Cut: {product.commission || 0}%
                      </span>
                    </td>

                    {/* Supplier with ID on top and name below */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex flex-col">
                        <Link
                          to={`/admin/suppliers/sku-lookup?supplier=${encodeURIComponent(clientId)}`}
                          title="View Supplier Store & all SKUs"
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs tracking-wider"
                        >
                          {clientId}
                        </Link>
                        <span className="text-xs font-medium text-slate-700 mt-0.5">
                          {product.vendorName || product.supplierBusinessName || (product.supplier !== '—' ? product.supplier : '') || 'Verified Vendor'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                        {PRODUCT_STATUS_LABEL[product.status] || product.status}
                      </Badge>
                    </td>

                    {/* Action with Edit, Barcode, Details, Disputes */}
                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2.5">
                        {/* 1. Edit */}
                        <Link
                          to={`/admin/product/edits/${product.id}`}
                          title="Edit product"
                          aria-label="Edit product"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 shadow-xs transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
                        >
                          <SquarePen className="h-4 w-4" />
                        </Link>

                        {/* 2. Barcode */}
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeProduct(product)
                            setIsBarcodeOpen(true)
                          }}
                          title="View & Print Barcode"
                          aria-label="View & Print Barcode"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>

                        {/* 3. Details */}
                        <Link
                          to={`/admin/product/details/${product.id}`}
                          title="View product details"
                          aria-label="View product details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-600 shadow-xs transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 active:scale-95"
                        >
                          <Info className="h-4 w-4" />
                        </Link>

                        {/* 4. Disputes */}
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeProduct(product)
                            setIsDisputeOpen(true)
                          }}
                          title="Create Dispute / Complaint"
                          aria-label="Create Dispute / Complaint"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-amber-500 shadow-xs transition-all hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 active:scale-95"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filteredProducts.map((product) => {
            const clientId = getSupplierClientId(product)

            return (
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
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/product/edits/${product.id}`}
                      title="Edit"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600"
                    >
                      <SquarePen className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeProduct(product)
                        setIsBarcodeOpen(true)
                      }}
                      title="Barcode"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      <Barcode className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/admin/product/details/${product.id}`}
                      title="Details"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-600"
                    >
                      <Info className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDisputeProduct(product)
                        setIsDisputeOpen(true)
                      }}
                      title="Disputes"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-amber-500"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                  </div>
                }
              >
                <DetailRow label="Category" value={product.category} />
                <DetailRow label="Price" value={`$${Number(product.price || 0).toFixed(2)}`} />
                <DetailRow label="Stock" value={product.quantity ?? 0} />
                <DetailRow
                  label="Supplier"
                  value={
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-slate-800 text-xs">{clientId}</span>
                      <span className="text-xs font-medium text-slate-700">
                        {product.vendorName || product.supplierBusinessName || (product.supplier !== '—' ? product.supplier : '') || 'Verified Vendor'}
                      </span>
                    </div>
                  }
                  full
                />
              </MobileCard>
            )
          })}
        </div>

        <Pagination from={filteredProducts.length ? 1 : 0} to={filteredProducts.length} total={filteredProducts.length} />
      </Card>

      {/* Barcode Modal */}
      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => {
          setIsBarcodeOpen(false)
          setBarcodeProduct(null)
        }}
        product={barcodeProduct}
      />

      {/* Dispute Modal */}
      <CreateDisputeModal
        isOpen={isDisputeOpen}
        onClose={() => {
          setIsDisputeOpen(false)
          setDisputeProduct(null)
        }}
        product={disputeProduct}
        onSuccess={(msg) => {
          setDisputeSuccessToast(msg)
          setTimeout(() => setDisputeSuccessToast(''), 4500)
        }}
      />
    </AdminLayout>
  )
}

export default ProductsListPage
