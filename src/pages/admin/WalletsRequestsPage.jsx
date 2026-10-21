import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Coins,
  CheckCircle2,
  Check,
  X,
  ExternalLink,
  Settings,
  Save,
  Eye,
  User,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { adminApi, getErrorMessage, mediaUrl } from '../../lib/api.js'

const FILTERS = [
  { label: 'From date', type: 'date' },
  { label: 'To date', type: 'date' },
  { label: 'All Requests', options: ['New Request', 'Approved', 'Rejected'] },
]

const TABLE_HEAD = [
  'User',
  'Business Name',
  'Deposit Amount',
  'Exchange Rate',
  'Wallet Credit (USD)',
  'TID / Slip',
  'Date',
  'Status',
  'Actions',
]

function RequestStatus({ status }) {
  const label =
    status === 'pending'
      ? 'New Request'
      : status === 'approved'
      ? 'Approved'
      : status === 'rejected'
      ? 'Rejected'
      : status
  const tone = label === 'Approved' ? 'success' : label === 'Rejected' ? 'danger' : 'warning'
  return <Badge tone={tone}>{label}</Badge>
}

export default function WalletsRequestsPage() {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Requests')
  const [inspectRequest, setInspectRequest] = useState(null)

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [usdRate, setUsdRate] = useState(280)
  const [marketplaceFee, setMarketplaceFee] = useState(8)
  const [pkrAccounts, setPkrAccounts] = useState([])
  const [usdAccounts, setUsdAccounts] = useState([])
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')

  const loadRequests = async () => {
    setError('')
    try {
      const data = await adminApi.walletRequests()
      setRequests(data.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load wallet requests.'))
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await adminApi.walletSettings()
      if (res?.data) {
        setUsdRate(res.data.usdRatePerPkr || 280)
        setMarketplaceFee(res.data.marketplaceFeePercent ?? 8)
        setPkrAccounts(res.data.pkrAccounts || [])
        setUsdAccounts(res.data.usdAccounts || [])
      }
    } catch (err) {
      console.warn('Failed to load wallet settings:', err)
    }
  }

  useEffect(() => {
    loadRequests()
    loadSettings()
  }, [])

  const filteredRequests = useMemo(() => {
    if (activeFilter === 'New Request') {
      return requests.filter((r) => r.status === 'pending')
    }
    if (activeFilter === 'Approved') {
      return requests.filter((r) => r.status === 'approved')
    }
    if (activeFilter === 'Rejected') {
      return requests.filter((r) => r.status === 'rejected')
    }
    return requests
  }, [requests, activeFilter])

  const summary = useMemo(
    () => [
      { label: 'Total Requests', value: requests.length, icon: Wallet, tone: 'blue' },
      {
        label: 'New Requests',
        value: requests.filter((r) => r.status === 'pending' || r.statusLabel === 'New Request').length,
        icon: Coins,
        tone: 'yellow',
      },
      {
        label: 'Approved Requests',
        value: requests.filter((r) => r.status === 'approved' || r.statusLabel === 'Approved').length,
        icon: CheckCircle2,
        tone: 'teal',
      },
    ],
    [requests],
  )

  const handleApprove = async (id, netAmount) => {
    if (
      !window.confirm(
        `Approve this deposit request? $${Number(netAmount).toFixed(2)} USD will be immediately added to the user's wallet balance.`,
      )
    ) {
      return
    }

    setBusyId(id)
    setError('')
    setSuccess('')
    try {
      await adminApi.approveWalletRequest(id)
      setSuccess(`Request approved! $${Number(netAmount).toFixed(2)} USD has been credited to the user's wallet.`)
      if (inspectRequest?.id === id) setInspectRequest(null)
      await loadRequests()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve request.'))
    } finally {
      setBusyId('')
    }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Optional rejection note / reason for user:')
    if (reason === null) return

    setBusyId(id)
    setError('')
    setSuccess('')
    try {
      await adminApi.rejectWalletRequest(id, { adminNote: reason })
      setSuccess('Request rejected.')
      if (inspectRequest?.id === id) setInspectRequest(null)
      await loadRequests()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject request.'))
    } finally {
      setBusyId('')
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsError('')
    setSettingsSuccess('')
    try {
      const payload = {
        usdRatePerPkr: Number(usdRate),
        marketplaceFeePercent: Number(marketplaceFee),
        pkrAccounts,
        usdAccounts,
      }
      await adminApi.updateWalletSettings(payload)
      setSettingsSuccess('Platform settings, marketplace fee, and exchange rate updated successfully!')
      setTimeout(() => {
        setSettingsSuccess('')
        setSettingsModalOpen(false)
      }, 1500)
    } catch (err) {
      setSettingsError(getErrorMessage(err, 'Failed to save settings.'))
    } finally {
      setSavingSettings(false)
    }
  }

  const updateAccountField = (type, index, field, value) => {
    if (type === 'pkr') {
      setPkrAccounts((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], [field]: value }
        return next
      })
    } else {
      setUsdAccounts((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], [field]: value }
        return next
      })
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <PageHeader
          title="Wallet Requests"
          subtitle="Review deposit proofs, approve credits, and configure Dollar rate & deposit accounts."
        />
        <Button
          type="button"
          onClick={() => {
            setSettingsModalOpen(true)
            loadSettings()
          }}
          className="inline-flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Settings className="h-4 w-4" />
          <span>Dollar Rate & Deposit Accounts ({usdRate} PKR)</span>
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <FilterBar filters={FILTERS} onFilterChange={(val) => setActiveFilter(val)} />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <Card className="overflow-hidden border border-slate-200 bg-white shadow-soft">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">User Deposit Requests</h2>
            <p className="text-xs text-slate-500">
              Verified deposit slips, transaction IDs, and exact net USD credited to user wallet.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">{filteredRequests.length} records</span>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50/75">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-4 py-3.5">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-14 text-center text-sm text-slate-500">
                    No wallet requests found for selected filter.
                  </td>
                </tr>
              )}
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/60 transition">
                  <td className="whitespace-nowrap px-4 py-4">
                    <p className="font-semibold text-slate-800">{request.user}</p>
                    <p className="text-xs text-slate-400">{request.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600 font-medium">
                    {request.business || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="font-bold text-slate-900">
                      {request.depositAmount != null
                        ? `${Number(request.depositAmount).toLocaleString()} ${request.depositCurrency || 'USD'}`
                        : `$${Number(request.amount).toFixed(2)}`}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                    {request.depositCurrency && request.depositCurrency !== 'USD' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono">
                        1 USD = {request.exchangeRate} {request.depositCurrency}
                      </span>
                    ) : (
                      <span className="text-slate-400">1:1 (USD)</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="font-extrabold text-emerald-600 text-sm">
                      +${Number(request.amount).toFixed(2)} USD
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800">{request.bankTid}</span>
                      {request.receiptImage && (
                        <a
                          href={mediaUrl(request.receiptImage)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          <ExternalLink className="h-3 w-3" /> Slip
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{request.date}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <RequestStatus status={request.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectRequest(request)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
                        title="View full deposit & user details"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary-600" />
                        <span>Details</span>
                      </button>

                      {request.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === request.id}
                            onClick={() => handleApprove(request.id, request.amount)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === request.id}
                            onClick={() => handleReject(request.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 capitalize">{request.status}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {filteredRequests.map((request) => (
            <MobileCard
              key={request.id}
              title={request.user}
              subtitle={request.email}
              badge={<RequestStatus status={request.status} />}
              actions={
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInspectRequest(request)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary-600" />
                    <span>View Details</span>
                  </button>
                  {request.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => handleApprove(request.id, request.amount)}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        Approve (${Number(request.amount).toFixed(2)} USD)
                      </button>
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => handleReject(request.id)}
                        className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              }
            >
              <DetailRow label="Business Name" value={request.business} full />
              <DetailRow
                label="Deposit Amount"
                value={
                  request.depositAmount != null
                    ? `${Number(request.depositAmount).toLocaleString()} ${request.depositCurrency || 'USD'}`
                    : `$${Number(request.amount).toFixed(2)}`
                }
              />
              <DetailRow label="Credit to Wallet" value={`+$${Number(request.amount).toFixed(2)} USD`} />
              <DetailRow label="TID" value={request.bankTid} />
              <DetailRow label="Date" value={request.date} />
              {request.receiptImage && (
                <div className="col-span-2 pt-1">
                  <a
                    href={mediaUrl(request.receiptImage)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View Uploaded Receipt
                  </a>
                </div>
              )}
            </MobileCard>
          ))}
        </div>

        <Pagination
          from={filteredRequests.length ? 1 : 0}
          to={filteredRequests.length}
          total={filteredRequests.length}
          prevLabel="Previous"
        />
      </Card>

      {/* ── WALLET REQUEST DETAILS MODAL ────────────────────────────────────── */}
      {inspectRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 shadow-2xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Wallet Deposit Request</h3>
                    <RequestStatus status={inspectRequest.status} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref ID: {inspectRequest.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectRequest(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Hero Amount Banner */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                      Net USD To Credit Wallet
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-0.5">
                      +${Number(inspectRequest.amount).toFixed(2)} <span className="text-sm font-bold text-emerald-600">USD</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 block">Original User Deposit</span>
                    <span className="text-lg font-bold text-slate-900">
                      {inspectRequest.depositAmount != null
                        ? `${Number(inspectRequest.depositAmount).toLocaleString()} ${inspectRequest.depositCurrency || 'USD'}`
                        : `$${Number(inspectRequest.amount).toFixed(2)}`}
                    </span>
                    {inspectRequest.depositCurrency && inspectRequest.depositCurrency !== 'USD' && (
                      <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                        Rate: 1 USD = {inspectRequest.exchangeRate} {inspectRequest.depositCurrency}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* User & Wallet Profile Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <User className="h-4 w-4 text-primary-600" />
                  <span>User &amp; Wallet Account</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">User Full Name</span>
                    <span className="font-bold text-slate-800 text-sm">{inspectRequest.user || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">User Email</span>
                    <span className="font-semibold text-slate-800">{inspectRequest.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">User Role / Account Type</span>
                    <span className="inline-flex items-center gap-1 mt-0.5 rounded-full bg-slate-200 px-2.5 py-0.5 font-bold uppercase text-[10px] text-slate-700">
                      {inspectRequest.role || 'user'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Current Wallet Balance</span>
                    <span className="font-extrabold text-emerald-700 text-sm block mt-0.5">
                      ${Number(inspectRequest.walletBalance || 0).toFixed(2)} USD
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Business Name</span>
                    <span className="font-semibold text-slate-800">{inspectRequest.business || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone / Contact</span>
                    <span className="font-medium text-slate-800">{inspectRequest.phone || '—'}</span>
                  </div>
                  {inspectRequest.city && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Location</span>
                      <span className="font-medium text-slate-800">
                        {inspectRequest.city}, {inspectRequest.country || 'Pakistan'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction & Bank TID Information */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>Deposit Transaction Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bank Transaction ID (TID / TxHash)</span>
                    <span className="font-mono font-bold text-slate-900 text-sm select-all bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block mt-0.5">
                      {inspectRequest.bankTid}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Request Date &amp; Time</span>
                    <span className="font-medium text-slate-800 block mt-0.5">
                      {inspectRequest.createdAt
                        ? new Date(inspectRequest.createdAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : inspectRequest.date}
                    </span>
                  </div>
                  {inspectRequest.adminNote && (
                    <div className="sm:col-span-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
                      <span className="font-bold block text-[11px] uppercase tracking-wide">Admin Rejection Note:</span>
                      <p className="mt-0.5">{inspectRequest.adminNote}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Slip / Receipt Proof */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Payment Receipt / Deposit Slip Proof
                  </span>
                  {inspectRequest.receiptImage && (
                    <a
                      href={mediaUrl(inspectRequest.receiptImage)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
                    </a>
                  )}
                </div>

                {inspectRequest.receiptImage ? (
                  <div className="flex flex-col items-center">
                    <a
                      href={mediaUrl(inspectRequest.receiptImage)}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xs transition hover:border-primary-400 flex items-center justify-center cursor-zoom-in"
                    >
                      <img
                        src={mediaUrl(inspectRequest.receiptImage)}
                        alt="Deposit Receipt"
                        className="max-h-64 object-contain rounded-lg transition group-hover:scale-[1.02]"
                      />
                      <span className="absolute bottom-3 right-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs flex items-center gap-1 shadow-sm opacity-90 group-hover:opacity-100">
                        <ExternalLink className="h-3 w-3" /> View Large
                      </span>
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                    No receipt image uploaded.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectRequest(null)}
                className="text-xs"
              >
                Close
              </Button>

              {inspectRequest.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === inspectRequest.id}
                    onClick={() => handleReject(inspectRequest.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer"
                  >
                    <X className="h-4 w-4" /> Reject Request
                  </button>
                  <button
                    type="button"
                    disabled={busyId === inspectRequest.id}
                    onClick={() => handleApprove(inspectRequest.id, inspectRequest.amount)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Approve &amp; Credit +${Number(inspectRequest.amount).toFixed(2)} USD
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Status:</span>
                  <RequestStatus status={inspectRequest.status} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOLLAR RATE & DEPOSIT ACCOUNTS SETTINGS MODAL */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Exchange Rate & Deposit Accounts Settings</h3>
                  <p className="text-xs text-slate-500">
                    Set the Dollar amount in PKR and configure the 3 PKR + 3 USD deposit accounts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {settingsSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  ✓ {settingsSuccess}
                </div>
              )}
              {settingsError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                  ⚠ {settingsError}
                </div>
              )}

              {/* Dollar Rate Configuration */}
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 mb-1">
                  Admin Configured Dollar Amount (USD to PKR Exchange Rate) *
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-bold text-sm text-slate-700">1 USD =</span>
                  <div className="relative w-40">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={usdRate}
                      onChange={(e) => setUsdRate(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-base font-bold text-indigo-700 shadow-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <span className="font-bold text-sm text-slate-700">PKR (Pakistani Rupee)</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  When a customer deposits in PKR, their funds will be automatically credited to their wallet in USD using this exact rate without any conversion fee.
                </p>
              </div>

              {/* Marketplace Platform Fee Configuration */}
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 to-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                    Sellvro Marketplace Platform Fee (Commission %) *
                  </label>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Direct / Self-Fulfillment
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-bold text-sm text-slate-700">Platform Commission =</span>
                  <div className="relative w-32">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={marketplaceFee}
                      onChange={(e) => setMarketplaceFee(e.target.value)}
                      required
                      className="w-full rounded-lg border border-amber-300 bg-white py-2 px-3 text-base font-bold text-amber-700 shadow-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <span className="font-bold text-sm text-slate-700">% per completed sale</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  This fee is automatically displayed to suppliers who choose to fulfill products directly from their own location (Marketplace Only). Suppliers cannot alter this fee.
                </p>
              </div>

              {/* 3 PKR Deposit Accounts */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block border-b border-slate-100 pb-1">
                  3 PKR Deposit Accounts (Visible to Users)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {pkrAccounts.map((acc, idx) => (
                    <div key={acc.id || idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">PKR Option {idx + 1}: {acc.methodName}</span>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Bank / Service</label>
                        <input
                          type="text"
                          value={acc.bankName}
                          onChange={(e) => updateAccountField('pkr', idx, 'bankName', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Account Title</label>
                        <input
                          type="text"
                          value={acc.accountTitle}
                          onChange={(e) => updateAccountField('pkr', idx, 'accountTitle', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Account # / Phone</label>
                        <input
                          type="text"
                          value={acc.accountNumber}
                          onChange={(e) => updateAccountField('pkr', idx, 'accountNumber', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-xs font-mono font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">IBAN (if applicable)</label>
                        <input
                          type="text"
                          value={acc.iban || ''}
                          onChange={(e) => updateAccountField('pkr', idx, 'iban', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-[11px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Instructions</label>
                        <textarea
                          rows={2}
                          value={acc.instructions || ''}
                          onChange={(e) => updateAccountField('pkr', idx, 'instructions', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 USD Deposit Accounts */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block border-b border-slate-100 pb-1">
                  3 USD Deposit Accounts (Visible to Users)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {usdAccounts.map((acc, idx) => (
                    <div key={acc.id || idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">USD Option {idx + 1}: {acc.methodName}</span>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Method / Service</label>
                        <input
                          type="text"
                          value={acc.bankName}
                          onChange={(e) => updateAccountField('usd', idx, 'bankName', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Account Title</label>
                        <input
                          type="text"
                          value={acc.accountTitle}
                          onChange={(e) => updateAccountField('usd', idx, 'accountTitle', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Address / Account / Email</label>
                        <input
                          type="text"
                          value={acc.accountNumber}
                          onChange={(e) => updateAccountField('usd', idx, 'accountNumber', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-xs font-mono font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Branch / Network / SWIFT</label>
                        <input
                          type="text"
                          value={acc.branch || ''}
                          onChange={(e) => updateAccountField('usd', idx, 'branch', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">Instructions</label>
                        <textarea
                          rows={2}
                          value={acc.instructions || ''}
                          onChange={(e) => updateAccountField('usd', idx, 'instructions', e.target.value)}
                          className="w-full rounded border border-slate-200 p-1.5 bg-white text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setSettingsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSettings} className="inline-flex items-center gap-1.5">
                  <Save className="h-4 w-4" />
                  <span>{savingSettings ? 'Saving Settings…' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
