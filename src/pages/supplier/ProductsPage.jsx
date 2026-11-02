import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Plus,
  Power,
  PowerOff,
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
  SUPPLIER_PRODUCT_STATUS_FILTER_OPTIONS,
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
  { label: 'Product Status', options: SUPPLIER_PRODUCT_STATUS_FILTER_OPTIONS },
]

const TABLE_HEAD = [
  'Product',
  'SKU',
  'Category',
  'Price & You Earn',
  'Stock (WMS Verified)',
  'Marketplace Fee',
  'Status',
  'Product Action',
  'WMS Sync / Verify',
]

function SupplierProductsPage() {
  const { user } = useAuth()
  const isWmsSupplier = Boolean(user?.isWmsRegistered)

  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState(null)
  const [statusActionLoadingId, setStatusActionLoadingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All Listings')
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

  const handleToggleProductStatus = async (product, action) => {
    setStatusActionLoadingId(product.id)
    setError('')
    setActionSuccess('')
    try {
      const res =
        action === 'deactivate'
          ? await productApi.deactivate(product.id)
          : await productApi.activate(product.id)

      setActionSuccess(
        res.message ||
          (action === 'deactivate'
            ? `Product "${product.name}" deactivated.`
            : `Product "${product.name}" activated and live on marketplace!`),
      )
      if (res.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)))
      } else {
        loadProducts()
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${action} product.`))
    } finally {
      setStatusActionLoadingId(null)
    }
  }

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
      if (statusValue) {
        if (statusValue === 'pending_approval') {
          if (product.status !== 'pending_approval') return false
        } else if (statusValue === 'active_listing') {
          const isApproved = product.status === 'approved' || product.status === 'active'
          const inStock = Number(product.quantity || 0) > 0 && product.status !== 'out_of_stock'
          if (!isApproved || !inStock) return false
        } else if (statusValue === 'out_of_stock_listing') {
          const isZeroStock = Number(product.quantity || 0) <= 0 || product.status === 'out_of_stock'
          if (!isZeroStock) return false
        } else if (statusValue === 'deactivated_listing') {
          if (product.status !== 'inactive' && product.status !== 'deactivated') return false
        } else if (statusValue === 'drafts') {
          if (product.status !== 'draft') return false
        } else if (product.status !== statusValue) {
          return false
        }
      }
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

  const isSuspended = user?.status === 'suspended'

  return (
    <SupplierLayout>
      <PageHeader
        eyebrow="Supplier Panel • Inventory & Catalog"
        title="Products Listing"
        action={
          isSuspended ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs cursor-not-allowed"
              title="Product publishing disabled due to account suspension"
            >
              <Lock className="h-3.5 w-3.5" />
              Add Product (Locked)
            </span>
          ) : (
            <Button as={Link} to="/supplier/product/create" size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          )
        }
      />

      {isSuspended && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Marketplace Listings Deactivated — Account Suspended.</span>{' '}
              <span>Your products are inactive and hidden from buyers. Reason: {user?.suspensionReason || 'Performance policy violation'}.</span>
            </div>
          </div>
          <Link
            to="/supplier/disputes"
            className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-xs font-bold text-white shadow-xs"
          >
            Appeal
          </Link>
        </div>
      )}

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

                    {/* Price & You Earn */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-extrabold text-slate-900">${Number(product.price || 0).toFixed(2)}</p>
                      {product.commission !== undefined && product.commission !== null ? (
                        <p className="text-[11px] font-semibold text-emerald-600">
                          Net: +${((Number(product.price || 0) * (100 - Number(product.commission || 0))) / 100).toFixed(2)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({product.commission}% fee)</span>
                        </p>
                      ) : null}
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

                    {/* Product Action (Deactivate / Activate Button) */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {product.status === 'approved' || product.status === 'active' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={statusActionLoadingId === product.id}
                          onClick={() => handleToggleProductStatus(product, 'deactivate')}
                          className="h-8 px-3 text-xs font-semibold text-rose-700 border-rose-300 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-800 transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                          title="Deactivate this product to temporarily hide it from the marketplace"
                        >
                          <PowerOff className="h-3.5 w-3.5 text-rose-600" />
                          <span>{statusActionLoadingId === product.id ? 'Working…' : 'Deactivate'}</span>
                        </Button>
                      ) : product.status === 'inactive' || product.status === 'deactivated' ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={statusActionLoadingId === product.id}
                          onClick={() => handleToggleProductStatus(product, 'activate')}
                          className="h-8 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                          title="Activate this product to make it live again on the marketplace"
                        >
                          <Power className="h-3.5 w-3.5 text-white" />
                          <span>{statusActionLoadingId === product.id ? 'Working…' : 'Activate'}</span>
                        </Button>
                      ) : product.status === 'draft' ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200"
                          title="Draft saved. Complete and submit for admin approval."
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          <span>Draft Saved</span>
                        </span>
                      ) : product.status === 'pending_approval' ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200"
                          title="Waiting for admin approval"
                        >
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Pending Review</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 border border-rose-200"
                          title="Rejected by admin. Edit and resubmit."
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Rejected</span>
                        </span>
                      )}
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

                {/* Mobile Actions: Status Action + WMS Action */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div>
                    {product.status === 'approved' || product.status === 'active' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={statusActionLoadingId === product.id}
                        onClick={() => handleToggleProductStatus(product, 'deactivate')}
                        className="h-8 px-2.5 text-xs font-semibold text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100"
                      >
                        <PowerOff className="h-3 w-3 mr-1 text-rose-600" />
                        <span>Deactivate</span>
                      </Button>
                    ) : product.status === 'inactive' || product.status === 'deactivated' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={statusActionLoadingId === product.id}
                        onClick={() => handleToggleProductStatus(product, 'activate')}
                        className="h-8 px-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Power className="h-3 w-3 mr-1 text-white" />
                        <span>Activate</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 capitalize">{product.status}</span>
                    )}
                  </div>

                  {isWmsSupplier && (
                    <div>
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
                          <span>Sync WMS</span>
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
