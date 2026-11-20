import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  SquarePen,
  Barcode,
  Info,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Plus,
  Search,
  XCircle,
  DollarSign,
  Layers,
  Package,
  Lock,
  X,
  Tag,
  SlidersHorizontal,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import ProductImage from '../../components/ui/ProductImage.jsx'
import BarcodeModal from '../../components/admin/BarcodeModal.jsx'
import ProductResearchModal from '../../components/admin/ProductResearchModal.jsx'
import ProductSuggestionsModal from '../../components/products/ProductSuggestionsModal.jsx'
import SupplierProductDetailDrawer from '../../components/products/SupplierProductDetailDrawer.jsx'
import { productApi, categoryApi, getErrorMessage } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  SUPPLIER_PRODUCT_STATUS_FILTER_OPTIONS,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  statusFilterToValue,
  isProductWmsVerified,
} from '../../lib/productStatus.js'

const TABLE_HEAD = [
  'Product',
  'SKU',
  'Category',
  'Stock & Inventory',
  'Price & You Earn',
  'Status',
  'Landing Priority',
  'Actions',
]

function SupplierProductsPage() {
  const { user } = useAuth()
  const isWmsSupplier = Boolean(user?.isWmsRegistered)

  const [products, setProducts] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState(null)
  const [statusActionLoadingId, setStatusActionLoadingId] = useState(null)

  // Filters State
  const [statusFilter, setStatusFilter] = useState('All Listings')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = (searchParams.get('q') || '').trim()

  // Modals & Drawer State
  const [detailProduct, setDetailProduct] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false)

  const [suggestionsProduct, setSuggestionsProduct] = useState(null)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)

  const [researchProduct, setResearchProduct] = useState(null)
  const [isResearchOpen, setIsResearchOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        productApi.mine(),
        categoryApi.list(),
      ])

      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value?.data || [])
      } else {
        setError(getErrorMessage(prodRes.reason, 'Failed to load products.'))
      }

      if (catRes.status === 'fulfilled') {
        setCategoriesList(catRes.value?.data || [])
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load products.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Quick Status Toggle (Activate / Deactivate)
  const handleToggleProductStatus = async (product, action) => {
    setStatusActionLoadingId(product.id)
    setError('')
    setActionSuccess('')
    try {
      const res =
        action === 'deactivate'
          ? await productApi.deactivate(product.id)
          : await productApi.activate(product.id)

      const msg =
        res.message ||
        (action === 'deactivate'
          ? `Product "${product.name}" deactivated.`
          : `Product "${product.name}" activated and live on marketplace!`)

      setActionSuccess(msg)
      setTimeout(() => setActionSuccess(''), 4500)

      if (res.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)))
      } else {
        loadData()
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${action} product.`))
    } finally {
      setStatusActionLoadingId(null)
    }
  }

  // WMS SKU Verification
  const handleVerifyWms = async (product) => {
    setVerifyingId(product.id)
    setError('')
    setActionSuccess('')
    try {
      const res = await productApi.verifyWms(product.id)
      setActionSuccess(
        res.message ||
          `Product "${product.name}" (${product.sku}) verified with Sellvro WMS! Quantity updated to warehouse intake.`,
      )
      setTimeout(() => setActionSuccess(''), 4500)
      if (res.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)))
      } else {
        loadData()
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to verify SKU "${product.sku}" with WMS.`))
    } finally {
      setVerifyingId(null)
    }
  }

  // WMS Sync Stock
  const handleSyncWms = async (product) => {
    setVerifyingId(product.id)
    setError('')
    setActionSuccess('')
    try {
      const res = await productApi.syncWmsStock(product.id)
      setActionSuccess(res.message || `Live warehouse stock updated for SKU "${product.sku}".`)
      setTimeout(() => setActionSuccess(''), 4500)
      if (res.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)))
      } else {
        loadData()
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to sync stock for SKU "${product.sku}".`))
    } finally {
      setVerifyingId(null)
    }
  }

  // Dynamic Categories list with accurate product counts
  const categoryOptions = useMemo(() => {
    const set = new Set()
    categoriesList.forEach((c) => {
      const name = typeof c === 'string' ? c : c?.name
      if (name) set.add(name.trim())
    })
    products.forEach((p) => {
      const catName = typeof p?.category === 'object' ? p?.category?.name : p?.category
      if (catName) set.add(catName.trim())
    })

    const list = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))
    const totalVisible = products.length

    return [
      { label: `All Categories (${totalVisible})`, value: 'all' },
      ...list.map((cat) => {
        const count = products.filter((p) => {
          const pCat = typeof p?.category === 'object' ? p?.category?.name : p?.category
          return (pCat || '').toLowerCase() === cat.toLowerCase()
        }).length
        return {
          label: `${cat} (${count})`,
          value: cat,
        }
      }),
    ]
  }, [categoriesList, products])

  // Filter products by Status, Category, Min Price, Max Price, and Search
  const filteredProducts = useMemo(() => {
    const statusValue = statusFilterToValue(statusFilter)
    const qLower = searchQuery.toLowerCase()
    const min = minPrice !== '' && !isNaN(Number(minPrice)) ? Number(minPrice) : null
    const max = maxPrice !== '' && !isNaN(Number(maxPrice)) ? Number(maxPrice) : null

    return products
      .filter((product) => {
        // Category filter
        if (selectedCategory && selectedCategory !== 'all') {
          const pCat = typeof product?.category === 'object' ? product?.category?.name : product?.category
          if ((pCat || '').trim().toLowerCase() !== selectedCategory.toLowerCase()) {
            return false
          }
        }

        // Min & Max Price filter
        const price = Number(product.price || 0)
        if (min !== null && price < min) {
          return false
        }
        if (max !== null && price > max) {
          return false
        }

        // Status filter
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

        // Search query filter
        if (qLower) {
          const nameMatch = product.name?.toLowerCase().includes(qLower)
          const skuMatch = product.sku?.toLowerCase().includes(qLower)
          const catName = typeof product?.category === 'object' ? product?.category?.name : product?.category
          const catMatch = (catName || '').toLowerCase().includes(qLower)
          const descMatch = product.description?.toLowerCase().includes(qLower)
          return Boolean(nameMatch || skuMatch || catMatch || descMatch)
        }

        return true
      })
      .sort((a, b) => {
        const numA = parseInt(String(a.sku).replace(/\D+/g, ''), 10) || 0
        const numB = parseInt(String(b.sku).replace(/\D+/g, ''), 10) || 0
        if (numA !== numB) return numA - numB
        return String(a.sku).localeCompare(String(b.sku))
      })
  }, [products, statusFilter, searchQuery, selectedCategory, minPrice, maxPrice])

  // Summary Metrics Calculation
  const analytics = useMemo(() => {
    let totalStock = 0
    let totalInventoryValue = 0
    let activeCount = 0
    let inactiveCount = 0
    let priceSum = 0

    filteredProducts.forEach((p) => {
      const qty = Number(p.quantity || 0)
      const price = Number(p.price || 0)
      totalStock += qty
      totalInventoryValue += qty * price
      priceSum += price

      if (p.status === 'active' || p.status === 'approved') {
        activeCount++
      } else {
        inactiveCount++
      }
    })

    const avgPrice = filteredProducts.length > 0 ? priceSum / filteredProducts.length : 0

    return {
      totalProducts: filteredProducts.length,
      allProductsCount: products.length,
      totalStock,
      totalInventoryValue,
      activeCount,
      inactiveCount,
      avgPrice,
    }
  }, [filteredProducts, products])

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    setSearchParams(next)
  }

  // FilterBar configuration: Category dropdown, Min Price, Max Price, Reset Price button, and Status
  // Location filter has been completely removed as requested.
  const filterBarItems = [
    {
      label: 'Category',
      options: categoryOptions,
      value: selectedCategory,
      onChange: (e) => setSelectedCategory(e.target.value),
    },
    {
      type: 'number',
      placeholder: 'Min Price ($)',
      min: '0',
      step: 'any',
      value: minPrice,
      onChange: (e) => setMinPrice(e.target.value),
    },
    {
      type: 'number',
      placeholder: 'Max Price ($)',
      min: '0',
      step: 'any',
      value: maxPrice,
      onChange: (e) => setMaxPrice(e.target.value),
    },
    ...(minPrice || maxPrice
      ? [
          {
            type: 'custom',
            component: (
              <button
                type="button"
                onClick={() => {
                  setMinPrice('')
                  setMaxPrice('')
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
                title="Reset price range filter"
              >
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Reset Price</span>
              </button>
            ),
            key: 'clear-price',
          },
        ]
      : []),
    {
      label: 'Product Status',
      options: SUPPLIER_PRODUCT_STATUS_FILTER_OPTIONS,
      value: statusFilter,
      onChange: (e) => setStatusFilter(e.target.value),
    },
  ]

  const isSuspended = user?.status === 'suspended'

  return (
    <SupplierLayout>
      {/* Header */}
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
            <Button as={Link} to="/supplier/product/create" size="sm" className="w-full sm:w-auto font-bold">
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          )
        }
      />

      {/* Account Suspended Alert Banner */}
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

      {/* Filter Bar with Category dropdown, Min/Max Price filters, Status filter (Location removed) */}
      <FilterBar filters={filterBarItems} />

      {/* Intelligence & Summary Stats Banner (Matching Admin Panel) */}
      <div className="mb-5 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">
              {selectedCategory !== 'all' ? (
                <>
                  Category Intelligence:{' '}
                  <span className="text-amber-300 normal-case font-extrabold">{selectedCategory}</span>
                </>
              ) : (
                'Catalog & Inventory Overview'
              )}
            </h3>
          </div>
<<<<<<< HEAD
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Listing Count:</span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-bold text-white">
              {filteredProducts.length} of {products.length} products
=======
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
              Searching for <strong className="font-semibold text-primary-950">&quot;{searchQuery}&quot;</strong> ({filteredProducts.length} results found)
>>>>>>> origin/main
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Package className="h-3.5 w-3.5 text-indigo-400" />
              <span>Total Listed</span>
            </div>
            <p className="mt-1 text-lg font-black text-white">{analytics.totalProducts}</p>
            <p className="text-[10px] text-slate-400">
              {products.length !== filteredProducts.length ? `Filtered from ${products.length}` : 'All products'}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Active Live</span>
            </div>
            <p className="mt-1 text-lg font-black text-emerald-400">{analytics.activeCount}</p>
            <p className="text-[10px] text-slate-400">Live on marketplace</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span>Total Stock</span>
            </div>
            <p className="mt-1 text-lg font-black text-white">{analytics.totalStock.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">Available units</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <DollarSign className="h-3.5 w-3.5 text-sky-400" />
              <span>Inventory Value</span>
            </div>
            <p className="mt-1 text-lg font-black text-sky-400">
              ${analytics.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400">At retail price</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
              <span>Average Price</span>
            </div>
            <p className="mt-1 text-lg font-black text-purple-300">
              ${analytics.avgPrice.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400">Across current view</p>
          </div>
        </div>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 shadow-2xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 shadow-2xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search active notice */}
      {searchQuery && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-2.5 text-xs text-primary-900">
          <span>
            Searching for <strong className="font-semibold text-primary-950">&quot;{searchQuery}&quot;</strong> ({filteredProducts.length} results found)
          </span>
          <button
            type="button"
            onClick={clearSearch}
            className="flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Clear Search
          </button>
        </div>
      )}

      {/* Desktop & Tablet Table Card */}
      <Card className="overflow-hidden shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Package className="h-4 w-4 text-slate-500" />
            <span>Product Inventory Table</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
            <strong className="text-slate-900">{products.length}</strong> products
          </span>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {TABLE_HEAD.map((head, i) => (
                  <th
                    key={head}
                    className={`px-4 py-3.5 ${i === TABLE_HEAD.length - 1 ? 'text-center' : ''}`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="p-8 text-center text-sm text-slate-400">
                    Loading supplier products...
                  </td>
                </tr>
              )}

              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="p-12 text-center">
                    <EmptyState
                      title="No products found"
                      description={
                        searchQuery || statusFilter !== 'All Listings' || selectedCategory !== 'all' || minPrice || maxPrice
                          ? 'Try adjusting your search query, price range, or category filter.'
                          : 'You have not added any products yet. Click "Add Product" to get started.'
                      }
                      action={
                        <Button as={Link} to="/supplier/product/create" size="sm">
                          Add First Product
                        </Button>
                      }
                    />
                  </td>
                </tr>
              )}

              {filteredProducts.map((product) => {
                const isVerified = isProductWmsVerified(product)
                const isBusy = verifyingId === product.id
                const isStatusBusy = statusActionLoadingId === product.id
                const isActive = product.status === 'active' || product.status === 'approved'
                const statusTone = PRODUCT_STATUS_TONE[product.status] || 'neutral'
                const statusLabel = PRODUCT_STATUS_LABEL[product.status] || product.status || 'Active'

                const price = Number(product.price || 0)
                const feePercent = Number(product.commission || 8)
                const netEarn = price - (price * feePercent) / 100

                const catDisplay = (typeof product.category === 'object' ? product.category?.name : product.category) || 'General'
                const sisterCount = Array.isArray(product.sisterSkus) ? product.sisterSkus.length : 0

                return (
                  <tr key={product.id || product.sku} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. Product Image & Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <ProductImage product={product} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-slate-900 truncate text-xs hover:text-primary transition" title={product.name}>
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {product.brand && (
                              <span className="text-[11px] text-slate-500 font-medium">{product.brand}</span>
                            )}
                            {product.customizationAvailable && (
                              <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. SKU */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {product.sku}
                      </span>
                    </td>

                    {/* 3. Category & Subcategory */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-semibold text-xs text-slate-800 block">
                        {catDisplay}
                      </span>
                      {product.subcategory && (
                        <span className="text-[11px] text-slate-400 font-medium block">
                          › {product.subcategory}
                        </span>
                      )}
                    </td>

                    {/* 4. Stock & Inventory */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {product.quantity ?? 0}
                        </span>
                        <span className="text-[11px] text-slate-400">units</span>
                      </div>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          WMS Synced
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">Self Managed</span>
                      )}
                    </td>

                    {/* 5. Price & Net Earnings */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="font-extrabold text-slate-900 text-xs">
                        ${price.toFixed(2)}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-600">
                        Net: +${netEarn.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">({feePercent}% fee)</span>
                      </p>
                    </td>

                    {/* 6. Status Badge */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone={statusTone} className="font-bold">
                        {statusLabel}
                      </Badge>
                    </td>

                    {/* 7. Landing Priority */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            product.rankingPriority === 'high'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : product.rankingPriority === 'medium'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : product.rankingPriority === 'low'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {product.rankingPriority || 'standard'}
                        </span>
                        {product.globalMonthlySales ? (
                          <span className="text-[10px] font-mono text-slate-400">
                            {Number(product.globalMonthlySales).toLocaleString()}/mo
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* 8. Actions (Matching Admin Panel) */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {/* 1. View Details */}
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProduct(product)
                            setIsDetailOpen(true)
                          }}
                          title="View Product Details"
                          aria-label="View Product Details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-600 shadow-xs transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 active:scale-95 cursor-pointer"
                        >
                          <Info className="h-4 w-4" />
                        </button>

                        {/* 2. Edit Product */}
                        <Link
                          to={`/supplier/products/${product.id}/edit`}
                          title="Edit Product"
                          aria-label="Edit Product"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 shadow-xs transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
                        >
                          <SquarePen className="h-4 w-4" />
                        </Link>

                        {/* 3. Barcode Modal */}
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeProduct(product)
                            setIsBarcodeOpen(true)
                          }}
                          title="View & Print Barcode"
                          aria-label="View & Print Barcode"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 active:scale-95 cursor-pointer"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>

                        {/* 4. Product Suggestions (Sister SKUs) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSuggestionsProduct(product)
                            setIsSuggestionsOpen(true)
                          }}
                          title={`Product Suggestions & Sister SKUs (${sisterCount} linked)`}
                          aria-label="Product Suggestions"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-xs transition-all hover:border-amber-400 hover:bg-amber-100 hover:text-amber-800 active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4" />
                        </button>

                        {/* 5. Landing Page Priority & Research */}
                        <button
                          type="button"
                          onClick={() => {
                            setResearchProduct(product)
                            setIsResearchOpen(true)
                          }}
                          title="Landing Page Priority & Market Research"
                          aria-label="Landing Page Priority"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 shadow-xs transition-all hover:border-purple-400 hover:bg-purple-100 hover:text-purple-800 active:scale-95 cursor-pointer"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>

                        {/* 6. Active / Inactive Status Management Toggle */}
                        {isActive ? (
                          <button
                            type="button"
                            disabled={isStatusBusy}
                            onClick={() => handleToggleProductStatus(product, 'deactivate')}
                            title="Deactivate listing (Hide from marketplace)"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 shadow-xs transition-all hover:border-rose-400 hover:bg-rose-100 active:scale-95 cursor-pointer"
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                          </button>
                        ) : product.status === 'inactive' || product.status === 'deactivated' ? (
                          <button
                            type="button"
                            disabled={isStatusBusy}
                            onClick={() => handleToggleProductStatus(product, 'activate')}
                            title="Activate listing (Make live on marketplace)"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-xs transition-all hover:border-emerald-400 hover:bg-emerald-100 active:scale-95 cursor-pointer"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        {/* 7. Dispute / Report Issue */}
                        <Link
                          to={`/supplier/disputes?product=${product.id}`}
                          title="Report Issue / Dispute"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-amber-600 shadow-xs transition-all hover:border-amber-400 hover:bg-amber-50 active:scale-95"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Link>

                        {/* 8. WMS Sync / Verify (if applicable) */}
                        {isVerified ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSyncWms(product)}
                            title="Sync live inventory with Sellvro WMS"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs transition-all hover:border-emerald-400 hover:bg-emerald-100 active:scale-95 cursor-pointer"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                          </button>
                        ) : isWmsSupplier ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleVerifyWms(product)}
                            title="Verify SKU against Sellvro WMS warehouse intake"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-600 text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95 cursor-pointer"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards (Matching Admin Panel) */}
        <div className="space-y-3 p-4 md:hidden">
          {filteredProducts.length === 0 && !loading && (
            <p className="text-center text-sm text-slate-500 py-6">No products found matching filters.</p>
          )}

          {filteredProducts.map((product) => {
            const isVerified = isProductWmsVerified(product)
            const isBusy = verifyingId === product.id
            const isActive = product.status === 'active' || product.status === 'approved'
            const statusTone = PRODUCT_STATUS_TONE[product.status] || 'neutral'
            const statusLabel = PRODUCT_STATUS_LABEL[product.status] || product.status || 'Active'
            const price = Number(product.price || 0)
            const feePercent = Number(product.commission || 8)
            const netEarn = price - (price * feePercent) / 100
            const catDisplay = (typeof product.category === 'object' ? product.category?.name : product.category) || 'General'

            return (
              <div key={product.id || product.sku} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <ProductImage product={product} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                          {product.sku}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium truncate">{catDisplay}</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 mt-1">
                        ${price.toFixed(2)}{' '}
                        <span className="text-[11px] font-semibold text-emerald-600">
                          (Net: +${netEarn.toFixed(2)})
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusTone} className="shrink-0 font-bold text-[10px]">
                    {statusLabel}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>Stock: <strong className="text-slate-900">{product.quantity ?? 0}</strong></span>
                    {isVerified && <span className="text-[10px] text-emerald-600 font-bold">• WMS Synced</span>}
                  </div>
                  <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                    {product.rankingPriority || 'standard'} Priority
                  </span>
                </div>

                {/* Mobile Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailProduct(product)
                        setIsDetailOpen(true)
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-600 shadow-2xs"
                      title="Details"
                    >
                      <Info className="h-4 w-4" />
                    </button>

                    <Link
                      to={`/supplier/products/${product.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 shadow-2xs"
                      title="Edit"
                    >
                      <SquarePen className="h-4 w-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeProduct(product)
                        setIsBarcodeOpen(true)
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs"
                      title="Barcode"
                    >
                      <Barcode className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSuggestionsProduct(product)
                        setIsSuggestionsOpen(true)
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-2xs"
                      title="Suggestions"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResearchProduct(product)
                        setIsResearchOpen(true)
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 shadow-2xs"
                      title="Landing Priority"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleProductStatus(product, 'deactivate')}
                        className="h-8 text-xs text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 font-bold"
                      >
                        <PowerOff className="h-3.5 w-3.5 mr-1" />
                        Deactivate
                      </Button>
                    ) : product.status === 'inactive' || product.status === 'deactivated' ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleToggleProductStatus(product, 'activate')}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <Power className="h-3.5 w-3.5 mr-1" />
                        Activate
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Footer Count */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>
          Accurate Listing Count: Showing <strong className="text-slate-900 font-bold">{filteredProducts.length}</strong> of{' '}
          <strong className="text-slate-900 font-bold">{products.length}</strong> total products
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span>Active: {analytics.activeCount}</span>
          <span className="text-slate-300">•</span>
          <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
          <span>Inactive: {analytics.inactiveCount}</span>
        </div>
      </div>

      {/* Modals & Drawer */}
      {/* 1. Barcode Modal */}
      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => {
          setIsBarcodeOpen(false)
          setBarcodeProduct(null)
        }}
        product={barcodeProduct}
      />

      {/* 2. Product Suggestions & Sister SKUs Modal */}
      <ProductSuggestionsModal
        isOpen={isSuggestionsOpen}
        onClose={() => {
          setIsSuggestionsOpen(false)
          setSuggestionsProduct(null)
        }}
        onSuccess={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setActionSuccess('Product suggestions & sister SKUs updated successfully!')
          setTimeout(() => setActionSuccess(''), 4500)
        }}
        product={suggestionsProduct}
        allProducts={products}
      />

      {/* 3. Product Research & Landing Page Priority Modal */}
      <ProductResearchModal
        isOpen={isResearchOpen}
        onClose={() => {
          setIsResearchOpen(false)
          setResearchProduct(null)
        }}
        onSuccess={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setActionSuccess('Product research & landing page priority updated successfully!')
          setTimeout(() => setActionSuccess(''), 4500)
        }}
        product={researchProduct}
        panel="supplier"
      />

      {/* 4. Product Details Drawer */}
      <SupplierProductDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setDetailProduct(null)
        }}
        product={detailProduct}
        onOpenBarcode={(p) => {
          setBarcodeProduct(p)
          setIsBarcodeOpen(true)
        }}
        onOpenSuggestions={(p) => {
          setSuggestionsProduct(p)
          setIsSuggestionsOpen(true)
        }}
        onOpenPriority={(p) => {
          setResearchProduct(p)
          setIsResearchOpen(true)
        }}
      />
    </SupplierLayout>
  )
}

export default SupplierProductsPage
