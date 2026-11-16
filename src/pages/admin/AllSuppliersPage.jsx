import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  LogIn,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wallet,
  Warehouse,
  Store,
  Users,
  Search,
  Filter,
  AlertTriangle,
  Star,
  Truck,
  ShieldAlert,
  Eye,
  ChevronDown,
  MessageSquare,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import AddAccountModal from '../../components/admin/AddAccountModal.jsx'
import EditAccountModal from '../../components/admin/EditAccountModal.jsx'
import DeleteAccountModal from '../../components/admin/DeleteAccountModal.jsx'
import WarnSupplierModal from '../../components/admin/WarnSupplierModal.jsx'
import SuspendSupplierModal from '../../components/admin/SuspendSupplierModal.jsx'
import SupplierPerformanceModal from '../../components/admin/SupplierPerformanceModal.jsx'
import SendMessageModal from '../../components/admin/SendMessageModal.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'
import { formatSupplierId } from '../../lib/idFormatters.js'

const TABLE_HEAD = [
  'Supplier',
  'Origin / Channel',
  'Performance & Rating',
  'Orders & Revenue',
  'Location',
  'Warnings & Status',
  'Actions',
]

const isWmsSupplier = (s) => Boolean(s.isWmsRegistered || s.wmsClientId || s.wmsToken || s.supplierType === 'wms')

function AllSuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Filters & Search
  const [categoryTab, setCategoryTab] = useState('all') // 'all' | 'wms' | 'marketplace'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'approved' | 'pending' | 'suspended'
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [warnModalSupplier, setWarnModalSupplier] = useState(null)
  const [suspendModalSupplier, setSuspendModalSupplier] = useState(null)
  const [performanceModalSupplier, setPerformanceModalSupplier] = useState(null)
  const [sendMessageSupplier, setSendMessageSupplier] = useState(null)
  const [actionDropdownOpenId, setActionDropdownOpenId] = useState(null)
  const [statusSuccessMessage, setStatusSuccessMessage] = useState('')

  // Close actions dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('[data-actions-dropdown]')) {
        setActionDropdownOpenId(null)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.accounts({ role: 'supplier' })
      setSuppliers(res.data || [])
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const handleImpersonate = async (supplier) => {
    const confirmed = window.confirm(
      `Login as "${supplier.fullName}" (Supplier)?\n\nYou will be redirected to the supplier dashboard in Admin Impersonation Mode.`,
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await adminApi.impersonate(supplier.id)
      window.location.href = res.redirectUrl || '/supplier/dashboard'
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to login as supplier.'))
      setActionLoading(false)
    }
  }

  const handleReinstate = async (supplier) => {
    try {
      await adminApi.reinstateSupplier(supplier.id)
      setStatusSuccessMessage(`Supplier "${supplier.fullName}" has been reinstated successfully.`)
      loadSuppliers()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to reinstate supplier.'))
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = suppliers.length
    const wms = suppliers.filter(isWmsSupplier).length
    const marketplace = total - wms
    const active = suppliers.filter((s) => s.status === 'approved').length
    const withWarnings = suppliers.filter((s) => (s.warningsCount || 0) > 0).length
    const suspended = suppliers.filter((s) => s.status === 'suspended').length
    const lowRating = suppliers.filter((s) => s.ratings?.isLowPerformance).length
    return { total, wms, marketplace, active, withWarnings, suspended, lowRating }
  }, [suppliers])

  // Filtered Suppliers based on category tab, status, and search term
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const isWms = isWmsSupplier(supplier)

      // Category tab filter
      if (categoryTab === 'wms' && !isWms) return false
      if (categoryTab === 'marketplace' && isWms) return false
      if (categoryTab === 'warnings' && (supplier.warningsCount || 0) === 0) return false
      if (categoryTab === 'low_rating' && !supplier.ratings?.isLowPerformance) return false

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (!supplier.status?.includes('pending')) return false
        } else if (supplier.status !== statusFilter) {
          return false
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const nameMatch = supplier.fullName?.toLowerCase().includes(q)
        const emailMatch = supplier.email?.toLowerCase().includes(q)
        const locationMatch = supplier.businessProfile?.location?.toLowerCase().includes(q)
        const wmsIdMatch = supplier.wmsClientId?.toLowerCase().includes(q)
        const idMatch = supplier.displayId?.toLowerCase().includes(q) || supplier.id?.toLowerCase().includes(q)
        if (!nameMatch && !emailMatch && !locationMatch && !wmsIdMatch && !idMatch) {
          return false
        }
      }

      return true
    })
  }, [suppliers, categoryTab, statusFilter, searchTerm])

  const isEmpty = !loading && filteredSuppliers.length === 0

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <PageHeader
          title="All Suppliers"
          subtitle="Manage vendor accounts, categorize WMS vs Marketplace suppliers, and login directly."
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSuppliers}
            disabled={loading}
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {statusSuccessMessage && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{statusSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Categorization Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        {/* Card 1: All Suppliers */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryTab('all')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-soft hover:shadow-md ${
            categoryTab === 'all'
              ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
              : 'border-slate-100 bg-white hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">All Suppliers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-slate-400">Total</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">All registered vendors</p>
        </div>

        {/* Card 2: WMS Warehouse (3PL) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryTab('wms')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-soft hover:shadow-md ${
            categoryTab === 'wms'
              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
              : 'border-emerald-100 bg-emerald-50/20 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">WMS 3PL</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Warehouse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-emerald-950">{stats.wms}</span>
            <span className="text-[11px] font-semibold text-emerald-700">Connected</span>
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700/80">Central warehouse sync</p>
        </div>

        {/* Card 3: Marketplace Only */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryTab('marketplace')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-soft hover:shadow-md ${
            categoryTab === 'marketplace'
              ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20'
              : 'border-slate-100 bg-white hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Marketplace</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">{stats.marketplace}</span>
            <span className="text-[11px] text-slate-400">Direct</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Self-fulfillment vendors</p>
        </div>

        {/* Card 4: Active Approved */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">{stats.active}</span>
            <span className="text-[11px] text-slate-400">Active</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Operational accounts</p>
        </div>

        {/* Card 5: Performance Warnings & Suspension */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategoryTab(categoryTab === 'warnings' ? 'all' : 'warnings')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-soft hover:shadow-md ${
            categoryTab === 'warnings'
              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
              : stats.withWarnings > 0
              ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
              : 'border-slate-100 bg-white hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Warnings &amp; Alerts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-amber-950">{stats.withWarnings}</span>
            <span className="text-[11px] font-bold text-rose-600">
              {stats.suspended > 0 ? `(${stats.suspended} Suspended)` : 'Warned'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700/80">Low ratings &amp; warnings</p>
        </div>
      </div>

      {/* Segmented Category Buttons & Search / Filter Controls */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Quick Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            type="button"
            onClick={() => setCategoryTab('all')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              categoryTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>All Suppliers</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                categoryTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryTab('wms')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              categoryTab === 'wms'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Warehouse className="h-3.5 w-3.5" />
            <span>🏢 WMS Warehouse Suppliers (3PL)</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                categoryTab === 'wms' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {stats.wms}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryTab('marketplace')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              categoryTab === 'marketplace'
                ? 'bg-sky-700 text-white shadow-sm ring-2 ring-sky-700/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-sky-600" />
            <span>🛍️ Marketplace Only Suppliers</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                categoryTab === 'marketplace' ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {stats.marketplace}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryTab(categoryTab === 'warnings' ? 'all' : 'warnings')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              categoryTab === 'warnings'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>⚠️ Warned Suppliers</span>
            {stats.withWarnings > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-extrabold">
                {stats.withWarnings}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar + Status Filter */}
        <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 shadow-soft">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, location, or WMS Client ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-primary focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            {(searchTerm || statusFilter !== 'all' || categoryTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setCategoryTab('all')
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline px-2 py-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">
          {categoryTab === 'wms'
            ? '🏢 WMS Warehouse Suppliers (3PL)'
            : categoryTab === 'marketplace'
            ? '🛍️ Marketplace Only Suppliers'
            : categoryTab === 'warnings'
            ? '⚠️ Suppliers with Warnings'
            : 'All Registered Suppliers'}
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'supplier' : 'suppliers'})
          </span>
        </h2>
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left text-sm">
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
              {loading ? (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading suppliers…
                  </td>
                </tr>
              ) : isEmpty ? (
                <EmptyState
                  message={
                    categoryTab === 'wms'
                      ? 'No WMS warehouse suppliers found.'
                      : categoryTab === 'marketplace'
                      ? 'No marketplace-only suppliers found.'
                      : categoryTab === 'warnings'
                      ? 'No suppliers with warnings found.'
                      : 'No suppliers found.'
                  }
                  colSpan={TABLE_HEAD.length}
                />
              ) : (
                filteredSuppliers.map((supplier) => {
                  const isWms = isWmsSupplier(supplier)
                  const ratings = supplier.ratings || {}

                  return (
                    <tr
                      key={supplier.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* 1. Supplier Column */}
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{supplier.fullName}</p>
                            {isWms ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200"
                                title="Connected with Sellvro WMS 3PL Fulfillment"
                              >
                                <Warehouse className="h-2.5 w-2.5 text-emerald-700" />
                                WMS 3PL
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200"
                                title="Marketplace Direct Vendor"
                              >
                                <Store className="h-2.5 w-2.5 text-slate-500" />
                                Marketplace
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{supplier.email}</p>
                          <Link
                            to={`/admin/supplier/payouts?supplierId=${supplier.id}`}
                            className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100"
                            title="Click supplier ID to view monthly finance history, maturity & payouts"
                          >
                            <Wallet className="h-3 w-3" />
                            <span>ID: {formatSupplierId(supplier)}</span>
                          </Link>
                        </div>
                      </td>

                      {/* 2. Origin / Channel Column */}
                      <td className="whitespace-nowrap px-5 py-4">
                        {isWms ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                              <Warehouse className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>WMS Integrated</span>
                            </span>
                            <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200/60">
                              {supplier.wmsClientId ? `Client: ${supplier.wmsClientId}` : '3PL Central Hub'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                              <Store className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span>Marketplace Only</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">Direct Vendor</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Performance & Rating Column */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {ratings.reviewsCount > 0 ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="flex items-center text-amber-500 font-bold text-xs">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                                  {Number(ratings.averageRating || 0).toFixed(1)}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  / 5 ({ratings.reviewsCount} {ratings.reviewsCount === 1 ? 'review' : 'reviews'})
                                </span>
                              </div>
                              {ratings.onTimeDeliveryPercent !== null && ratings.onTimeDeliveryPercent !== undefined && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                    ratings.onTimeDeliveryPercent >= 80
                                      ? 'text-emerald-700'
                                      : ratings.onTimeDeliveryPercent >= 60
                                      ? 'text-amber-700'
                                      : 'text-rose-700 font-bold'
                                  }`}
                                  title="On-time delivery performance rating"
                                >
                                  <Truck className="h-3 w-3" />
                                  {ratings.onTimeDeliveryPercent}% On-Time
                                </span>
                              )}
                              {ratings.isLowPerformance && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                  <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                                  Low Performance ({ratings.badRatingsCount} Bad)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No ratings yet</span>
                          )}

                          <button
                            type="button"
                            onClick={() => setPerformanceModalSupplier(supplier)}
                            className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/90 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                            title="View Supplier Performance, Ratings, Dispatch SLA & Product Reviews"
                          >
                            <Eye className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>

                      {/* 4. Orders & Revenue */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {supplier.revenueLabel || `$${Number(supplier.revenue || 0).toFixed(2)}`}
                          </p>
                          <p className="text-[11px] text-slate-500">{supplier.ordersCount || 0} orders</p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            Payout: {supplier.businessProfile?.payoutSchedule || 'Weekly'}
                          </p>
                        </div>
                      </td>

                      {/* 5. Location */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {supplier.businessProfile?.location || '—'}
                          </p>
                          <p className="text-[11px] text-slate-400">Joined {supplier.joined}</p>
                        </div>
                      </td>

                      {/* 6. Warnings & Status */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              tone={
                                supplier.status === 'approved'
                                  ? 'success'
                                  : supplier.status === 'suspended'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {supplier.status}
                            </Badge>

                            {(supplier.warningsCount || 0) === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                0/3 Warnings
                              </span>
                            ) : (supplier.warningsCount || 0) === 1 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                1/3 Warnings
                              </span>
                            ) : (supplier.warningsCount || 0) === 2 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-900 border border-orange-300">
                                <AlertTriangle className="h-3 w-3 text-orange-600" />
                                2/3 Warnings
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800 border border-rose-300">
                                <ShieldAlert className="h-3 w-3 text-rose-700" />
                                3/3 Warnings (Suspended)
                              </span>
                            )}
                          </div>

                          {supplier.status === 'suspended' && (
                            <p
                              className="text-[10px] font-medium text-rose-700 max-w-[180px] truncate"
                              title={supplier.suspensionReason || 'Account suspended'}
                            >
                              Reason: {supplier.suspensionReason || 'Performance policy'}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions Dropdown */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="relative inline-block text-left" data-actions-dropdown>
                          <button
                            type="button"
                            onClick={() =>
                              setActionDropdownOpenId(
                                actionDropdownOpenId === supplier.id ? null : supplier.id,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                            aria-haspopup="true"
                            aria-expanded={actionDropdownOpenId === supplier.id}
                          >
                            <span>Actions</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                                actionDropdownOpenId === supplier.id ? 'rotate-180 text-indigo-600' : ''
                              }`}
                            />
                          </button>

                          {actionDropdownOpenId === supplier.id && (
                            <div className="absolute right-0 z-30 mt-1 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-100">
                              {/* 1. Direct Message to Supplier */}
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSendMessageSupplier(supplier)
                                    setActionDropdownOpenId(null)
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50/70 transition cursor-pointer"
                                >
                                  <MessageSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span>Send Message</span>
                                </button>
                              </div>

                              {/* 2. Performance, Reviews & Warnings */}
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPerformanceModalSupplier(supplier)
                                    setActionDropdownOpenId(null)
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span>Performance &amp; Reviews</span>
                                </button>

                                {supplier.status !== 'suspended' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWarnModalSupplier(supplier)
                                      setActionDropdownOpenId(null)
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 transition cursor-pointer"
                                  >
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span>Issue Warning ({supplier.warningsCount || 0}/3)</span>
                                  </button>
                                )}

                                {supplier.status === 'suspended' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleReinstate(supplier)
                                      setActionDropdownOpenId(null)
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>Reinstate Account</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSuspendModalSupplier(supplier)
                                      setActionDropdownOpenId(null)
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                                    <span>Suspend Account</span>
                                  </button>
                                )}
                              </div>

                              {/* 3. Finances & Login Impersonation */}
                              <div className="py-1">
                                <Link
                                  to={`/admin/supplier/payouts?supplierId=${supplier.id}`}
                                  onClick={() => setActionDropdownOpenId(null)}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  <Wallet className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <span>Finances &amp; Payouts</span>
                                </Link>

                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    handleImpersonate(supplier)
                                    setActionDropdownOpenId(null)
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                                >
                                  <LogIn className="h-4 w-4 text-primary shrink-0" />
                                  <span>Login As Supplier</span>
                                </button>
                              </div>

                              {/* 4. Edit & Delete */}
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSupplier(supplier)
                                    setEditModalOpen(true)
                                    setActionDropdownOpenId(null)
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4 text-slate-500 shrink-0" />
                                  <span>Edit Account</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSupplier(supplier)
                                    setDeleteModalOpen(true)
                                    setActionDropdownOpenId(null)
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500 shrink-0" />
                                  <span>Delete Supplier</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="divide-y divide-slate-100 md:hidden">
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading suppliers…</p>}
          {isEmpty && (
            <p className="px-5 py-6 text-sm text-slate-500">
              {categoryTab === 'wms'
                ? 'No WMS warehouse suppliers found.'
                : categoryTab === 'marketplace'
                ? 'No marketplace-only suppliers found.'
                : categoryTab === 'warnings'
                ? 'No suppliers with warnings found.'
                : 'No suppliers found.'}
            </p>
          )}
          {filteredSuppliers.map((supplier) => {
            const isWms = isWmsSupplier(supplier)
            const ratings = supplier.ratings || {}

            return (
              <MobileCard
                key={supplier.id}
                title={
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{supplier.fullName}</span>
                    {isWms ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                        <Warehouse className="h-2.5 w-2.5 text-emerald-700" />
                        WMS 3PL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                        <Store className="h-2.5 w-2.5 text-slate-500" />
                        Marketplace
                      </span>
                    )}
                  </div>
                }
                subtitle={
                  <div>
                    <p>{supplier.email}</p>
                    <Link
                      to={`/admin/supplier/payouts?supplierId=${supplier.id}`}
                      className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-600 hover:underline"
                      title="Supplier Monthly Finance History"
                    >
                      <Wallet className="h-3 w-3" />
                      <span>ID: {formatSupplierId(supplier)}</span>
                    </Link>
                  </div>
                }
                badge={
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Badge tone={supplier.status === 'approved' ? 'success' : supplier.status === 'suspended' ? 'danger' : 'warning'}>
                        {supplier.status}
                      </Badge>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        (supplier.warningsCount || 0) === 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : (supplier.warningsCount || 0) === 1
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : (supplier.warningsCount || 0) === 2
                          ? 'bg-orange-100 text-orange-900 border-orange-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold'
                      }`}>
                        {supplier.warningsCount || 0}/3 Warnings
                      </span>
                    </div>
                    {isWms ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {supplier.wmsClientId || 'WMS Hub'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Marketplace</span>
                    )}
                  </div>
                }
                actions={
                  <div className="flex items-center gap-2 flex-wrap" data-actions-dropdown>
                    <button
                      type="button"
                      onClick={() => setSendMessageSupplier(supplier)}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Message</span>
                    </button>

                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() =>
                          setActionDropdownOpenId(
                            actionDropdownOpenId === `mobile-${supplier.id}`
                              ? null
                              : `mobile-${supplier.id}`,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                      >
                        <span>Actions</span>
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                      </button>

                      {actionDropdownOpenId === `mobile-${supplier.id}` && (
                        <div className="absolute right-0 z-30 mt-1 w-52 origin-top-right rounded-2xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 text-left">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPerformanceModalSupplier(supplier)
                                setActionDropdownOpenId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Performance &amp; Reviews</span>
                            </button>

                            {supplier.status !== 'suspended' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setWarnModalSupplier(supplier)
                                  setActionDropdownOpenId(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                <span>Issue Warning ({supplier.warningsCount || 0}/3)</span>
                              </button>
                            )}

                            {supplier.status === 'suspended' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handleReinstate(supplier)
                                  setActionDropdownOpenId(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Reinstate</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSuspendModalSupplier(supplier)
                                  setActionDropdownOpenId(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                              >
                                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                                <span>Suspend</span>
                              </button>
                            )}
                          </div>

                          <div className="py-1">
                            <Link
                              to={`/admin/supplier/payouts?supplierId=${supplier.id}`}
                              onClick={() => setActionDropdownOpenId(null)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Finances</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                handleImpersonate(supplier)
                                setActionDropdownOpenId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <LogIn className="h-3.5 w-3.5 text-primary" />
                              <span>Login As</span>
                            </button>
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(supplier)
                                setEditModalOpen(true)
                                setActionDropdownOpenId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              <span>Edit Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(supplier)
                                setDeleteModalOpen(true)
                                setActionDropdownOpenId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                }
              >
                <DetailRow
                  label="Performance Rating"
                  value={
                    <div className="flex items-center justify-between w-full">
                      {ratings.reviewsCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-600 flex items-center">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-0.5" />
                            {Number(ratings.averageRating || 0).toFixed(1)}/5
                          </span>
                          <span className="text-xs text-slate-500">({ratings.reviewsCount} reviews)</span>
                          {ratings.onTimeDeliveryPercent !== null && (
                            <span className="text-xs font-semibold text-emerald-700">
                              {ratings.onTimeDeliveryPercent}% On-Time
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No ratings yet</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPerformanceModalSupplier(supplier)}
                        className="ml-2 inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" /> Details
                      </button>
                    </div>
                  }
                />
                <DetailRow
                  label="Channel / Origin"
                  value={
                    isWms ? (
                      <span className="font-semibold text-emerald-800">
                        🏢 WMS 3PL {supplier.wmsClientId ? `(${supplier.wmsClientId})` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-600">🛍️ Marketplace Direct</span>
                    )
                  }
                />
                <DetailRow
                  label="Warnings Record"
                  value={
                    <span
                      className={`text-xs font-bold ${
                        (supplier.warningsCount || 0) >= 3
                          ? 'text-rose-700'
                          : (supplier.warningsCount || 0) > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {supplier.warningsCount || 0} / 3 Warnings issued
                    </span>
                  }
                />
                {supplier.status === 'suspended' && (
                  <DetailRow
                    label="Suspension Reason"
                    value={<span className="text-xs text-rose-700 font-medium">{supplier.suspensionReason || '—'}</span>}
                  />
                )}
                <DetailRow label="Location" value={supplier.businessProfile?.location || '—'} />
                <DetailRow label="Joined" value={supplier.joined} />
                <DetailRow label="Orders" value={supplier.ordersCount || 0} />
                <DetailRow
                  label="Finances"
                  value={
                    <Link
                      to={`/admin/supplier/payouts?supplierId=${supplier.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                    >
                      <Wallet className="h-3 w-3" />
                      Monthly History & Payouts
                    </Link>
                  }
                />
              </MobileCard>
            )
          })}
        </div>

        <Pagination
          from={isEmpty ? 0 : 1}
          to={filteredSuppliers.length}
          total={filteredSuppliers.length}
          page={isEmpty ? 0 : 1}
        />
      </Card>

      {/* Account Modals */}
      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadSuppliers}
        initialRole="supplier"
      />

      <EditAccountModal
        isOpen={editModalOpen}
        account={selectedSupplier}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedSupplier(null)
        }}
        onSuccess={loadSuppliers}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        account={selectedSupplier}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedSupplier(null)
        }}
        onSuccess={loadSuppliers}
      />

      {/* Performance Warning Modal */}
      {warnModalSupplier && (
        <WarnSupplierModal
          open={Boolean(warnModalSupplier)}
          isOpen={Boolean(warnModalSupplier)}
          supplier={warnModalSupplier}
          onClose={() => setWarnModalSupplier(null)}
          onSuccess={(res) => {
            setStatusSuccessMessage(
              res?.message ||
                `Warning #${res?.warningsCount || ''} recorded successfully for ${warnModalSupplier?.fullName || 'supplier'}.`,
            )
            loadSuppliers()
          }}
        />
      )}

      {/* Account Suspension Modal */}
      {suspendModalSupplier && (
        <SuspendSupplierModal
          open={Boolean(suspendModalSupplier)}
          isOpen={Boolean(suspendModalSupplier)}
          supplier={suspendModalSupplier}
          onClose={() => setSuspendModalSupplier(null)}
          onSuccess={(res) => {
            setStatusSuccessMessage(
              res?.message ||
                `Supplier "${suspendModalSupplier?.fullName || 'supplier'}" has been suspended and active products deactivated.`,
            )
            loadSuppliers()
          }}
        />
      )}

      {/* Complete Supplier Performance & Rating Details Modal */}
      {performanceModalSupplier && (
        <SupplierPerformanceModal
          open={Boolean(performanceModalSupplier)}
          supplierId={performanceModalSupplier.id}
          onClose={() => setPerformanceModalSupplier(null)}
          onOpenWarnModal={(supplier) => {
            setPerformanceModalSupplier(null)
            setWarnModalSupplier(supplier)
          }}
          onOpenSuspendModal={(supplier) => {
            setPerformanceModalSupplier(null)
            setSuspendModalSupplier(supplier)
          }}
          onSupplierUpdated={() => {
            loadSuppliers()
          }}
        />
      )}

      {/* Send Direct Message / Warning Notice to Supplier */}
      {sendMessageSupplier && (
        <SendMessageModal
          supplier={sendMessageSupplier}
          open={Boolean(sendMessageSupplier)}
          onClose={() => setSendMessageSupplier(null)}
          onSuccess={(res) => {
            setStatusSuccessMessage(
              res?.message ||
                `Message successfully dispatched to ${sendMessageSupplier.fullName}. Dispute thread opened.`,
            )
            loadSuppliers()
          }}
        />
      )}
    </AdminLayout>
  )
}

export default AllSuppliersPage
