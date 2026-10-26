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
  FileText,
  Filter,
  Image,
  Layers,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Tag,
  Upload,
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
  const initialTab = searchParams.get('tab') || 'pending-weeks'

  // Primary top tab: 'pending-weeks' (the dedicated weekly queue) | 'directory' (all suppliers)
  const [activeTab, setActiveTab] = useState(initialSupplierId ? 'directory' : initialTab)

  // Navigation views: 'directory' | 'monthly' | 'weeks' | 'orders'
  const [viewMode, setViewMode] = useState(initialSupplierId ? 'monthly' : 'directory')
  const [ordersPreviousView, setOrdersPreviousView] = useState('pending-weeks')

  // Global Alerts & Feedback
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')

  // -------------------------------------------------------------
  // TAB 1: PENDING WEEKLY PAYOUTS STREAM
  // -------------------------------------------------------------
  const [pendingWeeks, setPendingWeeks] = useState([])
  const [pendingWeeksSummary, setPendingWeeksSummary] = useState({
    totalActionableAmount: 0,
    actionableWeeksCount: 0,
    distinctSuppliersCount: 0,
    totalMatureOrdersCount: 0,
  })
  const [loadingPendingWeeks, setLoadingPendingWeeks] = useState(false)
  const [pendingWeeksSearch, setPendingWeeksSearch] = useState('')
  const [pendingWeeksFilter, setPendingWeeksFilter] = useState('all') // 'all', 'actionable', 'holding'

  const loadPendingWeeks = async () => {
    setLoadingPendingWeeks(true)
    setError('')
    try {
      const res = await adminApi.pendingWeeklyPayouts()
      setPendingWeeks(res.data || [])
      setPendingWeeksSummary(
        res.summary || {
          totalActionableAmount: 0,
          actionableWeeksCount: 0,
          distinctSuppliersCount: 0,
          totalMatureOrdersCount: 0,
        },
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load pending weekly payouts.'))
    } finally {
      setLoadingPendingWeeks(false)
    }
  }

  // -------------------------------------------------------------
  // TAB 2: SUPPLIERS DIRECTORY & ARCHIVE
  // -------------------------------------------------------------
  const [suppliers, setSuppliers] = useState([])
  const [directorySummary, setDirectorySummary] = useState({
    totalSuppliers: 0,
    totalMaturePayable: 0,
    totalImmatureHolding: 0,
    totalPaidOut: 0,
  })
  const [loadingDirectory, setLoadingDirectory] = useState(false)
  const [directorySearch, setDirectorySearch] = useState('')
  const [directoryFilter, setDirectoryFilter] = useState('all') // 'all', 'mature', 'settled'

  // Selected supplier & monthly history
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId)
  const [monthlyData, setMonthlyData] = useState(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Selected month & weeks drill-down
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const [selectedMonthObj, setSelectedMonthObj] = useState(null)
  const [selectedWeekKey, setSelectedWeekKey] = useState('')

  // Selected orders data
  const [monthOrdersData, setMonthOrdersData] = useState(null)
  const [loadingMonthOrders, setLoadingMonthOrders] = useState(false)

  const loadDirectory = async () => {
    setLoadingDirectory(true)
    setError('')
    try {
      const data = await adminApi.supplierFinances()
      setSuppliers(data.data || [])
      setDirectorySummary(
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
      setLoadingDirectory(false)
    }
  }

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

  const openMonthWeeks = (monthObj) => {
    setSelectedMonthKey(monthObj.monthKey)
    setSelectedMonthObj(monthObj)
    setSelectedWeekKey('')
    setViewMode('weeks')
  }

  const loadMonthOrders = async (supplierId, monthKey, weekKey = '', fromView = 'weeks') => {
    setSelectedSupplierId(supplierId)
    setSelectedMonthKey(monthKey)
    setSelectedWeekKey(weekKey)
    setOrdersPreviousView(fromView)
    setLoadingMonthOrders(true)
    setError('')
    try {
      const data = await adminApi.supplierMonthOrders(supplierId, monthKey, weekKey)
      setMonthOrdersData(data)
      setViewMode('orders')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load orders.'))
    } finally {
      setLoadingMonthOrders(false)
    }
  }

  useEffect(() => {
    loadPendingWeeks()
    loadDirectory()
  }, [])

  useEffect(() => {
    if (initialSupplierId) {
      loadSupplierHistory(initialSupplierId)
    }
  }, [initialSupplierId])

  // -------------------------------------------------------------
  // PAYOUT MODAL & FILE UPLOAD HANDLER
  // -------------------------------------------------------------
  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [payoutTargetSupplier, setPayoutTargetSupplier] = useState(null)
  const [payoutTargetMonth, setPayoutTargetMonth] = useState('')
  const [payoutTargetWeek, setPayoutTargetWeek] = useState('')
  const [payoutTargetWeekLabel, setPayoutTargetWeekLabel] = useState('')
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    tid: '',
    paymentMethod: 'Bank Transfer (IBFT)',
    receiptUrl: '',
    notes: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [submittingPayout, setSubmittingPayout] = useState(false)

  // Order Details Drawer
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false)

  const openPayoutModalFromWeek = (item) => {
    setSelectedSupplierId(item.supplierId)
    setPayoutTargetSupplier({
      id: item.supplierId,
      displayId: item.supplierDisplayId,
      name: item.supplierName || item.fullName,
      bank: item.bankDetails,
    })
    setPayoutTargetMonth(item.monthKey)
    setPayoutTargetWeek(item.weekKey)
    setPayoutTargetWeekLabel(`${item.periodLabel || item.weekLabel || item.weekKey} (${item.saturdayLabel || item.saturdayRelease || ''})`)
    setReceiptFile(null)
    setReceiptPreview('')

    const suggestedAmount =
      item.matureAmount > 0
        ? item.matureAmount
        : Math.max(0, Number((item.netEarnings - item.paidAmount).toFixed(2)))

    setPayoutForm({
      amount: suggestedAmount > 0 ? suggestedAmount : '',
      tid: '',
      paymentMethod: 'Bank Transfer (IBFT)',
      receiptUrl: '',
      notes: `Weekly payout for ${item.periodLabel || item.weekLabel || item.weekKey} (${item.supplierDisplayId})`,
    })

    setPayoutModalOpen(true)
  }

  const openPayoutModalFromMonth = (monthObj, weekObj = null) => {
    const s = monthlyData?.supplier
    const b = monthlyData?.bankDetails
    setPayoutTargetSupplier({
      id: selectedSupplierId,
      displayId: s?.supplierDisplayId,
      name: s?.fullName,
      bank: b,
    })
    setPayoutTargetMonth(monthObj?.monthKey || selectedMonthKey)
    setReceiptFile(null)
    setReceiptPreview('')

    if (weekObj) {
      setPayoutTargetWeek(weekObj.weekKey)
      setPayoutTargetWeekLabel(`${weekObj.periodLabel || weekObj.weekLabel} (${weekObj.saturdayLabel || weekObj.saturdayRelease || ''})`)
      const suggestedAmount =
        weekObj.matureAmount > 0
          ? weekObj.matureAmount
          : Math.max(0, Number((weekObj.netEarnings - weekObj.paidAmount).toFixed(2)))

      setPayoutForm({
        amount: suggestedAmount > 0 ? suggestedAmount : '',
        tid: '',
        paymentMethod: 'Bank Transfer (IBFT)',
        receiptUrl: '',
        notes: `Weekly payout for ${monthObj?.monthLabel || selectedMonthKey} ${weekObj.periodLabel || weekObj.weekLabel}`,
      })
    } else {
      setPayoutTargetWeek('')
      setPayoutTargetWeekLabel('Full Month Settlement')
      const suggestedAmount =
        monthObj?.matureAmount > 0
          ? monthObj.matureAmount
          : Math.max(0, Number((monthObj?.netEarnings - monthObj?.paidAmount).toFixed(2)))

      setPayoutForm({
        amount: suggestedAmount > 0 ? suggestedAmount : '',
        tid: '',
        paymentMethod: 'Bank Transfer (IBFT)',
        receiptUrl: '',
        notes: `Payout for ${monthObj?.monthLabel || selectedMonthKey}`,
      })
    }

    setPayoutModalOpen(true)
  }

  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      if (file.type.startsWith('image/')) {
        setReceiptPreview(URL.createObjectURL(file))
      } else {
        setReceiptPreview('')
      }
    }
  }

  const handleCopyText = (text, label) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopyFeedback(`${label} copied!`)
    setTimeout(() => setCopyFeedback(''), 2500)
  }

  const handleShareReceipt = () => {
    const s = payoutTargetSupplier || monthlyData?.supplier
    const b = payoutTargetSupplier?.bank || monthlyData?.bankDetails
    const text = `--- SELLVRO SUPPLIER WEEKLY PAYOUT RECEIPT ---
Supplier ID: ${s?.displayId || s?.supplierDisplayId || 'SUPPLIER'} (${s?.name || s?.fullName || ''})
Cycle: ${payoutTargetMonth}${payoutTargetWeek ? ` - ${payoutTargetWeekLabel}` : ''}
Amount Disbursed: $${Number(payoutForm.amount || 0).toFixed(2)}
Payment Method: ${payoutForm.paymentMethod} (External Bank-to-Bank Transfer)
Transaction ID (TID): ${payoutForm.tid || 'PENDING'}
Bank Account: ${b?.provider || 'Bank'} | Acc: ${b?.accNumber || 'N/A'} | Title: ${b?.cardDate || s?.name || s?.fullName}
Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
Status: VERIFIED & COMPLETED
-------------------------------------------------`
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
      await adminApi.executeSupplierPayout(
        selectedSupplierId,
        {
          monthKey: payoutTargetMonth,
          weekKey: payoutTargetWeek,
          amount: amt,
          tid: payoutForm.tid.trim(),
          paymentMethod: payoutForm.paymentMethod,
          receiptUrl: payoutForm.receiptUrl.trim(),
          notes: payoutForm.notes.trim(),
        },
        receiptFile,
      )
      setSuccessMsg(
        `Weekly payout of $${amt.toFixed(2)} processed successfully (TID: ${payoutForm.tid.trim()})!`,
      )
      setTimeout(() => setSuccessMsg(''), 5000)
      setPayoutModalOpen(false)

      // Refresh data
      loadPendingWeeks()
      loadDirectory()
      if (selectedSupplierId && viewMode === 'monthly') {
        loadSupplierHistory(selectedSupplierId)
      }
      if (selectedSupplierId && viewMode === 'weeks') {
        const updated = await adminApi.supplierMonthlyHistory(selectedSupplierId)
        setMonthlyData(updated)
        if (selectedMonthKey) {
          const m = updated.months?.find((x) => x.monthKey === selectedMonthKey)
          if (m) setSelectedMonthObj(m)
        }
      }
      if (viewMode === 'orders' && selectedMonthKey) {
        loadMonthOrders(selectedSupplierId, selectedMonthKey, selectedWeekKey, ordersPreviousView)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to process supplier payout.'))
    } finally {
      setSubmittingPayout(false)
    }
  }

  // Filtered Pending Weeks
  const filteredPendingWeeks = useMemo(() => {
    return pendingWeeks.filter((w) => {
      if (pendingWeeksFilter === 'actionable' && !w.isActionable) return false
      if (pendingWeeksFilter === 'holding' && w.isActionable) return false

      if (pendingWeeksSearch.trim()) {
        const q = pendingWeeksSearch.toLowerCase().trim()
        const match =
          (w.supplierDisplayId && w.supplierDisplayId.toLowerCase().includes(q)) ||
          (w.supplierName && w.supplierName.toLowerCase().includes(q)) ||
          (w.businessName && w.businessName.toLowerCase().includes(q)) ||
          (w.bankDetails?.provider && w.bankDetails.provider.toLowerCase().includes(q)) ||
          (w.bankDetails?.accNumber && w.bankDetails.accNumber.toLowerCase().includes(q)) ||
          (w.weekLabel && w.weekLabel.toLowerCase().includes(q)) ||
          (w.saturdayLabel && w.saturdayLabel.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [pendingWeeks, pendingWeeksFilter, pendingWeeksSearch])

  // Filtered Suppliers for Directory View
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (directoryFilter === 'mature' && !s.hasMaturePayout) return false
      if (directoryFilter === 'settled' && (s.matureAmount > 0 || s.immatureAmount > 0)) return false

      if (directorySearch.trim()) {
        const q = directorySearch.toLowerCase().trim()
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
  }, [suppliers, directoryFilter, directorySearch])

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Finance Operations"
        title="Supplier Finances & Weekly Payouts"
        action={
          viewMode !== 'directory' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'orders') {
                  if (ordersPreviousView === 'pending-weeks') {
                    setViewMode('directory')
                    setActiveTab('pending-weeks')
                  } else if (ordersPreviousView === 'weeks' && selectedMonthObj) {
                    setViewMode('weeks')
                  } else {
                    setViewMode('monthly')
                  }
                } else if (viewMode === 'weeks') {
                  setViewMode('monthly')
                } else {
                  setViewMode('directory')
                  setSearchParams({})
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              {viewMode === 'orders'
                ? ordersPreviousView === 'pending-weeks'
                  ? 'Back to Pending Weeks'
                  : selectedMonthObj
                    ? 'Back to Weekly Cycles'
                    : 'Back to Monthly History'
                : viewMode === 'weeks'
                  ? 'Back to Monthly History'
                  : 'Back to Overview'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadPendingWeeks()
                loadDirectory()
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          )
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

      {/* Primary Tab Switcher (Only visible on main directory level) */}
      {viewMode === 'directory' && (
        <div className="mb-6 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('pending-weeks')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
              activeTab === 'pending-weeks'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Pending Weekly Payouts
            {pendingWeeksSummary.actionableWeeksCount > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                {pendingWeeksSummary.actionableWeeksCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
              activeTab === 'directory'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Supplier Directory & Full History
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {suppliers.length}
            </span>
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 1: PENDING WEEKLY PAYOUTS (DEDICATED ACTION SCREEN)    */}
      {/* ========================================================== */}
      {viewMode === 'directory' && activeTab === 'pending-weeks' && (
        <div className="space-y-5">
          {/* Top Metric Stat Cards for Pending Weeks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-emerald-200 bg-emerald-50/20 p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-emerald-800">Actionable Balance</p>
                    <span className="rounded bg-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900">
                      Delivered
                    </span>
                  </div>
                  <p className="text-xl font-black text-emerald-700">
                    ${pendingWeeksSummary.totalActionableAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Actionable Weeks</p>
                  <p className="text-xl font-bold text-slate-900">
                    {pendingWeeksSummary.actionableWeeksCount}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Suppliers to Pay</p>
                  <p className="text-xl font-bold text-slate-900">
                    {pendingWeeksSummary.distinctSuppliersCount}
                  </p>
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
                    <p className="text-xs font-semibold text-amber-800">Delivered Orders</p>
                    <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                      Ready
                    </span>
                  </div>
                  <p className="text-xl font-bold text-amber-700">
                    {pendingWeeksSummary.totalMatureOrdersCount}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Workflow Notice Banner */}
          <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-white to-emerald-50/40 p-4 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Rolling Weekly Disbursement Policy
                </span>
                <p className="text-slate-800">
                  Only <strong>delivered orders</strong> are considered mature and disbursed every Saturday. If a week has partially delivered items, the mature orders are paid immediately, while in-transit items remain open under that week until confirmed delivered.
                </p>
              </div>
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
                Bank-to-Bank Transfer · TID & Receipt Required
              </span>
            </div>
          </Card>

          {/* Search & Filter Bar */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pendingWeeksSearch}
                  onChange={(e) => setPendingWeeksSearch(e.target.value)}
                  placeholder="Search by Supplier, IBAN, Bank, or Week Cycle…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <select
                value={pendingWeeksFilter}
                onChange={(e) => setPendingWeeksFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="all">All Weekly Cycles ({pendingWeeks.length})</option>
                <option value="actionable">🟢 Actionable (Mature Ready to Release)</option>
                <option value="holding">🟡 In Transit / Awaiting Delivery</option>
              </select>
            </div>

            <span className="text-xs font-medium text-slate-500">
              Showing <strong className="text-slate-800">{filteredPendingWeeks.length}</strong> weekly cycles
            </span>
          </Card>

          {/* Actionable Pending Weeks Table */}
          <Card className="overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3.5">Supplier Details</th>
                    <th className="px-4 py-3.5">Bank Account / IBAN</th>
                    <th className="px-4 py-3.5">Weekly Cycle & Period</th>
                    <th className="px-4 py-3.5">Saturday Release Date</th>
                    <th className="px-4 py-3.5">Fulfillment Status</th>
                    <th className="px-4 py-3.5">Gross / Cut</th>
                    <th className="px-4 py-3.5">Mature Ready to Pay</th>
                    <th className="px-4 py-3.5">Remaining Pending</th>
                    <th className="px-4 py-3.5">Cycle Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingPendingWeeks && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading pending weekly payout streams…
                      </td>
                    </tr>
                  )}
                  {!loadingPendingWeeks && filteredPendingWeeks.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                        No pending weekly cycles found matching your criteria.
                      </td>
                    </tr>
                  )}
                  {filteredPendingWeeks.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        item.isActionable ? 'bg-emerald-50/15' : ''
                      }`}
                    >
                      {/* Supplier Details */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-200">
                            {item.supplierDisplayId}
                          </span>
                          <span className="font-semibold text-slate-900">{item.supplierName}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{item.businessName}</p>
                      </td>

                      {/* Bank Details with Copy IBAN */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">{item.bankDetails?.provider || 'Bank'}</p>
                          <button
                            type="button"
                            onClick={() => {
                              const b = item.bankDetails
                              const text = `${b?.provider || 'Bank'} | Acc: ${b?.accNumber || 'N/A'} | Title: ${b?.cardDate || item.supplierName}`
                              handleCopyText(text, 'Bank Account Details')
                            }}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                            title="Copy IBAN and Details"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </div>
                        <p className="font-mono text-indigo-700 text-[11px]">{item.bankDetails?.accNumber || 'Not Set'}</p>
                      </td>

                      {/* Weekly Cycle */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-bold text-slate-900">{item.periodLabel || item.weekLabel}</span>
                        <p className="text-[11px] text-slate-400 font-mono">{item.weekKey}</p>
                      </td>

                      {/* Saturday Release Date */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-indigo-900">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                          {item.saturdayLabel || item.saturdayRelease}
                        </span>
                      </td>

                      {/* Fulfillment Breakdown */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{item.totalOrders} total orders</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-bold text-emerald-700">{item.deliveredCount} delivered</span> ·{' '}
                          <span className="text-amber-700">{item.pendingDeliveryCount} in transit</span>
                        </div>
                      </td>

                      {/* Gross & Cut */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <p className="font-semibold text-slate-800">${item.grossSales.toFixed(2)}</p>
                        <p className="text-[11px] text-rose-600">Cut: -${item.commission.toFixed(2)}</p>
                      </td>

                      {/* Mature Balance Ready to Pay */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {item.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 font-mono text-xs font-black text-emerald-900 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            +${item.matureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Remaining Pending Delivery */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {item.immatureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 border border-amber-200">
                            ${item.immatureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {item.isActionable ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Ready for Release
                          </span>
                        ) : item.immatureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            Pending Delivery
                          </span>
                        ) : (
                          <Badge tone="neutral">{item.payoutStatus}</Badge>
                        )}
                        {item.paidAmount > 0 && (
                          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Partially Paid: ${item.paidAmount.toFixed(2)}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              loadMonthOrders(item.supplierId, item.monthKey, item.weekKey, 'pending-weeks')
                            }
                            className="h-8 text-xs"
                          >
                            Inspect Orders
                          </Button>

                          {item.isActionable && (
                            <Button
                              size="sm"
                              onClick={() => openPayoutModalFromWeek(item)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Release Payout
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
      {/* TAB 2: SUPPLIERS DIRECTORY & ARCHIVE                       */}
      {/* ========================================================== */}
      {viewMode === 'directory' && activeTab === 'directory' && (
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
                  <p className="text-xl font-bold text-slate-900">{directorySummary.totalSuppliers}</p>
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
                      Delivered
                    </span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">${directorySummary.totalMaturePayable.toFixed(2)}</p>
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
                    <p className="text-xs font-semibold text-amber-800">Pending Delivery</p>
                    <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                      In Transit
                    </span>
                  </div>
                  <p className="text-xl font-bold text-amber-700">${directorySummary.totalImmatureHolding.toFixed(2)}</p>
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
                  <p className="text-xl font-bold text-slate-900">${directorySummary.totalPaidOut.toFixed(2)}</p>
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
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="Search by Supplier ID, Name, Business, Bank…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <select
                value={directoryFilter}
                onChange={(e) => setDirectoryFilter(e.target.value)}
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
                    <th className="px-4 py-3.5">Gross / Cut</th>
                    <th className="px-4 py-3.5">Mature Balance (Delivered)</th>
                    <th className="px-4 py-3.5">Pending Delivery</th>
                    <th className="px-4 py-3.5">Total Paid</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingDirectory && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading supplier finances…
                      </td>
                    </tr>
                  )}
                  {!loadingDirectory && filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        No suppliers found.
                      </td>
                    </tr>
                  )}
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => loadSupplierHistory(s.id)}
                          className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded transition-colors"
                          title="Click to view weekly payout cycles"
                        >
                          {s.supplierDisplayId}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{s.fullName}</p>
                        <p className="text-xs text-slate-500">{s.businessName || s.email}</p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <p className="font-medium text-slate-800">{s.bankDetails.provider}</p>
                        <p className="font-mono text-slate-500">{s.bankDetails.accNumber}</p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{s.totalOrders} total</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700">{s.deliveredCount} del</span> ·{' '}
                          <span className="text-amber-700">{s.pendingCount} pend</span> ·{' '}
                          <span className="text-rose-600">{s.cancelledCount} ret</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <p className="font-semibold text-slate-800">${s.grossSales.toFixed(2)}</p>
                        <p className="text-[11px] text-slate-500">Cut: ${s.commissionTotal.toFixed(2)}</p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {s.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                            ${s.matureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {s.immatureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 border border-amber-200">
                            ${s.immatureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                        ${s.paidTotal.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSupplierHistory(s.id)}
                          className="h-8 gap-1 text-xs"
                        >
                          Weekly Cycles
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
                    <Copy className="h-3 w-3" /> Copy Details
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
                    <span className="text-slate-400">Account Title:</span>{' '}
                    <span>{monthlyData?.bankDetails?.cardDate || monthlyData?.supplier?.fullName}</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card className="overflow-hidden shadow-soft">
            <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Monthly Payout History</h3>
                <p className="text-xs text-slate-500">
                  Delivered orders mature immediately. Click any month row to inspect weekly Saturday release cycles.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <th className="px-4 py-3.5">Month</th>
                    <th className="px-4 py-3.5">Orders Summary</th>
                    <th className="px-4 py-3.5">Gross Revenue</th>
                    <th className="px-4 py-3.5">Platform Cut</th>
                    <th className="px-4 py-3.5">Net Supplier Share</th>
                    <th className="px-4 py-3.5">Mature Balance (Delivered)</th>
                    <th className="px-4 py-3.5">Pending Delivery</th>
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
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => openMonthWeeks(m)}
                          className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5 text-left"
                        >
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          {m.monthLabel}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{m.totalOrders} total</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700">{m.deliveredCount} del</span> ·{' '}
                          <span className="text-amber-700">{m.pendingCount} pend</span> ·{' '}
                          <span className="text-rose-600">{m.cancelledCount} ret</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        ${m.grossSales.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-rose-600">
                        -${m.commission.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        ${m.netEarnings.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {m.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                            ${m.matureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {m.immatureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 border border-amber-200">
                            ${m.immatureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {m.payoutStatus === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            <Check className="h-3 w-3" /> Paid (${m.paidAmount.toFixed(2)})
                          </span>
                        ) : m.payoutStatus.includes('Mature') ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Mature (Ready to Release)
                          </span>
                        ) : m.payoutStatus.includes('Immature') ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            Pending Delivery
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

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openMonthWeeks(m)}
                            className="h-8 text-xs gap-1"
                          >
                            Inspect Weeks
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadMonthOrders(selectedSupplierId, m.monthKey, '', 'monthly')}
                            className="h-8 text-xs"
                          >
                            All Orders
                          </Button>
                          {(m.matureAmount > 0 || (m.netEarnings > m.paidAmount && m.totalOrders > 0)) && (
                            <Button
                              size="sm"
                              onClick={() => openPayoutModalFromMonth(m)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Pay Month
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
      {/* VIEW 3: WEEKLY SATURDAY PAYOUT CYCLES FOR THE MONTH         */}
      {/* ========================================================== */}
      {viewMode === 'weeks' && (
        <div className="space-y-5">
          {/* Header Card */}
          <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-600 px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                    {monthlyData?.supplier?.supplierDisplayId || 'SUPPLIER'}
                  </span>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    {selectedMonthObj?.monthLabel || selectedMonthKey}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Weekly Payout Cycles (Every Saturday)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Delivered products mature immediately. Admin transfers funds externally via bank-to-bank and attaches TID + screenshot.
                </p>
              </div>

              {/* Bank quick-copy */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs text-xs space-y-1">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Supplier Bank</span>
                  <button
                    type="button"
                    onClick={() => {
                      const b = monthlyData?.bankDetails
                      const text = `${b?.provider || 'Bank'} | Acc: ${b?.accNumber || 'N/A'} | Title: ${b?.cardDate || monthlyData?.supplier?.fullName}`
                      handleCopyText(text, 'Bank Account Details')
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy IBAN
                  </button>
                </div>
                <p>
                  <strong>{monthlyData?.bankDetails?.provider || 'Bank'}</strong>: {monthlyData?.bankDetails?.accNumber || 'N/A'}
                </p>
              </div>
            </div>

            {/* Metric Pills */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-3">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Month Gross</span>
                <p className="text-sm font-bold text-slate-800">${selectedMonthObj?.grossSales?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-rose-50/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-rose-500">Platform Cut</span>
                <p className="text-sm font-bold text-rose-700">-${selectedMonthObj?.commission?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2.5 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Mature Ready</span>
                <p className="text-sm font-black text-emerald-800">${selectedMonthObj?.matureAmount?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Paid Out</span>
                <p className="text-sm font-bold text-slate-700">${selectedMonthObj?.paidAmount?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </Card>

          {/* Weeks Table */}
          <Card className="overflow-hidden shadow-soft">
            <div className="border-b border-slate-100 p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Weekly Payout Schedule & Delivery Maturity</h3>
              <p className="text-xs text-slate-500">
                Each weekly cycle resolves to its Saturday release date. Click "Release Weekly Payout" to disburse and upload transaction screenshot.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <th className="px-4 py-3.5">Week & Period</th>
                    <th className="px-4 py-3.5">Saturday Release Cycle</th>
                    <th className="px-4 py-3.5">Orders Summary</th>
                    <th className="px-4 py-3.5">Gross Sales</th>
                    <th className="px-4 py-3.5">Platform Cut</th>
                    <th className="px-4 py-3.5">Net Share</th>
                    <th className="px-4 py-3.5">Mature Balance (Delivered)</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(!selectedMonthObj?.weeks || selectedMonthObj.weeks.length === 0) && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        No orders recorded for this month.
                      </td>
                    </tr>
                  )}
                  {selectedMonthObj?.weeks?.map((w) => (
                    <tr key={w.weekKey} className="hover:bg-slate-50/60 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-800">
                            W{w.weekNumber}
                          </span>
                          <span>{w.periodLabel || w.weekLabel}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1 text-xs font-semibold text-indigo-900">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                          {w.saturdayLabel || w.saturdayRelease}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{w.totalOrders} total</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700 font-semibold">{w.deliveredCount} delivered</span> ·{' '}
                          <span className="text-amber-700">{w.totalOrders - w.deliveredCount} pending</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        ${w.grossSales.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-rose-600">
                        -${w.commission.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        ${w.netEarnings.toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {w.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                            ${w.matureAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">$0.00</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {w.payoutStatus === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            <Check className="h-3 w-3" /> Paid (${w.paidAmount.toFixed(2)})
                          </span>
                        ) : w.matureAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Ready for Saturday Release
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {w.totalOrders > 0 ? 'Pending Delivery' : 'No Activity'}
                          </span>
                        )}
                        {w.payoutTid && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            TID: {w.payoutTid}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              loadMonthOrders(selectedSupplierId, selectedMonthObj.monthKey, w.weekKey, 'weeks')
                            }
                            className="h-8 text-xs"
                          >
                            Inspect Orders
                          </Button>
                          {(w.matureAmount > 0 || (w.netEarnings > w.paidAmount && w.totalOrders > 0)) && (
                            <Button
                              size="sm"
                              onClick={() => openPayoutModalFromMonth(selectedMonthObj, w)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Release Weekly Payout
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
      {/* VIEW 4: ORDERS DRILL-DOWN & DETAILED BREAKDOWN              */}
      {/* ========================================================== */}
      {viewMode === 'orders' && (
        <div className="space-y-5">
          {/* Month & Week Banner */}
          <Card className="border border-indigo-100 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    {monthOrdersData?.supplier?.supplierDisplayId}
                  </span>
                  {selectedWeekKey && (
                    <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      Week Filter: {selectedWeekKey}
                    </span>
                  )}
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {monthOrdersData?.monthLabel || selectedMonthKey} Orders Breakdown
                </h2>
                <p className="text-xs text-slate-500">
                  Orders are mature upon delivery. Net payout reflects platform commission cut.
                </p>
              </div>

              {/* Financial Summary */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Sales</span>
                  <span className="font-bold text-slate-800">
                    ${Number(monthOrdersData?.summary?.grossTotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs">
                  <span className="text-rose-500 block text-[10px] uppercase font-bold">Commission</span>
                  <span className="font-bold text-rose-700">
                    -${Number(monthOrdersData?.summary?.commissionTotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Mature Payable (Delivered)</span>
                  <span className="font-mono text-sm font-black text-emerald-800">
                    ${Number(monthOrdersData?.summary?.matureTotal || 0).toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    const mObj = selectedMonthObj || {
                      monthKey: selectedMonthKey,
                      monthLabel: monthOrdersData?.monthLabel || selectedMonthKey,
                      matureAmount: monthOrdersData?.summary?.matureTotal || 0,
                      netEarnings: monthOrdersData?.summary?.netTotal || 0,
                      paidAmount: 0,
                    }
                    openPayoutModalFromMonth(mObj)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <DollarSign className="h-4 w-4" /> Disburse Payout
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
                    <th className="px-4 py-3.5">Order # & Date</th>
                    <th className="px-4 py-3.5">Product & SKU</th>
                    <th className="px-4 py-3.5">Price & Qty</th>
                    <th className="px-4 py-3.5">Total Amount</th>
                    <th className="px-4 py-3.5">Platform Cut</th>
                    <th className="px-4 py-3.5">Supplier Net</th>
                    <th className="px-4 py-3.5">Maturity Status</th>
                    <th className="px-4 py-3.5">Payout Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingMonthOrders && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading orders…
                      </td>
                    </tr>
                  )}
                  {!loadingMonthOrders &&
                    (!monthOrdersData?.orders || monthOrdersData.orders.length === 0) && (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                          No orders found for this period.
                        </td>
                      </tr>
                    )}
                  {monthOrdersData?.orders?.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(order.id)
                            setOrderDrawerOpen(true)
                          }}
                          className="font-mono text-xs font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          #{order.orderNo || order.orderNumber || order.id?.slice(-6)}
                        </button>
                        <p className="text-[11px] text-slate-400">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </td>

                      <td className="max-w-[200px] truncate px-4 py-3.5 text-xs">
                        <p className="font-medium text-slate-900 truncate">
                          {order.product || order.productTitle || 'Product'}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          SKU: {order.productSku || 'N/A'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-700">
                        ${Number(order.unitPrice || 0).toFixed(2)} × {order.quantity || 1}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        ${Number(order.total || 0).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-rose-600">
                        -${Number(order.commission || 0).toFixed(2)}
                        <span className="text-[10px] text-slate-400 block">
                          ({order.commissionPercent ?? order.commissionRate ?? 0}%)
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-emerald-700">
                        +$
                        {Number(
                          order.supplierNet ??
                            order.netAmount ??
                            Number(order.total || 0) - Number(order.commission || 0),
                        ).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {order.isMature ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Mature (Delivered)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3 text-amber-600" /> Pending Delivery
                          </span>
                        )}
                      </td>

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

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <IconAction
                          icon={Eye}
                          tone="success"
                          aria-label="View order details"
                          title="View order details"
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
      {/* MODAL: DISBURSE SUPPLIER PAYOUT (BANK-TO-BANK + RECEIPT)   */}
      {/* ========================================================== */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <Card className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  External Bank Settlement & Disbursement
                </span>
                <h3 className="text-lg font-bold text-slate-900">Release Supplier Payout</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-900">
              <p className="font-semibold">Step 1: Direct Bank-to-Bank Transfer</p>
              <p className="mt-0.5 text-[11px] text-amber-800">
                Transfer the payout amount to the supplier's bank account outside Sellvro. Once completed, enter the bank TID and attach the transfer receipt screenshot below.
              </p>
            </div>

            {/* Supplier Registered Bank Details Box */}
            <div className="mt-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                  Supplier Registered Bank Account
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const b = payoutTargetSupplier?.bank || monthlyData?.bankDetails || monthOrdersData?.bankDetails
                    const s = payoutTargetSupplier || monthlyData?.supplier || monthOrdersData?.supplier
                    const text = `Bank: ${b?.provider || 'Bank'} | Acc: ${b?.accNumber || 'N/A'} | Title: ${b?.cardDate || s?.name || s?.fullName}`
                    handleCopyText(text, 'Bank Account Details')
                  }}
                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700 shadow-2xs border border-indigo-200 hover:bg-indigo-50"
                >
                  <Copy className="h-3 w-3" /> Copy Details
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Supplier:</span>
                  <strong className="text-slate-900">
                    {payoutTargetSupplier?.name || monthlyData?.supplier?.fullName} ({payoutTargetSupplier?.displayId || monthlyData?.supplier?.supplierDisplayId})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Bank / Provider:</span>
                  <strong className="text-slate-900">
                    {(payoutTargetSupplier?.bank || monthlyData?.bankDetails)?.provider || 'Not Set'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Account # / IBAN:</span>
                  <strong className="font-mono text-indigo-700">
                    {(payoutTargetSupplier?.bank || monthlyData?.bankDetails)?.accNumber || 'Not Set'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payout Cycle:</span>
                  <span className="font-bold text-slate-800">
                    {payoutTargetMonth} {payoutTargetWeek ? `(${payoutTargetWeek})` : ''}
                  </span>
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
                  placeholder="e.g. TID-982148102 or Bank Ref #"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Transaction proof ID generated by your bank app / transfer slip.
                </p>
              </div>

              {/* Receipt File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Transaction Screenshot / Receipt
                </label>
                <div className="rounded-lg border-2 border-dashed border-slate-300 p-3 hover:border-indigo-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {receiptPreview && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <img
                        src={receiptPreview}
                        alt="Receipt Preview"
                        className="h-16 w-24 object-cover rounded border border-slate-200 shadow-2xs"
                      />
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Screenshot Attached
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Notes / Remarks
                </label>
                <input
                  type="text"
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Weekly payout cleared"
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
                    {submittingPayout ? 'Processing…' : 'Release & Mark Paid'}
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
