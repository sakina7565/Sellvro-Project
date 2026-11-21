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
  ShieldCheck,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import ProductImage from '../../components/ui/ProductImage.jsx'
import BarcodeModal from '../../components/admin/BarcodeModal.jsx'
import CreateDisputeModal from '../../components/admin/CreateDisputeModal.jsx'
import ProductResearchModal from '../../components/admin/ProductResearchModal.jsx'
import { adminApi, categoryApi, getErrorMessage } from '../../lib/api.js'
import {
  ADMIN_PRODUCT_STATUS_FILTER_OPTIONS,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  statusFilterToValue,
  isProductWmsVerified,
} from '../../lib/productStatus.js'

const TABLE_HEAD = [
  'Product',
  'Product ID & SKU',
  'Category',
  'Stock & Sold',
  'Price & Fee',
  'Supplier',
  'Status',
  'Landing Priority',
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
  const [categoriesList, setCategoriesList] = useState([])
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All Listings')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = (searchParams.get('q') || '').trim()

  // Modal state
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false)
  const [disputeProduct, setDisputeProduct] = useState(null)
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [disputeSuccessToast, setDisputeSuccessToast] = useState('')
  const [researchProduct, setResearchProduct] = useState(null)
  const [isResearchOpen, setIsResearchOpen] = useState(false)

  const loadData = async () => {
    setError('')
    try {
      const [productsRes, categoriesRes, ordersRes] = await Promise.allSettled([
        adminApi.products(),
        categoryApi.list(),
        adminApi.orders(),
      ])

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value?.data || [])
      } else {
        setError(getErrorMessage(productsRes.reason, 'Failed to load products.'))
      }

      if (categoriesRes.status === 'fulfilled') {
        setCategoriesList(categoriesRes.value?.data || [])
      }

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value?.data || [])
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

  const handleApproveProduct = async (product) => {
    setApprovingId(product.id)
    setError('')
    try {
      await adminApi.approveProduct(product.id, { activate: true })
      setDisputeSuccessToast(`Product "${product.name}" approved successfully and is now live on marketplace!`)
      setTimeout(() => setDisputeSuccessToast(''), 4500)
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve product.'))
    } finally {
      setApprovingId(null)
    }
  }

  // Build product-level sales & order performance from orders
  const salesStatsByProduct = useMemo(() => {
    const map = {}
    orders.forEach((o) => {
      if (o.status === 'cancelled') return
      const qty = Number(o.quantity || o.items || 1)
      const rev = Number(o.total || qty * Number(o.unitPrice || 0) || 0)
      const comm = Number(o.commission || (rev * Number(o.commissionPercent || 8)) / 100 || 0)

      const keys = [
        o.productId,
        o.productSku,
        o.product,
      ].filter(Boolean)

      keys.forEach((key) => {
        if (!map[key]) {
          map[key] = { unitsSold: 0, revenue: 0, commission: 0, ordersCount: 0 }
        }
        map[key].unitsSold += qty
        map[key].revenue += rev
        map[key].commission += comm
        map[key].ordersCount += 1
      })
    })
    return map
  }, [orders])

  const getProductSales = (product) => {
    return (
      salesStatsByProduct[product.id] ||
      salesStatsByProduct[product._id] ||
      salesStatsByProduct[product.sku] ||
      salesStatsByProduct[product.name] || { unitsSold: 0, revenue: 0, commission: 0, ordersCount: 0 }
    )
  }

  // Dynamic Categories list with product counts
  const categoryOptions = useMemo(() => {
    const set = new Set()
    categoriesList.forEach((c) => {
      if (c?.name) set.add(c.name.trim())
    })
    products.forEach((p) => {
      if (p?.category) set.add(p.category.trim())
    })

    const list = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))
    const totalVisible = products.filter((p) => p.status !== 'draft').length

    return [
      { label: `All Categories (${totalVisible})`, value: 'all' },
      ...list.map((cat) => {
        const count = products.filter(
          (p) => p.status !== 'draft' && (p.category || '').toLowerCase() === cat.toLowerCase(),
        ).length
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
        // Drafts belong privately to suppliers and are NEVER visible to admin
        if (product.status === 'draft') return false

        // Category filter
        if (selectedCategory && selectedCategory !== 'all') {
          const pCat = (product.category || '').trim().toLowerCase()
          if (pCat !== selectedCategory.toLowerCase()) {
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
          } else if (product.status !== statusValue) {
            return false
          }
        }

        // Search query filter
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
      .sort((a, b) => {
        const numA = parseInt(String(a.sku).replace(/\D+/g, ''), 10) || 0
        const numB = parseInt(String(b.sku).replace(/\D+/g, ''), 10) || 0
        if (numA !== numB) return numA - numB
        return String(a.sku).localeCompare(String(b.sku))
      })
  }, [products, statusFilter, searchQuery, selectedCategory, minPrice, maxPrice])

  // Category & Price Analytics computation
  const analytics = useMemo(() => {
    let totalStock = 0
    let totalInventoryValue = 0
    let totalSoldUnits = 0
    let totalRevenue = 0
    let totalCommission = 0
    let priceSum = 0

    filteredProducts.forEach((p) => {
      const qty = Number(p.quantity || 0)
      const price = Number(p.price || 0)
      const sales = getProductSales(p)

      totalStock += qty
      totalInventoryValue += qty * price
      priceSum += price
      totalSoldUnits += sales.unitsSold
      totalRevenue += sales.revenue
      totalCommission += sales.commission
    })

    const avgPrice = filteredProducts.length > 0 ? priceSum / filteredProducts.length : 0

    return {
      totalProducts: filteredProducts.length,
      totalStock,
      totalInventoryValue,
      totalSoldUnits,
      totalRevenue,
      totalCommission,
      avgPrice,
    }
  }, [filteredProducts, salesStatsByProduct])

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    setSearchParams(next)
  }

  // Construct FilterBar items: Category dropdown, Min Price, Max Price, Reset Price button, and All Listing (Product Status)
  // Location filter has been completely removed.
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
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
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
      options: ADMIN_PRODUCT_STATUS_FILTER_OPTIONS,
      value: statusFilter,
      onChange: (e) => setStatusFilter(e.target.value),
    },
  ]

  return (
    <AdminLayout>
      <PageHeader title="Products Listing" />

      {/* Filter Bar with Category, Min Price, Max Price, and Status filters (Location removed) */}
      <FilterBar filters={filterBarItems} />

      {/* Category & Price Sales & Inventory Intelligence Card */}
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
              ) : minPrice || maxPrice ? (
                <>
                  Price Range Analysis:{' '}
                  <span className="text-amber-300 normal-case font-extrabold">
                    ${minPrice || '0'} – ${maxPrice || '∞'}
                  </span>
                </>
              ) : (
                <>Product Catalog & Sales Analytics</>
              )}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 px-2.5 py-0.5 text-indigo-200 font-medium">
                Category: <strong>{selectedCategory}</strong>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-white ml-1 cursor-pointer"
                  title="Clear category filter"
                >
                  <XCircle className="h-3.5 w-3.5 inline" />
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/30 border border-emerald-400/40 px-2.5 py-0.5 text-emerald-200 font-medium">
                Price: <strong>${minPrice || '0'} – ${maxPrice || '∞'}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice('')
                    setMaxPrice('')
                  }}
                  className="hover:text-white ml-1 cursor-pointer"
                  title="Clear price filter"
                >
                  <XCircle className="h-3.5 w-3.5 inline" />
                </button>
              </span>
            )}
            <span className="text-slate-400">
              Showing <strong className="text-white">{filteredProducts.length}</strong> of{' '}
              {products.filter((p) => p.status !== 'draft').length} products
            </span>
          </div>
        </div>

        {/* 6 Real-time Analytical Metrics */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <p className="text-[11px] font-medium text-slate-400">Matching Products</p>
            <p className="mt-1 text-lg font-bold text-white">{analytics.totalProducts}</p>
            <p className="text-[10px] text-slate-400">In current filter</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <p className="text-[11px] font-medium text-slate-400">In-Stock Units</p>
            <p className="mt-1 text-lg font-bold text-sky-300">{analytics.totalStock.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">Warehouse inventory</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <p className="text-[11px] font-medium text-slate-400">Units Sold</p>
            <p className="mt-1 text-lg font-bold text-emerald-300">{analytics.totalSoldUnits.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">Total volume sold</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <p className="text-[11px] font-medium text-slate-400">Gross Sales (GMV)</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              ${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400">Order revenue</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <p className="text-[11px] font-medium text-slate-400">Marketplace Fees</p>
            <p className="mt-1 text-lg font-bold text-amber-300">
              ${analytics.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400">Platform commission</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
            <p className="text-[11px] font-medium text-slate-400">Avg Product Price</p>
            <p className="mt-1 text-lg font-bold text-purple-300">${analytics.avgPrice.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400">
              Value: ${analytics.totalInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {disputeSuccessToast && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{disputeSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDisputeSuccessToast('')}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
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
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-800 hover:underline cursor-pointer"
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
                    No products found matching the selected filters.
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => {
                const clientId = getSupplierClientId(product)
                const sales = getProductSales(product)

                return (
                  <tr key={product.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 last:border-0">
                    {/* Product Image & Title */}
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.image || product.images?.[0]}
                          alt={product.name}
                          size="md"
                        />
                        <div className="min-w-0 max-w-[220px]">
                          <p className="truncate font-semibold text-slate-900" title={product.name}>
                            {product.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded px-1.5 py-0.2">
                              PID: {product.productId || product.sku}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Product ID & SKU */}
                    <td className="whitespace-nowrap px-5 py-4 font-mono">
                      <div className="flex flex-col">
                        <span className="font-bold text-indigo-700 font-mono text-xs">
                          {product.productId || product.sku}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans">
                          SKU: {product.sku}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {product.category || 'General'}
                      </span>
                    </td>

                    {/* Stock & Units Sold */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{product.quantity ?? 0} in stock</span>
                        <span className="text-[11px] font-medium text-emerald-700 mt-0.5">
                          Sold: <strong>{sales.unitsSold}</strong> units
                        </span>
                      </div>
                    </td>

                    {/* Price, Platform Fee & Gross Sales */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-bold text-slate-800">${Number(product.price || 0).toFixed(2)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5" title="Sellvro Marketplace Platform Fee">
                          Fee: {product.commission || 0}%
                        </span>
                        {sales.revenue > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600" title="Gross Sales Revenue">
                            ${sales.revenue.toFixed(0)} sales
                          </span>
                        )}
                      </div>
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

                    {/* Status & WMS Verified Badge */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                          {PRODUCT_STATUS_LABEL[product.status] || product.status}
                        </Badge>
                        {isProductWmsVerified(product) ? (
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
                    </td>

                    {/* Landing Priority Column */}
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        {product.rankingPriority === 'high' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 border border-emerald-300 shadow-2xs">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            High (Top)
                          </span>
                        ) : product.rankingPriority === 'medium' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200">
                            Medium
                          </span>
                        ) : product.rankingPriority === 'low' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            Standard
                          </span>
                        )}
                        {product.globalMonthlySales > 0 ? (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {Number(product.globalMonthlySales).toLocaleString()} sales/mo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setResearchProduct(product)
                              setIsResearchOpen(true)
                            }}
                            className="text-[10px] font-semibold text-indigo-600 hover:underline"
                          >
                            + Research
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Action with Approve (if pending), Edit, Barcode, Details, Disputes, Research */}
                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        {/* Quick Approve Button for Pending Products */}
                        {product.status === 'pending_approval' && (
                          <button
                            type="button"
                            disabled={approvingId === product.id}
                            onClick={() => handleApproveProduct(product)}
                            title="Approve & make live on marketplace"
                            aria-label="Approve product"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 shadow-xs transition-all hover:bg-emerald-600 hover:text-white active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{approvingId === product.id ? 'Approving…' : 'Approve'}</span>
                          </button>
                        )}

                        {/* 1. Research & Ranking */}
                        <button
                          type="button"
                          onClick={() => {
                            setResearchProduct(product)
                            setIsResearchOpen(true)
                          }}
                          title="Product Research & Landing Page Priority"
                          aria-label="Product Research & Priority"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 shadow-xs transition-all hover:border-purple-400 hover:bg-purple-100 hover:text-purple-800 active:scale-95 cursor-pointer"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>

                        {/* 2. Edit */}
                        <Link
                          to={`/admin/product/edits/${product.id}`}
                          title="Edit product"
                          aria-label="Edit product"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 shadow-xs transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
                        >
                          <SquarePen className="h-4 w-4" />
                        </Link>

                        {/* 3. Barcode */}
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

                        {/* 4. Details */}
                        <Link
                          to={`/admin/product/details/${product.id}`}
                          title="View product details"
                          aria-label="View product details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-600 shadow-xs transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 active:scale-95"
                        >
                          <Info className="h-4 w-4" />
                        </Link>

                        {/* 5. Disputes */}
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeProduct(product)
                            setIsDisputeOpen(true)
                          }}
                          title="Create Dispute / Complaint"
                          aria-label="Create Dispute / Complaint"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-amber-500 shadow-xs transition-all hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 active:scale-95 cursor-pointer"
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
            const sales = getProductSales(product)

            return (
              <MobileCard
                key={product.id}
                title={product.name}
                subtitle={`PID: ${product.productId || product.sku} • SKU: ${product.sku}`}
                badge={
                  <Badge tone={PRODUCT_STATUS_TONE[product.status] || 'neutral'}>
                    {PRODUCT_STATUS_LABEL[product.status] || product.status}
                  </Badge>
                }
                actions={
                  <div className="flex items-center gap-2">
                    {product.status === 'pending_approval' && (
                      <button
                        type="button"
                        disabled={approvingId === product.id}
                        onClick={() => handleApproveProduct(product)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                        title="Approve & make live"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{approvingId === product.id ? '…' : 'Approve'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setResearchProduct(product)
                        setIsResearchOpen(true)
                      }}
                      title="Research & Ranking"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 shadow-xs"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
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
                <DetailRow label="Category" value={product.category || 'General'} />
                <DetailRow label="Price" value={`$${Number(product.price || 0).toFixed(2)}`} />
                <DetailRow label="Stock" value={`${product.quantity ?? 0} (Sold: ${sales.unitsSold})`} />
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

      {/* Product Research & Evaluation Modal */}
      <ProductResearchModal
        isOpen={isResearchOpen}
        onClose={() => {
          setIsResearchOpen(false)
          setResearchProduct(null)
        }}
        product={researchProduct}
        onSuccess={(updated) => {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === updated.id || p._id === updated.id ? { ...p, ...updated } : p,
            ),
          )
        }}
      />
    </AdminLayout>
  )
}

export default ProductsListPage
