import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Star,
  Truck,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  Info,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

function SupplierWarningBanner() {
  const { user } = useAuth()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  if (!user || user.role !== 'supplier') return null

  const isSuspended = user.status === 'suspended'
  const warningsCount = Number(user.warningsCount || user.warnings?.length || 0)

  // If not suspended and no warnings, don't show any warning banner
  if (!isSuspended && warningsCount === 0) return null

  const warnings = Array.isArray(user.warnings) ? user.warnings : []
  const latestWarning = warnings.length > 0 ? warnings[warnings.length - 1] : null

  return (
    <>
      {/* ── Banner Display ── */}
      <div className="w-full">
        {isSuspended ? (
          /* ── SUSPENDED ACCOUNT DANGER BANNER ── */
          <div className="border-b-2 border-rose-300 bg-linear-to-r from-rose-900 via-rose-800 to-rose-950 px-4 py-4 text-white shadow-md md:px-8">
            <div className="mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-7xl">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-2 ring-white/20 shadow-xs">
                  <ShieldAlert className="h-6 w-6 text-rose-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-rose-500/40 border border-rose-300/40 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-rose-100">
                      Marketplace Restricted
                    </span>
                    <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-rose-200">
                      {warningsCount} {warningsCount === 1 ? 'Warning' : 'Warnings'} on record
                    </span>
                    {user.suspendedAt && (
                      <span className="text-[11px] text-rose-200/80">
                        Suspended on: {new Date(user.suspendedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm md:text-base font-black tracking-tight text-white">
                    Account Suspended — Marketplace Selling Locked
                  </h3>
                  <p className="mt-0.5 text-xs text-rose-100/90 leading-relaxed max-w-3xl">
                    <strong className="text-white font-bold">Reason: </strong>
                    {user.suspensionReason || 'Account suspended by Sellvro Administration due to performance threshold violations.'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-rose-200">
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-200">
                      <XCircle className="h-3.5 w-3.5 text-rose-300" />
                      Active product listings deactivated
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-200">
                      <XCircle className="h-3.5 w-3.5 text-rose-300" />
                      New product publishing blocked
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-200">
                      <XCircle className="h-3.5 w-3.5 text-rose-300" />
                      Payout disbursements paused
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 md:self-center">
                {warnings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Warning History ({warningsCount})</span>
                  </button>
                )}
                <Link
                  to="/supplier/disputes"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-900 px-4 py-2 text-xs font-black transition-all shadow-sm cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-rose-700" />
                  <span>File Appeal / Dispute</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── ACTIVE SUPPLIER PERFORMANCE WARNING BANNER ── */
          <div className="border-b-2 border-amber-300 bg-linear-to-r from-amber-50 via-amber-100/60 to-orange-50 px-4 py-3.5 text-amber-950 shadow-2xs md:px-8">
            <div className="mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-7xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        warningsCount >= 2
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      Warning {warningsCount} of 3
                    </span>
                    <span className="text-[11px] font-bold text-amber-900">
                      {warningsCount === 1
                        ? 'Performance Notice'
                        : warningsCount === 2
                        ? 'Critical Warning — Account at Risk'
                        : 'Final Warning Before Suspension'}
                    </span>
                  </div>

                  {/* Warning Stepper / Progress */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {[1, 2, 3].map((step) => {
                      const isReached = warningsCount >= step
                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isReached
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-200/80 text-amber-800'
                          }`}
                        >
                          {isReached ? (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600/40" />
                          )}
                          <span>Warning {step}</span>
                        </div>
                      )
                    })}
                    <span className="text-[10px] font-bold text-rose-700 ml-1">
                      → 3 Warnings = Suspension
                    </span>
                  </div>

                  {/* Latest Warning Snippet */}
                  {latestWarning && (
                    <p className="mt-1.5 text-xs text-amber-900 leading-snug">
                      <strong className="font-bold text-amber-950">Latest Reason: </strong>
                      {latestWarning.reason || 'Performance review'}
                      {latestWarning.details ? ` — "${latestWarning.details}"` : ''}
                      {latestWarning.warnedAt && (
                        <span className="text-amber-700/80 ml-1.5">
                          ({new Date(latestWarning.warnedAt).toLocaleDateString()})
                        </span>
                      )}
                    </p>
                  )}

                  <p className="mt-1 text-[11px] text-amber-800/90">
                    <strong>Sellvro Policy:</strong> Suppliers receiving 3 warnings are automatically suspended and their listings deactivated. Please improve fulfillment speed and product quality to maintain good standing.
                  </p>
                </div>
              </div>

              {/* View History Button */}
              <div className="flex items-center gap-2 shrink-0 md:self-center">
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition-all shadow-xs cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>View Warning Details ({warningsCount})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── WARNING HISTORY MODAL ── */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isSuspended ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {isSuspended ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Supplier Account Warning History
                  </h3>
                  <p className="text-xs text-slate-500">
                    {warningsCount} of 3 total warnings issued
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Policy Info Card */}
            <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sellvro Performance Policy Guidelines</p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Warnings are issued when customer ratings drop below acceptable levels or order fulfillment is delayed. If you reach 3 warnings, your account is suspended and product listings are deactivated.
                </p>
              </div>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {warnings.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  No warning records found.
                </p>
              ) : (
                warnings.map((w, index) => {
                  const num = w.warningNumber || index + 1
                  const isFinal = num >= 3

                  return (
                    <div
                      key={w.id || index}
                      className={`rounded-xl border p-4 transition-all ${
                        isFinal
                          ? 'border-rose-200 bg-rose-50/40'
                          : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              isFinal
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            Warning #{num}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">
                            {w.reason || 'Performance Policy Violation'}
                          </h4>
                        </div>
                        {w.warnedAt && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                            <Clock className="h-3 w-3" />
                            {new Date(w.warnedAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Admin Note / Details */}
                      {w.details && (
                        <p className="mt-2 rounded-lg bg-white p-2.5 text-xs text-slate-700 border border-slate-200/80 leading-relaxed font-sans">
                          {w.details}
                        </p>
                      )}

                      {/* Snapshot Metrics */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                        {w.averageRating !== undefined && w.averageRating !== null && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Quality:</span>
                            <span className="flex items-center font-bold text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-0.5" />
                              {Number(w.averageRating).toFixed(1)}/5
                            </span>
                          </div>
                        )}
                        {w.onTimeDeliveryPercent !== undefined && w.onTimeDeliveryPercent !== null && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery:</span>
                            <span className="flex items-center font-bold text-emerald-700">
                              <Truck className="h-3 w-3 mr-0.5" />
                              {w.onTimeDeliveryPercent}% On-Time
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Link
                to="/supplier/disputes"
                onClick={() => setHistoryModalOpen(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Need to appeal? Open a Dispute
              </Link>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SupplierWarningBanner
