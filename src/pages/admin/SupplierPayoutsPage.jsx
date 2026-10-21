import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Lock,
  Printer,
  Receipt,
  Search,
  Share2,
  ShieldCheck,
  Tag,
  User,
  Wallet,
  X,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function SupplierPayoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSupplierId = searchParams.get('supplierId') || ''

  // Navigation views: 'directory' | 'monthly' | 'orders'
  const [viewMode, setViewMode] = useState(initialSupplierId ? 'monthly' : 'directory')

  // Data states
  const [suppliers, setSuppliers] = useState([])
  const [summary, setSummary] = useState({
    totalSuppliers: 0,
    totalMaturePayable: 0,
    totalImmatureHolding: 0,
    totalPaidOut: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Selected supplier & monthly history
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId)
  const [monthlyData, setMonthlyData] = useState(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Selected month drill-down
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const [monthOrdersData, setMonthOrdersData] = useState(null)
  const [loadingMonthOrders, setLoadingMonthOrders] = useState(false)

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'mature', 'settled'

  // Payout Modal
  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [payoutTargetMonth, setPayoutTargetMonth] = useState('')
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    tid: '',
    paymentMethod: 'Bank Transfer (IBFT)',
    receiptUrl: '',
    notes: '',
  })
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  // Order Details Drawer
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false)

  // 1. Load All Suppliers Directory
  const loadDirectory = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.supplierFinances()
      setSuppliers(data.data || [])
      setSummary(
        data.summary || {
          totalSuppliers: 0,
          totalMaturePayable: 0,
          totalImmatureHolding: 0,
          totalPaidOut: 0,
        },
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supplier finance directory.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDirectory()
  }, [])

  // 2. Load Specific Supplier Monthly History
  const loadSupplierHistory = async (supplierId) => {
    setSelectedSupplierId(supplierId)
    setLoadingMonthly(true)
    setError('')
    try {
      const data = await adminApi.supplierMonthlyHistory(supplierId)
      setMonthlyData(data)
      setViewMode('monthly')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supplier monthly history.'))
    } finally {
      setLoadingMonthly(false)
    }
  }

  // Auto load if query param exists
  useEffect(() => {
    if (initialSupplierId) {
      loadSupplierHistory(initialSupplierId)
    }
  }, [initialSupplierId])

  // 3. Load Month Orders Drill-Down
  const loadMonthOrders = async (supplierId, monthKey) => {
    setSelectedMonthKey(monthKey)
    setLoadingMonthOrders(true)
    setError('')
    try {
      const data = await adminApi.supplierMonthOrders(supplierId, monthKey)
      setMonthOrdersData(data)
      setViewMode('orders')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load month orders.'))
    } finally {
      setLoadingMonthOrders(false)
    }
  }

  // Payout Modal Helpers
  const openPayoutModal = (monthObj) => {
    setPayoutTargetMonth(monthObj.monthKey)
    const suggestedAmount =
      monthObj.matureAmount > 0
        ? monthObj.matureAmount
        : Math.max(0, Number((monthObj.netEarnings - monthObj.paidAmount).toFixed(2)))

    setPayoutForm({
      amount: suggestedAmount > 0 ? suggestedAmount : '',
      tid: '',
      paymentMethod: 'Bank Transfer (IBFT)',
      receiptUrl: '',
      notes: `Payout for ${monthObj.monthLabel}`,
    })
    setPayoutModalOpen(true)
  }

  const handleCopyText = (text, label) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopyFeedback(`${label} copied!`)
    setTimeout(() => setCopyFeedback(''), 2500)
  }

  const handleShareReceipt = () => {
    const s = monthlyData?.supplier || monthOrdersData?.supplier
    const b = monthlyData?.bankDetails || monthOrdersData?.bankDetails
    const text = `--- SELLVRO SUPPLIER PAYOUT RECEIPT ---
Supplier ID: ${s?.supplierDisplayId || 'SUPPLIER'} (${s?.fullName || ''})
Month: ${payoutTargetMonth}
Amount Paid: $${Number(payoutForm.amount || 0).toFixed(2)}
Payment Method: ${payoutForm.paymentMethod}
Transaction ID (TID): ${payoutForm.tid || 'PENDING'}
Bank Account: ${b?.provider || 'Bank'} - Acc: ${b?.accNumber || 'N/A'} (${b?.cardDate || s?.fullName})
Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
Status: COMPLETED & VERIFIED
---------------------------------------`
    handleCopyText(text, 'Full Payout Receipt')
  }

  const handleExecutePayout = async (e) => {
    e.preventDefault()
    if (!selectedSupplierId) return
    if (!payoutForm.tid.trim()) {
      setError('Bank Transaction ID (TID) is strictly required to process payout.')
      return
    }
    const amt = Number(payoutForm.amount)
    if (!amt || amt <= 0) {
      setError('Please specify a valid payout amount greater than zero.')
      return
    }

    setSubmittingPayout(true)
    setError('')
    try {
      await adminApi.executeSupplierPayout(selectedSupplierId, {
        monthKey: payoutTargetMonth,
        amount: amt,
        tid: payoutForm.tid.trim(),
        paymentMethod: payoutForm.paymentMethod,
        receiptUrl: payoutForm.receiptUrl.trim(),
        notes: payoutForm.notes.trim(),
      })
      setSuccessMsg(`Payout of $${amt.toFixed(2)} processed successfully (TID: ${payoutForm.tid.trim()})!`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setPayoutModalOpen(false)

      // Refresh data
      loadDirectory()
      if (selectedSupplierId) {
        loadSupplierHistory(selectedSupplierId)
      }
      if (viewMode === 'orders' && selectedMonthKey) {
        loadMonthOrders(selectedSupplierId, selectedMonthKey)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to process supplier payout.'))
    } finally {
      setSubmittingPayout(false)
    }
  }

  // Filtered Suppliers for Directory View
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (filterType === 'mature' && !s.hasMaturePayout) return false
      if (filterType === 'settled' && (s.matureAmount > 0 || s.immatureAmount > 0)) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (s.supplierDisplayId && s.supplierDisplayId.toLowerCase().includes(q)) ||
          (s.fullName && s.fullName.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.businessName && s.businessName.toLowerCase().includes(q)) ||
          (s.bankDetails?.provider && s.bankDetails.provider.toLowerCase().includes(q)) ||
          (s.bankDetails?.accNumber && s.bankDetails.accNumber.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [suppliers, filterType, searchQuery])

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Finance Operations"
        title="Supplier Finances & Payouts"
        action={
          viewMode !== 'directory' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'orders') {
                  setViewMode('monthly')
                } else {
                  setViewMode('directory')
                  setSearchParams({})
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              {viewMode === 'orders' ? 'Back to Monthly History' : 'Back to Suppliers Directory'}
            </Button>
          ) : null
        }
      />

      {/* Global Alerts */}
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {successMsg}
        </p>
      )}
      {copyFeedback && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl animate-bounce">
          {copyFeedback}
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW 1: SUPPLIERS FINANCIAL DIRECTORY                      */}
      {/* ========================================================== */}
      {viewMode === 'directory' && (
        <div className="space-y-5">
          {/* Top Metric Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Suppliers</p>
                  <p className="text-xl font-bold text-slate-900">{summary.totalSuppliers}</p>
                </div>
              </div>
            </Card>

            <Card className="border border-emerald-200 bg-emerald-50/20 p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-emerald-800">Mature Payable</p>
                    <span className="rounded bg-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900">
                      30+ Days
                    </span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">${summary.totalMaturePayable.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="border border-amber-200 bg-amber-50/20 p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-amber-800">Immature Holding</p>
                    <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                      &lt; 30 Days
                    </span>
                  </div>
                  <p className="text-xl font-bold text-amber-700">${summary.totalImmatureHolding.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Disbursed (Paid)</p>
                  <p className="text-xl font-bold text-slate-900">${summary.totalPaidOut.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Supplier ID, Name, Business, Bank…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="all">All Payout Statuses</option>
                <option value="mature">🟢 Has Mature Payout Ready</option>
                <option value="settled">⚪ All Payouts Settled</option>
              </select>
            </div>

            <span className="text-xs font-medium text-slate-500">
              Showing <strong className="text-slate-800">{filteredSuppliers.length}</strong> suppliers
            </span>
          </Card>

          {/* Suppliers Financial Overview Table */}
          <Card className="overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3.5">Supplier ID</th>
                    <th className="px-4 py-3.5">Supplier & Business</th>
                    <th className="px-4 py-3.5">Bank Account Details</th>
                    <th className="px-4 py-3.5">Orders Summary</th>
                    <th className="px-4 py-3.5">Gross / Commission</th>
                    <th className="px-4 py-3.5">Mature Balance (≥30d)</th>
                    <th className="px-4 py-3.5">Immature (&lt;30d)</th>
                    <th className="px-4 py-3.5">Total Paid</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading supplier finances…
                      </td>
                    </tr>
                  )}
                  {!loading && filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        No suppliers found.
                      </td>
                    </tr>
                  )}
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Clickable Supplier ID */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => loadSupplierHistory(s.id)}
                          className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded transition-colors"
                          title="Click to view full monthly history & payouts"
                        >
                          {s.supplierDisplayId}
                        </button>
                      </td>

                      {/* Name & Business */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{s.fullName}</p>
                        <p className="text-xs text-slate-500">{s.businessName || s.email}</p>
                      </td>

                      {/* Bank Details */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <p className="font-medium text-slate-800">{s.bankDetails.provider}</p>
                        <p className="font-mono text-slate-500">{s.bankDetails.accNumber}</p>
                      </td>

                      {/* Orders */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{s.totalOrders} total</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700">{s.deliveredCount} del</span> ·{' '}
                          <span className="text-amber-700">{s.pendingCount} pend</span> ·{' '}
                          <span className="text-rose-600">{s.cancelledCount} ret</span>
                        </div>
                      </td>

                      {/* Gross & Commission */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <p className="font-semibold text-slate-800">${s.grossSales.toFixed(2)}</p>
                        <p className="text-[11px] text-slate-500">Comm: ${s.commissionTotal.toFixed(2)}</p>
                      </td>

                      {/* Mature Balance (>= 30 days) */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {s.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                            ${s.matureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Immature Holding (< 30 days) */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {s.immatureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 border border-amber-200">
                            ${s.immatureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Paid Out */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                        ${s.paidTotal.toFixed(2)}
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSupplierHistory(s.id)}
                          className="h-8 gap-1 text-xs"
                        >
                          Monthly History
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW 2: SUPPLIER MONTHLY FINANCIAL HISTORY                 */}
      {/* ========================================================== */}
      {viewMode === 'monthly' && (
        <div className="space-y-5">
          {/* Supplier Header & Registered Bank Details Card */}
          <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/50 p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-600 px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                    {monthlyData?.supplier?.supplierDisplayId || 'SUPPLIER'}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{monthlyData?.supplier?.fullName}</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {monthlyData?.supplier?.businessName} · {monthlyData?.supplier?.email}
                </p>
              </div>

              {/* Registered Bank Details with Copy Button */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Registration Bank Account
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const b = monthlyData?.bankDetails
                      const text = `${b?.provider || 'Bank'} | Acc: ${b?.accNumber || 'N/A'} | Title: ${b?.cardDate || monthlyData?.supplier?.fullName}`
                      handleCopyText(text, 'Bank Account Details')
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <div className="text-xs text-slate-700 space-y-0.5">
                  <p>
                    <span className="text-slate-400">Bank / Provider:</span>{' '}
                    <strong className="text-slate-900">{monthlyData?.bankDetails?.provider || 'Not Set'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Account / IBAN:</span>{' '}
                    <strong className="font-mono text-indigo-700">{monthlyData?.bankDetails?.accNumber || 'Not Set'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Title / Details:</span>{' '}
                    <span>{monthlyData?.bankDetails?.cardDate || monthlyData?.supplier?.fullName}</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card className="overflow-hidden shadow-soft">
            <div className="border-b border-slate-100 p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Monthly Payout History & Maturity Tracking</h3>
              <p className="text-xs text-slate-500">
                Payment maturity is strictly 1 month (30 days) from order creation. Click any month row to inspect orders.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <th className="px-4 py-3.5">Month</th>
                    <th className="px-4 py-3.5">Orders Breakdown</th>
                    <th className="px-4 py-3.5">Gross Revenue</th>
                    <th className="px-4 py-3.5">Platform Commission</th>
                    <th className="px-4 py-3.5">Net Supplier Share</th>
                    <th className="px-4 py-3.5">Mature Balance (≥30d)</th>
                    <th className="px-4 py-3.5">Immature (&lt;30d)</th>
                    <th className="px-4 py-3.5">Payout Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingMonthly && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading monthly breakdown…
                      </td>
                    </tr>
                  )}
                  {!loadingMonthly && (!monthlyData?.months || monthlyData.months.length === 0) && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        No order history for this supplier yet.
                      </td>
                    </tr>
                  )}
                  {monthlyData?.months?.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-slate-50/60 transition-colors">
                      {/* Month Label */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => loadMonthOrders(selectedSupplierId, m.monthKey)}
                          className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5 text-left"
                        >
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          {m.monthLabel}
                        </button>
                      </td>

                      {/* Orders Count Breakdown */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{m.totalOrders} total</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700">{m.deliveredCount} del</span> ·{' '}
                          <span className="text-amber-700">{m.pendingCount} pend</span> ·{' '}
                          <span className="text-rose-600">{m.cancelledCount} ret</span>
                        </div>
                      </td>

                      {/* Gross */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        ${m.grossSales.toFixed(2)}
                      </td>

                      {/* Commission */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-rose-600">
                        -${m.commission.toFixed(2)}
                      </td>

                      {/* Net Share */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        ${m.netEarnings.toFixed(2)}
                      </td>

                      {/* Mature Balance (>= 30 days) */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {m.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                            ${m.matureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Immature (< 30 days) */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {m.immatureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 border border-amber-200">
                            ${m.immatureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {m.payoutStatus === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            <Check className="h-3 w-3" /> Paid (${m.paidAmount.toFixed(2)})
                          </span>
                        ) : m.payoutStatus.includes('Mature') ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Mature (Ready to Pay)
                          </span>
                        ) : m.payoutStatus.includes('Immature') ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            Holding (&lt; 30d)
                          </span>
                        ) : (
                          <Badge tone="neutral">{m.payoutStatus}</Badge>
                        )}
                        {m.payouts?.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            TID: {m.payouts[0].tid || m.payouts[0].id}
                          </p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadMonthOrders(selectedSupplierId, m.monthKey)}
                            className="h-8 text-xs"
                          >
                            Inspect Orders
                          </Button>
                          {(m.matureAmount > 0 || (m.netEarnings > m.paidAmount && m.totalOrders > 0)) && (
                            <Button
                              size="sm"
                              onClick={() => openPayoutModal(m)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Pay Now
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW 3: MONTH ORDERS DRILL-DOWN & DETAILED BREAKDOWN       */}
      {/* ========================================================== */}
      {viewMode === 'orders' && (
        <div className="space-y-5">
          {/* Month Banner */}
          <Card className="border border-indigo-100 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {monthOrdersData?.supplier?.supplierDisplayId} · Detailed Orders
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {monthOrdersData?.monthLabel || selectedMonthKey} Orders Breakdown
                </h2>
                <p className="text-xs text-slate-500">
                  Showing all orders placed in this month with commission deductions and 30-day maturity status.
                </p>
              </div>

              {/* Month Financial Pill */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Sales</span>
                  <span className="font-bold text-slate-800">${monthOrdersData?.summary?.grossTotal?.toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs">
                  <span className="text-rose-500 block text-[10px] uppercase font-bold">Commission</span>
                  <span className="font-bold text-rose-700">-${monthOrdersData?.summary?.commissionTotal?.toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Mature Payable (30+d)</span>
                  <span className="font-mono text-sm font-black text-emerald-800">
                    ${monthOrdersData?.summary?.matureTotal?.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    const mObj = {
                      monthKey: selectedMonthKey,
                      monthLabel: monthOrdersData?.monthLabel || selectedMonthKey,
                      matureAmount: monthOrdersData?.summary?.matureTotal || 0,
                      netEarnings: monthOrdersData?.summary?.netTotal || 0,
                      paidAmount: 0,
                    }
                    openPayoutModal(mObj)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <DollarSign className="h-4 w-4" /> Pay Month Payout
                </Button>
              </div>
            </div>
          </Card>

          {/* Orders Table */}
          <Card className="overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3.5">Order # & Label</th>
                    <th className="px-4 py-3.5">Product & SKU</th>
                    <th className="px-4 py-3.5">Price & Qty</th>
                    <th className="px-4 py-3.5">Total Amount</th>
                    <th className="px-4 py-3.5">Commission Deduction</th>
                    <th className="px-4 py-3.5">Supplier Net</th>
                    <th className="px-4 py-3.5">Order Age & Maturity</th>
                    <th className="px-4 py-3.5">Payout Status</th>
                    <th className="px-4 py-3.5 text-right">Label / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingMonthOrders && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading month orders…
                      </td>
                    </tr>
                  )}
                  {!loadingMonthOrders && (!monthOrdersData?.orders || monthOrdersData.orders.length === 0) && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        No orders found in this month.
                      </td>
                    </tr>
                  )}
                  {monthOrdersData?.orders?.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Order # */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{order.orderNo}</p>
                        {order.orderLabelRef ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 block mt-0.5">
                            Ref: {order.orderLabelRef}
                          </span>
                        ) : null}
                      </td>

                      {/* Product & SKU */}
                      <td className="max-w-[200px] px-4 py-3.5">
                        <p className="truncate font-medium text-slate-800" title={order.product}>
                          {order.product}
                        </p>
                        {order.productSku ? (
                          <span className="font-mono text-[11px] font-semibold text-indigo-700">
                            SKU: {order.productSku}
                          </span>
                        ) : null}
                      </td>

                      {/* Unit Price & Qty */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        ${Number(order.unitPrice || 0).toFixed(2)} × {order.quantity || 1}
                      </td>

                      {/* Total */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        ${Number(order.total || 0).toFixed(2)}
                      </td>

                      {/* Commission */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-mono text-rose-600 font-semibold">
                          -${Number(order.commission || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({order.commissionPercent || 0}%)
                        </span>
                      </td>

                      {/* Supplier Net */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        ${Number(order.netAmount || (order.total - order.commission) || 0).toFixed(2)}
                      </td>

                      {/* Age & Maturity Rule (1 Month / 30 Days) */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {order.isMature ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Mature ({order.ageDays}d)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3" /> Immature ({order.ageDays}d)
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {order.daysToMaturity}d until mature
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Payout Status */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {order.payoutStatus === 'processed' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            Paid {order.payoutTid ? `(${order.payoutTid})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Unpaid / Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <IconAction
                          icon={Eye}
                          tone="success"
                          aria-label="View order details and shipping label"
                          title="View order details & shipping label"
                          onClick={() => {
                            setSelectedOrderId(order.id)
                            setOrderDrawerOpen(true)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: PROCESS SUPPLIER PAYOUT ("PAID BUTTON" WITH TID)    */}
      {/* ========================================================== */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <Card className="relative w-full max-w-lg overflow-hidden border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Bank Settlement & Disbursement
                </span>
                <h3 className="text-lg font-bold text-slate-900">Process Supplier Payout</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Supplier Registered Bank Details Box */}
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                  Supplier Registered Bank Account
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const b = monthlyData?.bankDetails || monthOrdersData?.bankDetails
                    const s = monthlyData?.supplier || monthOrdersData?.supplier
                    const text = `Bank: ${b?.provider || 'Bank'} | Acc: ${b?.accNumber || 'N/A'} | Title: ${b?.cardDate || s?.fullName}`
                    handleCopyText(text, 'Bank Account Details')
                  }}
                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700 shadow-2xs border border-indigo-200 hover:bg-indigo-50"
                >
                  <Copy className="h-3 w-3" /> Copy Bank Details
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Bank / Provider:</span>
                  <strong className="text-slate-900">
                    {(monthlyData?.bankDetails || monthOrdersData?.bankDetails)?.provider || 'Not Set'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Account # / IBAN:</span>
                  <strong className="font-mono text-indigo-700">
                    {(monthlyData?.bankDetails || monthOrdersData?.bankDetails)?.accNumber || 'Not Set'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Account Title:</span>
                  <span>
                    {(monthlyData?.bankDetails || monthOrdersData?.bankDetails)?.cardDate ||
                      (monthlyData?.supplier || monthOrdersData?.supplier)?.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Month:</span>
                  <span className="font-bold text-slate-800">{payoutTargetMonth}</span>
                </div>
              </div>
            </div>

            {/* Payout Form */}
            <form onSubmit={handleExecutePayout} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payout Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, amount: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-800 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payoutForm.paymentMethod}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="Bank Transfer (IBFT)">Bank Transfer (IBFT)</option>
                    <option value="Wire / SWIFT">Wire / SWIFT</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Binance USDT">Binance USDT</option>
                    <option value="Payoneer">Payoneer</option>
                  </select>
                </div>
              </div>

              {/* Mandatory TID Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Bank Transaction ID (TID) *
                  </label>
                  <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 uppercase">
                    Mandatory
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={payoutForm.tid}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, tid: e.target.value }))}
                  placeholder="e.g. TID-982148102 or Bank Reference #"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Transaction proof ID given by your online banking / IBFT receipt.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proof Receipt Image / URL (Optional)
                </label>
                <input
                  type="text"
                  value={payoutForm.receiptUrl}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, receiptUrl: e.target.value }))}
                  placeholder="https://… or receipt document link"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Notes / Remarks
                </label>
                <input
                  type="text"
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. October 2026 sales cleared"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {/* Action Buttons: Pay Now & Share */}
              <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareReceipt}
                  className="gap-1.5 text-xs text-slate-700"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share Receipt
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayoutModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingPayout || !payoutForm.tid.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submittingPayout ? 'Processing…' : 'Pay Now & Mark Paid'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        orderId={selectedOrderId}
        open={orderDrawerOpen}
        onClose={() => setOrderDrawerOpen(false)}
        title="Order Details & Shipping Label"
      />
    </AdminLayout>
  )
}

export default SupplierPayoutsPage
