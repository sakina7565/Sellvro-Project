import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { adminApi, getErrorMessage, mediaUrl } from '../../lib/api.js'

export default function SupplierPerformanceModal({
  supplierId,
  open,
  onClose,
  onOpenWarnModal,
  onOpenSuspendModal,
  onSupplierUpdated,
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dispatch') // 'dispatch' | 'supplier_reviews' | 'product_reviews' | 'actions_history'

  // Penalty Form state
  const [showPenaltyForm, setShowPenaltyForm] = useState(false)
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [penaltyReason, setPenaltyReason] = useState('')
  const [penaltyDetails, setPenaltyDetails] = useState('')
  const [submittingPenalty, setSubmittingPenalty] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  // Dispatch filter
  const [dispatchFilter, setDispatchFilter] = useState('all') // 'all' | 'on_time' | 'late' | 'pending'
  const [searchOrder, setSearchOrder] = useState('')

  const loadReport = async () => {
    if (!supplierId) return
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.supplierPerformanceReport(supplierId)
      setData(res)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supplier performance report.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && supplierId) {
      loadReport()
    }
  }, [open, supplierId])

  if (!open) return null

  const supplier = data?.supplier || {}
  const metrics = data?.metrics || {}
  const comparisonList = data?.comparisonList || []
  const supplierReviews = data?.supplierReviews || []
  const productReviews = data?.productReviews || []
  const warnings = supplier.warnings || []
  const penalties = supplier.penalties || []

  // Filter comparison orders
  const filteredComparisonList = comparisonList.filter((item) => {
    if (dispatchFilter === 'on_time' && !item.isOnTime) return false
    if (dispatchFilter === 'late' && item.complianceStatus !== 'Late Dispatch' && item.complianceStatus !== 'Overdue') return false
    if (dispatchFilter === 'pending' && item.isDispatched) return false

    if (searchOrder.trim()) {
      const q = searchOrder.toLowerCase()
      const matchNo = item.orderNo?.toLowerCase().includes(q)
      const matchProd = item.productName?.toLowerCase().includes(q)
      const matchSku = item.sku?.toLowerCase().includes(q)
      const matchCarrier = item.carrier?.toLowerCase().includes(q)
      if (!matchNo && !matchProd && !matchSku && !matchCarrier) return false
    }
    return true
  })

  const handleImposePenalty = async (e) => {
    e.preventDefault()
    if (!penaltyReason.trim()) {
      alert('Please specify a penalty reason.')
      return
    }
    setSubmittingPenalty(true)
    try {
      await adminApi.penalizeSupplier(supplierId, {
        amount: Number(penaltyAmount) || 0,
        reason: penaltyReason.trim(),
        details: penaltyDetails.trim(),
      })
      setActionSuccess('Performance penalty notice recorded and supplier notified.')
      setShowPenaltyForm(false)
      setPenaltyAmount('')
      setPenaltyReason('')
      setPenaltyDetails('')
      setTimeout(() => setActionSuccess(''), 4000)
      await loadReport()
      if (onSupplierUpdated) onSupplierUpdated()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to record penalty.'))
    } finally {
      setSubmittingPenalty(false)
    }
  }

  const handleReinstate = async () => {
    const confirm = window.confirm(`Reinstate supplier "${supplier.fullName}"? Their account will be set to Approved.`)
    if (!confirm) return
    try {
      await adminApi.reinstateSupplier(supplierId)
      setActionSuccess('Supplier reinstated successfully!')
      setTimeout(() => setActionSuccess(''), 4000)
      await loadReport()
      if (onSupplierUpdated) onSupplierUpdated()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to reinstate supplier.'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  {supplier.fullName || 'Supplier'}
                </h2>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  ID: {supplier.supplierDisplayId || 'SPAK-XXXX'}
                </span>
                <Badge
                  tone={
                    supplier.status === 'approved'
                      ? 'success'
                      : supplier.status === 'suspended'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {supplier.status === 'suspended' ? '🚫 Suspended' : supplier.status}
                </Badge>
                {supplier.supplierType && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {supplier.supplierType}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {supplier.businessName} · {supplier.email} {supplier.phone ? `· ${supplier.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              title="Refresh Report Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccess && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              {actionSuccess}
            </span>
          </div>
        )}

        {/* Action Header Strip: Warning, Penalty & Suspension controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-amber-50/40 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Enforcement Status:</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                (supplier.warningsCount || 0) === 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : (supplier.warningsCount || 0) < 3
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {supplier.warningsCount || 0}/3 Warnings Issued
            </span>
            {penalties.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold">
                {penalties.length} Penalty Recorded
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (onOpenWarnModal) onOpenWarnModal(supplier)
              }}
              className="text-xs font-bold text-amber-800 border-amber-300 bg-white hover:bg-amber-50 gap-1"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Issue Warning #{Number(supplier.warningsCount || 0) + 1}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPenaltyForm((v) => !v)}
              className="text-xs font-bold text-purple-800 border-purple-300 bg-white hover:bg-purple-50 gap-1"
            >
              <FileText className="h-3.5 w-3.5 text-purple-600" />
              Impose Penalty
            </Button>

            {supplier.status === 'suspended' ? (
              <Button
                size="sm"
                onClick={handleReinstate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reinstate Supplier
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (onOpenSuspendModal) onOpenSuspendModal(supplier)
                }}
                className="text-xs font-bold text-rose-700 border-rose-300 bg-white hover:bg-rose-50 gap-1"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Suspend Account
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Penalty Recording Form */}
        {showPenaltyForm && (
          <form onSubmit={handleImposePenalty} className="border-b border-purple-200 bg-purple-50/50 p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-purple-700" />
                Impose Performance / SLA Breach Penalty
              </span>
              <button
                type="button"
                onClick={() => setShowPenaltyForm(false)}
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Penalty Fine Amount (USD $)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  placeholder="e.g. 50 (or 0 for formal note)"
                  className="h-9 w-full rounded-lg border border-purple-300 bg-white px-3 text-xs font-bold text-purple-900 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Violation / Penalty Reason *
                </label>
                <input
                  type="text"
                  required
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  placeholder="e.g. Failure to dispatch orders within promised 24 hours SLA"
                  className="h-9 w-full rounded-lg border border-purple-300 bg-white px-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <input
                type="text"
                value={penaltyDetails}
                onChange={(e) => setPenaltyDetails(e.target.value)}
                placeholder="Optional administrative notes or action requirement for supplier..."
                className="h-9 w-full rounded-lg border border-purple-200 bg-white px-3 text-xs text-slate-600 focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={submittingPenalty}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
              >
                {submittingPenalty ? 'Recording...' : 'Submit & Notify Supplier'}
              </Button>
            </div>
          </form>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading && !data ? (
            <div className="py-20 text-center text-sm text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-3" />
              Loading complete performance and review analytics...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              {error}
            </div>
          ) : (
            <>
              {/* 4 High-Impact KPI Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Overall Rating & Reviews */}
                <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Overall Rating</span>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {metrics.overallRating > 0 ? metrics.overallRating.toFixed(1) : '5.0'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ 5.0</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{metrics.totalReviews || 0} Customer Reviews</span>
                    <span className="font-bold text-emerald-700">
                      {metrics.positivePercentage || 100}% Positive
                    </span>
                  </div>
                </div>

                {/* 2. On-Time Dispatch Rate (Listing vs Actual Handover) */}
                <div
                  className={`rounded-xl border p-4 shadow-2xs ${
                    metrics.dispatchOnTimeRate >= 80
                      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white'
                      : metrics.dispatchOnTimeRate >= 60
                      ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 to-white'
                      : 'border-rose-200 bg-gradient-to-br from-rose-50/60 to-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Dispatch SLA Rate</span>
                    <Truck
                      className={`h-4 w-4 ${
                        metrics.dispatchOnTimeRate >= 80
                          ? 'text-emerald-600'
                          : metrics.dispatchOnTimeRate >= 60
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-black ${
                        metrics.dispatchOnTimeRate >= 80
                          ? 'text-emerald-700'
                          : metrics.dispatchOnTimeRate >= 60
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {metrics.dispatchOnTimeRate}%
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">On-Time</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{metrics.onTimeDispatchedCount || 0} Dispatched On-Time</span>
                    <span className={metrics.lateDispatchedCount > 0 ? 'text-rose-600 font-bold' : ''}>
                      {metrics.lateDispatchedCount || 0} Late
                    </span>
                  </div>
                </div>

                {/* 3. Average Handling / Handover Time */}
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                    <span>Avg. Handover Speed</span>
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-900">
                      {metrics.avgActualDispatchHours > 0 ? `${metrics.avgActualDispatchHours}h` : '18.0h'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">to Courier</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Standard Baseline: <strong className="text-slate-800">24h SLA</strong>
                  </div>
                </div>

                {/* 4. Orders Fulfillment Summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Orders Activity</span>
                    <Package className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {metrics.totalOrders || 0}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Orders Total</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{metrics.dispatchedOrdersCount || 0} Handed Over</span>
                    <span className={metrics.overduePendingCount > 0 ? 'text-rose-600 font-bold' : ''}>
                      {metrics.pendingHandoverCount || 0} In Progress
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dispatch')}
                    className={`inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'dispatch'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    <span>Listing Time vs Actual Dispatch ({comparisonList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('supplier_reviews')}
                    className={`inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'supplier_reviews'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Award className="h-4 w-4" />
                    <span>Supplier Reviews ({supplierReviews.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('product_reviews')}
                    className={`inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'product_reviews'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span>Product Reviews ({productReviews.length} Products)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('actions_history')}
                    className={`inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'actions_history'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Admin Warnings &amp; Penalties ({warnings.length + penalties.length})</span>
                  </button>
                </div>
              </div>

              {/* ── TAB 1: LISTING TIME VS ACTUAL DISPATCH PERFORMANCE ── */}
              {activeTab === 'dispatch' && (
                <div className="space-y-4">
                  {/* Explanatory Policy Banner */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 text-xs text-indigo-950 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-indigo-900">
                        Listing Handling Time vs Actual Courier Handover Audit
                      </p>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Ye section supplier ke product listing ke waqt mention kiye gaye <strong>Handling / Dispatch Time</strong> ko uski <strong>Actual Courier Handover Time</strong> ke sath compare karta hai. Agar supplier promised time se late parcel courier ko handover karta hai, toh woh yahan flag hota hai.
                      </p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDispatchFilter('all')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          dispatchFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All ({comparisonList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDispatchFilter('on_time')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          dispatchFilter === 'on_time'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        ✓ On-Time ({comparisonList.filter((i) => i.isOnTime).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDispatchFilter('late')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          dispatchFilter === 'late'
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        ⚠ Late / Breached ({comparisonList.filter((i) => !i.isOnTime).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDispatchFilter('pending')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          dispatchFilter === 'pending'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        Pending Handover ({comparisonList.filter((i) => !i.isDispatched).length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchOrder}
                        onChange={(e) => setSearchOrder(e.target.value)}
                        placeholder="Search order #, SKU, courier..."
                        className="h-8 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Comparison Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Order &amp; Item</th>
                          <th className="px-3 py-3">Promised Dispatch (Listing)</th>
                          <th className="px-3 py-3">Actual Courier Handover</th>
                          <th className="px-3 py-3">Courier &amp; Tracking</th>
                          <th className="px-3 py-3 text-right">Compliance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredComparisonList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                              No orders found matching the filter.
                            </td>
                          </tr>
                        ) : (
                          filteredComparisonList.map((item) => (
                            <tr key={item.orderId} className="hover:bg-slate-50/70 transition">
                              {/* Order & Product */}
                              <td className="px-4 py-3">
                                <span className="font-mono font-bold text-slate-900 block text-xs">
                                  {item.orderNo}
                                </span>
                                <span className="font-medium text-slate-700 block truncate max-w-[200px]" title={item.productName}>
                                  {item.productName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  SKU: {item.sku} · Placed {new Date(item.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </td>

                              {/* Promised Handling Time */}
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 text-xs">
                                  <Clock className="h-3 w-3 text-slate-500" />
                                  {item.promisedHandlingTime}
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  Target: Within {item.promisedHours} hours
                                </span>
                              </td>

                              {/* Actual Handover Time */}
                              <td className="px-3 py-3">
                                {item.isDispatched && item.dispatchedAt ? (
                                  <div>
                                    <span className="font-bold text-slate-900 text-xs block">
                                      {item.actualHours} Hours to Handover
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(item.dispatchedAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                                    <Clock className="h-3 w-3" />
                                    Pending Courier Handover
                                  </span>
                                )}
                              </td>

                              {/* Courier & Tracking */}
                              <td className="px-3 py-3">
                                <span className="font-semibold text-slate-800 block">
                                  {item.carrier}
                                </span>
                                {item.trackingNumber ? (
                                  <span className="font-mono text-[11px] text-indigo-700 block select-all">
                                    {item.trackingNumber}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No tracking ID yet</span>
                                )}
                              </td>

                              {/* Compliance Badge */}
                              <td className="px-3 py-3 text-right">
                                {item.complianceStatus === 'On-Time' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    On-Time ({item.actualHours}h)
                                  </span>
                                ) : item.complianceStatus === 'Late Dispatch' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200" title={`Delayed by ${item.delayHours} hours past promised time`}>
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                    Late by {item.delayHours}h
                                  </span>
                                ) : item.complianceStatus === 'Overdue' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800 border border-rose-300 animate-pulse">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    Overdue ({item.delayHours}h Late)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    <Clock className="h-3 w-3" />
                                    Within Window
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 2: SUPPLIER REVIEWS (SERVICE & DELIVERY PUNCTUALITY) ── */}
              {activeTab === 'supplier_reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Buyer Reviews for Supplier Service &amp; Delivery Punctuality
                      </h3>
                      <p className="text-xs text-slate-500">
                        Users supplier ko jo reviews aur delivery speed ratings de rahe hain.
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                      Average Delivery Rating: {metrics.avgDeliveryRating || 5.0} / 5.0
                    </span>
                  </div>

                  {supplierReviews.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 italic rounded-xl border border-dashed border-slate-200">
                      No customer reviews submitted for this supplier yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {supplierReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm transition space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-xs text-slate-900">{rev.reviewerName}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Order #{rev.orderNo}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 block">
                                Product: {rev.productName} ({rev.productSku})
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                rev.deliveredOnTime
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <Truck className="h-3 w-3" />
                              {rev.deliveredOnTime ? 'Delivered On-Time' : 'Delayed Delivery'}
                            </span>
                          </div>

                          {/* Ratings Breakdown: Product & Supplier */}
                          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100">
                            <div>
                              <span className="text-slate-500 block text-[10px] font-semibold">Supplier Services:</span>
                              <div className="flex items-center text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500 mr-1" />
                                <span>{rev.supplierServicesRating || rev.supplierDeliveryRating || 5}.0 / 5.0</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px] font-semibold">Supplier Performance:</span>
                              <div className="flex items-center text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500 mr-1" />
                                <span>{rev.supplierPerformanceRating || rev.supplierDeliveryRating || 5}.0 / 5.0</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px] font-semibold">Product Quality:</span>
                              <div className="flex items-center text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500 mr-1" />
                                <span>{rev.productQualityRating || 5}.0 / 5.0</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px] font-semibold">Product Performance:</span>
                              <div className="flex items-center text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500 mr-1" />
                                <span>{rev.productPerformanceRating || 5}.0 / 5.0</span>
                              </div>
                            </div>
                          </div>

                          {rev.comment ? (
                            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700 italic border border-slate-100">
                              &quot;{rev.comment}&quot;
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No written comment provided.</p>
                          )}

                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
                            <span>Verified Buyer Feedback</span>
                            <span>{new Date(rev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: PRODUCT REVIEWS (QUALITY & ACCURACY) ── */}
              {activeTab === 'product_reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Product Reviews for Supplier&apos;s Catalog
                      </h3>
                      <p className="text-xs text-slate-500">
                        Supplier ke products par customers ke diye hue reviews, ratings aur feedback.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                      Average Product Quality: {metrics.avgProductRating || 5.0} / 5.0
                    </span>
                  </div>

                  {productReviews.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 italic rounded-xl border border-dashed border-slate-200">
                      No product reviews recorded for this supplier&apos;s listings yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {productReviews.map((prod) => (
                        <div
                          key={prod.productId}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-3">
                              {prod.image ? (
                                <img
                                  src={mediaUrl(prod.image)}
                                  alt={prod.productName}
                                  className="h-10 w-10 object-contain rounded-lg border border-slate-200 bg-white"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                                  PROD
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-xs text-slate-900">{prod.productName}</h4>
                                <span className="font-mono text-[11px] text-slate-400">
                                  SKU: {prod.sku}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="flex items-center justify-end text-amber-500 font-bold text-xs gap-1">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                <span>{prod.averageRating.toFixed(1)} / 5.0</span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {prod.totalReviews} {prod.totalReviews === 1 ? 'review' : 'reviews'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {prod.reviews.map((r) => (
                              <div key={r.id} className="rounded-lg bg-slate-50/80 p-2.5 text-xs space-y-1.5 border border-slate-100">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{r.reviewerName}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <span>Quality: <strong className="text-amber-600">{r.productQualityRating || r.productRating || 5}★</strong></span>
                                    <span>•</span>
                                    <span>Performance: <strong className="text-amber-600">{r.productPerformanceRating || r.productRating || 5}★</strong></span>
                                  </div>
                                </div>
                                {r.comment && (
                                  <p className="text-[11px] text-slate-600 italic">&quot;{r.comment}&quot;</p>
                                )}
                                <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                                  <span>Order #{r.orderNo}</span>
                                  <span>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: ADMIN WARNINGS & PENALTIES HISTORY ── */}
              {activeTab === 'actions_history' && (
                <div className="space-y-4">
                  {/* Warnings Log */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Official Performance Warnings ({warnings.length} of 3)
                    </h3>
                    {warnings.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500 text-center">
                        ✓ No performance warnings have been issued to this supplier yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {warnings.map((w, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-slate-800 space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
                                  {w.warningNumber || idx + 1}
                                </span>
                                Warning #{w.warningNumber || idx + 1}: {w.reason}
                              </span>
                              <span className="text-[10px] text-amber-800 font-mono">
                                {new Date(w.warnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            {w.details && (
                              <p className="text-[11px] text-slate-600 pl-6.5">
                                {w.details}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pl-6.5">
                              <span>Rating at time of warning: <strong>{w.averageRating || '—'} ★</strong></span>
                              <span>•</span>
                              <span>On-time Delivery: <strong>{w.onTimeDeliveryPercent || 100}%</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Penalties Log */}
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-purple-700" />
                      Administrative &amp; Financial Penalties ({penalties.length})
                    </h3>
                    {penalties.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500 text-center">
                        No penalties recorded.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {penalties.map((p, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 text-xs text-slate-800 space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-purple-950 flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-purple-600" />
                                Penalty #{p.penaltyNumber || idx + 1}: {p.reason}
                              </span>
                              <div className="flex items-center gap-2">
                                {p.amount > 0 && (
                                  <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                                    -${p.amount} USD
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(p.penalizedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                            {p.details && (
                              <p className="text-[11px] text-slate-600 pl-5.5">
                                {p.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suspension Status Log */}
                  {supplier.status === 'suspended' && (
                    <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-950">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        Account Currently Suspended
                      </div>
                      <p className="text-[11px] text-rose-800">
                        Reason: {supplier.suspensionReason || 'Violation of performance SLA and quality guidelines.'}
                      </p>
                      {supplier.suspendedAt && (
                        <p className="text-[10px] text-rose-600">
                          Suspended On: {new Date(supplier.suspendedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50/80 shrink-0">
          <span className="text-xs text-slate-400">
            Sellvro Automated Supplier SLA &amp; Customer Satisfaction Engine
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Close Report
          </Button>
        </div>
      </div>
    </div>
  )
}

