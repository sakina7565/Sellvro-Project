import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  XCircle,
} from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { productApi, getErrorMessage } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  PRODUCT_STATUS_FILTER_OPTIONS,
  PRODUCT_STATUS_HINT,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  statusFilterToValue,
  isProductWmsVerified,
} from '../../lib/productStatus.js'

const FILTERS = [
  { label: 'Select Category' },
  { label: 'Price' },
  { label: 'Location' },
  { label: 'Product Status', options: PRODUCT_STATUS_FILTER_OPTIONS },
]

const TABLE_HEAD = [
  'Product',
  'SKU',
  'Category',
  'Price',
  'Stock (WMS Verified)',
  'Marketplace Fee',
  'Status',
  'WMS Sync / Action',
]

function SupplierProductsPage() {
  const { user } = useAuth()
  const isWmsSupplier = Boolean(user?.isWmsRegistered)

  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = (searchParams.get('q') || '').trim()

  const loadProducts = () => {
    setLoading(true)
    productApi
      .mine()
      .then((data) => {
        setProducts(data.data || [])
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load products.'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleVerifyWms = async (product) => {
    setVerifyingId(product.id)
    setError('')
    setActionSuccess('')
    try {
      const res = await productApi.verifyWms(product.id)
      setActionSuccess(
        res.message ||
          `Product "${product.name}" (${product.sku}) verified with Sellvro WMS! Quantity updated to warehouse intake and fee adjusted.`,
      )
      if (res.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)))
      } else {
        loadProducts()
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to verify SKU "${product.sku}" with WMS.`))
    } finally {
      setVerifyingId(null)
    }
  }

  const handleSyncWms = async (product) => {
    setVerifyingId(product.id)
    setError('')
    setActionSuccess('')
    try {
      const res = await productApi.syncWmsStock(product.id)
      setActionSuccess(res.message || `Live warehouse stock updated for SKU "${product.sku}".`)
      if (res.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)))
      } else {
        loadProducts()
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to sync stock for SKU "${product.sku}".`))
    } finally {
      setVerifyingId(null)
    }
  }

  const filteredProducts = useMemo(() => {
    const statusValue = statusFilterToValue(statusFilter)
    const qLower = searchQuery.toLowerCase()

    return products.filter((product) => {
      if (statusValue && product.status !== statusValue) return false
      if (qLower) {
        const nameMatch = product.name?.toLowerCase().includes(qLower)
        const skuMatch = product.sku?.toLowerCase().includes(qLower)
        const catMatch = product.category?.toLowerCase().includes(qLower)
        const descMatch = product.description?.toLowerCase().includes(qLower)
        return Boolean(nameMatch || skuMatch || catMatch || descMatch)
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
    <SupplierLayout>
      <PageHeader
        eyebrow="Supplier Panel • Inventory & Catalog"
        title="Products Listing"
        action={
          <Button as={Link} to="/supplier/product/create" size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" />
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

      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess('')}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-700 hover:text-rose-950"
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

      {/* Explanatory Policy Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-primary-50/30 p-3.5 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>WMS Stock Verification &amp; Fee Policy:</strong> Stock for WMS Verified products is locked to verified warehouse intake (cannot be updated manually). Marketplace fee for verified WMS inventory is adjusted to WMS fulfillment policy rate (0%).
          </span>
        </div>
        {isWmsSupplier && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
            WMS Supplier Account Active
          </span>
        )}
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-4 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredProducts.length === 0 && (
                <EmptyState message="No products found." colSpan={TABLE_HEAD.length} />
              )}
              {filteredProducts.map((product) => {
                const isVerified = isProductWmsVerified(product)
                const isBusy = verifyingId === product.id

                return (
                  <tr key={product.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    {/* Product Name */}
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800 max-w-[200px] truncate">
                      {product.name}
                    </td>

                    {/* SKU */}
                    <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-xs text-slate-700">
                      {product.sku}
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-4 py-4 text-slate-500 text-xs">
                      {product.category}
                    </td>

                    {/* Price */}
                    <td className="whitespace-nowrap px-4 py-4 font-extrabold text-slate-900">
                      ${Number(product.price || 0).toFixed(2)}
                    </td>

                    {/* Stock (WMS Verified vs Self) */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {isVerified ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {product.quantity ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                              <Lock className="h-2.5 w-2.5 text-emerald-700" /> WMS Verified
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Intake custody locked
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">
                            {product.quantity ?? 0}
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            Self-Reported
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Marketplace Platform Fee */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {isVerified ? (
                        <div className="flex flex-col">
                          <span className="font-extrabold text-emerald-700 text-sm">
                            {product.commission ?? 0}%
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800">
                            WMS Policy Rate
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-bold text-amber-700 text-sm">
                            {product.commission ?? 8}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Direct Selling Fee
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status & WMS Verified Badge */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                          {PRODUCT_STATUS_LABEL[product.status] || product.status}
                        </Badge>
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold shadow-2xs">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>WMS Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold">
                            <Store className="h-2.5 w-2.5 text-slate-400" />
                            <span>Self-Fulfillment</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* WMS Sync / Action */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {isVerified ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSyncWms(product)}
                          className="h-8 px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-100 border-slate-300"
                          title="Sync live quantity directly from Sellvro WMS"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isBusy ? 'animate-spin' : ''}`} />
                          <span>Sync WMS Stock</span>
                        </Button>
                      ) : isWmsSupplier ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleVerifyWms(product)}
                          className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                          title="Verify SKU against Sellvro WMS warehouse intake"
                        >
                          {isBusy ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3 mr-1 text-white" />
                          )}
                          <span>Verify with WMS</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card Rendering */}
        <div className="space-y-3 p-4 md:hidden">
          {filteredProducts.length === 0 && !loading && (
            <p className="text-sm text-slate-500">No products found.</p>
          )}
          {filteredProducts.map((product) => {
            const isVerified = isProductWmsVerified(product)
            const isBusy = verifyingId === product.id

            return (
              <div key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                    <p className="text-xs font-mono text-slate-500 font-semibold">{product.sku}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                      {PRODUCT_STATUS_LABEL[product.status] || product.status}
                    </Badge>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold shadow-2xs">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>WMS Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold">
                        Self-Fulfillment
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Price</span>
                    <strong className="text-slate-900 font-bold">${Number(product.price || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock</span>
                    <strong className="text-slate-900 font-bold">
                      {product.quantity ?? 0} {isVerified ? '(Locked)' : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Platform Fee</span>
                    <strong className={isVerified ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {product.commission ?? (isVerified ? 0 : 8)}%
                    </strong>
                  </div>
                </div>

                {isWmsSupplier && (
                  <div className="pt-1 flex justify-end">
                    {isVerified ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleSyncWms(product)}
                        className="text-xs h-8"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isBusy ? 'animate-spin' : ''}`} />
                        <span>Sync WMS Stock</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleVerifyWms(product)}
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1 text-white" />
                        <span>Verify with WMS</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <p className="mt-4 text-sm text-slate-500">
        Showing {filteredProducts.length} of {products.length} results
      </p>
    </SupplierLayout>
  )
}

export default SupplierProductsPage
