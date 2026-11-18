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
  Truck,
  Send,
  Zap,
  Globe,
  Building,
  Smartphone,
  CreditCard,
  Copy,
  AlertCircle,
  HelpCircle,
  Package,
  RotateCcw,
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
import { formatWalletTxId } from '../../lib/idFormatters.js'

const FILTERS = [
  { label: 'From date', type: 'date' },
  { label: 'To date', type: 'date' },
  { label: 'All Requests', options: ['New Request', 'Approved', 'Rejected', 'Order Refunds'] },
]

const TABLE_HEAD = [
  'User / Account',
  'Deposit & Credit',
  'TID / Slip',
  'Status',
  'Actions',
]

const DEFAULT_INTL_METHODS = {
  wise: {
    enabled: true,
    accountTitle: 'Sellvro Global Inc. (Wise)',
    accountNumber: '890123456789',
    iban: 'US8901234567890123',
    routing: '026009593',
    apiKey: '',
    profileId: '',
    instructions: 'Direct real-time transfer to client Wise account or international bank account.',
  },
  payoneer: {
    enabled: true,
    accountTitle: 'Sellvro Enterprise Payoneer',
    accountNumber: 'PAY-9041284',
    email: 'payments@sellvro.com',
    clientId: '',
    clientSecret: '',
    instructions: 'Real-time payment transfer to client Payoneer ID or registered Payoneer email.',
  },
  stripe: {
    enabled: true,
    accountId: 'acct_1SellvroGlobal',
    secretKey: '',
    publishableKey: '',
    instructions: 'Automated Stripe Connect payout to client bank account.',
  },
  bankWire: {
    enabled: true,
    bankName: 'JPMorgan Chase / Citibank N.A.',
    accountTitle: 'Sellvro Global Holding Inc.',
    accountNumber: '440189230198',
    iban: 'US44CHAS0000440189230198',
    swift: 'CHASUS33XXX',
    routing: '021000021',
    instructions: 'Global SWIFT wire transfer to client international bank account.',
  },
}

const DEFAULT_COURIER_INTEGRATIONS = {
  usps: {
    enabled: true,
    accountNumber: 'USPS-981024',
    userId: '',
    apiKey: '',
    defaultService: 'Priority Mail',
  },
  ups: {
    enabled: true,
    accountNumber: '1Z9999999999999999',
    clientId: '',
    clientSecret: '',
    defaultService: 'UPS Ground',
  },
  fedex: {
    enabled: true,
    accountNumber: 'FDX-7410293',
    apiKey: '',
    secretKey: '',
    meterNumber: '',
    defaultService: 'FedEx 2Day',
  },
}

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
  const [transactionType, setTransactionType] = useState('all') // 'all' | 'deposits' | 'refunds'
  const [inspectRequest, setInspectRequest] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState('')

  const handleCopyText = (text, label) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopyFeedback(`${label} copied!`)
    setTimeout(() => setCopyFeedback(''), 2500)
  }

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('general') // 'general' | 'pkr_usd' | 'international' | 'couriers'
  const [usdRate, setUsdRate] = useState(280)
  const [marketplaceFee, setMarketplaceFee] = useState(8)
  const [wmsFee, setWmsFee] = useState(0)
  const [pkrAccounts, setPkrAccounts] = useState([])
  const [usdAccounts, setUsdAccounts] = useState([])
  const [intlMethods, setIntlMethods] = useState(DEFAULT_INTL_METHODS)
  const [couriers, setCouriers] = useState(DEFAULT_COURIER_INTEGRATIONS)
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
        setWmsFee(res.data.wmsFeePercent ?? 0)
        setPkrAccounts(res.data.pkrAccounts || [])
        setUsdAccounts(res.data.usdAccounts || [])
        if (res.data.internationalPaymentMethods) {
          setIntlMethods((prev) => ({
            ...prev,
            ...res.data.internationalPaymentMethods,
          }))
        }
        if (res.data.courierIntegrations) {
          setCouriers((prev) => ({
            ...prev,
            ...res.data.courierIntegrations,
          }))
        }
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
    return requests.filter((r) => {
      const isRef = Boolean(
        r.isRefund ||
        r.paymentMethod === 'wallet_refund' ||
        (r.refundType && r.refundType !== 'none') ||
        String(r.bankTid || '').toUpperCase().startsWith('REFUND-')
      )

      // Filter by Transaction Type (All, Deposits, Refunds)
      if (transactionType === 'deposits' && isRef) return false
      if (transactionType === 'refunds' && !isRef) return false

      // Filter by Status / Request Type
      if (activeFilter === 'New Request') {
        return r.status === 'pending'
      }
      if (activeFilter === 'Approved') {
        return r.status === 'approved'
      }
      if (activeFilter === 'Rejected') {
        return r.status === 'rejected'
      }
      if (activeFilter === 'Order Refunds') {
        return isRef
      }
      return true
    })
  }, [requests, activeFilter, transactionType])

  const summary = useMemo(
    () => {
      const pending = requests.filter((r) => r.status === 'pending' || r.statusLabel === 'New Request')
      const approved = requests.filter(
        (r) =>
          (r.status === 'approved' || r.statusLabel === 'Approved') &&
          !r.isRefund &&
          r.paymentMethod !== 'wallet_refund' &&
          !String(r.bankTid || '').toUpperCase().startsWith('REFUND-')
      )
      const refunds = requests.filter(
        (r) =>
          r.isRefund ||
          r.paymentMethod === 'wallet_refund' ||
          (r.refundType && r.refundType !== 'none') ||
          String(r.bankTid || '').toUpperCase().startsWith('REFUND-')
      )
      const totalRefundedSum = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)

      return [
        { label: 'Total Transactions', value: requests.length, icon: Wallet, tone: 'blue' },
        {
          label: 'New Deposit Requests',
          value: pending.length,
          icon: Coins,
          tone: 'yellow',
        },
        {
          label: 'Approved Deposits',
          value: approved.length,
          icon: CheckCircle2,
          tone: 'teal',
        },
        {
          label: 'Order Cancellation Refunds',
          value: `${refunds.length} ($${totalRefundedSum.toFixed(2)})`,
          icon: RotateCcw,
          tone: 'purple',
        },
      ]
    },
    [requests],
  )

  const handleOpenInspect = (request) => {
    setInspectRequest(request)
  }

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
        wmsFeePercent: Number(wmsFee),
        pkrAccounts,
        usdAccounts,
        internationalPaymentMethods: intlMethods,
        courierIntegrations: couriers,
      }
      await adminApi.updateWalletSettings(payload)
      setSettingsSuccess('Platform settings, courier integrations, and international payment accounts updated successfully!')
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

  const updateIntlField = (provider, field, value) => {
    setIntlMethods((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }))
  }

  const updateCourierField = (courierKey, field, value) => {
    setCouriers((prev) => ({
      ...prev,
      [courierKey]: {
        ...prev[courierKey],
        [field]: value,
      },
    }))
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <PageHeader
          title="Wallet Requests"
          subtitle="Review deposit proofs, execute real payment transfers, and configure Courier & Payment Gateway APIs."
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
          <span>Payment Gateways, Couriers & Rates ({usdRate} PKR)</span>
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <FilterBar filters={FILTERS} onFilterChange={(val) => setActiveFilter(val)} />

      {copyFeedback && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl animate-bounce">
          {copyFeedback}
        </div>
      )}

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
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Payment &amp; Wallet Transactions</h2>
            <p className="text-xs text-slate-500">
              Verified deposit slips, real payouts, and automatic order cancellation wallet refunds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTransactionType('all')}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                  transactionType === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('deposits')}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                  transactionType === 'deposits'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Deposits ({requests.filter((r) => !r.isRefund && r.paymentMethod !== 'wallet_refund' && !String(r.bankTid || '').toUpperCase().startsWith('REFUND-')).length})
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('refunds')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
                  transactionType === 'refunds'
                    ? 'bg-purple-600 text-white shadow-2xs font-bold'
                    : 'text-purple-700 hover:text-purple-900'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                Refunds ({requests.filter((r) => r.isRefund || r.paymentMethod === 'wallet_refund' || (r.refundType && r.refundType !== 'none') || String(r.bankTid || '').toUpperCase().startsWith('REFUND-')).length})
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {filteredRequests.length} records
            </span>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[650px] text-left text-sm">
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
                    No transactions found for selected filter.
                  </td>
                </tr>
              )}
              {filteredRequests.map((request) => {
                const isRefund = Boolean(
                  request.isRefund ||
                  request.paymentMethod === 'wallet_refund' ||
                  (request.refundType && request.refundType !== 'none') ||
                  String(request.bankTid || '').toUpperCase().startsWith('REFUND-')
                )
                const suppReversed = Number(request.supplierAmount || Math.max(0, request.amount - (request.commissionRefunded || 0))).toFixed(2)
                const commRefunded = Number(request.commissionRefunded || 0).toFixed(2)

                return (
                  <tr
                    key={request.id}
                    className={`hover:bg-slate-50/60 transition ${isRefund ? 'bg-purple-50/25' : ''}`}
                  >
                    {/* 1. User / Account */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-800">{request.user}</p>
                        {isRefund && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                            <RotateCcw className="h-2.5 w-2.5" /> Order Refund
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{request.email}</p>
                      {isRefund && (request.orderNo || request.bankTid) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 font-mono mt-0.5">
                          Order #{request.orderNo || request.bankTid.replace(/^REFUND-/, '')}
                        </span>
                      ) : (
                        request.business && (
                          <span className="text-[11px] text-indigo-600 block mt-0.5 truncate max-w-[180px]">
                            {request.business}
                          </span>
                        )
                      )}
                    </td>

                    {/* 2. Deposit & Credit */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-extrabold text-emerald-600 text-sm block">
                        +${Number(request.amount).toFixed(2)} USD
                      </span>
                      {isRefund ? (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-emerald-700 block">100% Wallet Refund</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span>Supplier: -${suppReversed}</span>
                            <span>•</span>
                            <span>Comm: -${commRefunded}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">
                            {request.depositAmount != null
                              ? `${Number(request.depositAmount).toLocaleString()} ${request.depositCurrency || 'USD'}`
                              : `$${Number(request.amount).toFixed(2)}`}
                          </span>
                          {request.depositCurrency && request.depositCurrency !== 'USD' && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Rate: {request.exchangeRate})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 3. TID / Slip */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200 mb-1">
                        {formatWalletTxId(request)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {request.bankTid}
                        </span>
                        {request.receiptImage && !isRefund && (
                          <a
                            href={mediaUrl(request.receiptImage)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                            title="View uploaded deposit receipt"
                          >
                            <ExternalLink className="h-3 w-3" /> Slip
                          </a>
                        )}
                      </div>
                      <span className="block text-[11px] text-slate-400 mt-1">
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : request.date}
                      </span>
                    </td>

                    {/* 4. Status */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div>
                        {isRefund ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                            <Check className="h-3 w-3" /> Approved (Refunded)
                          </span>
                        ) : (
                          <RequestStatus status={request.status} />
                        )}
                        {request.realTransferStatus === 'completed' && !isRefund && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 mt-1 block w-fit border border-emerald-200">
                            <Check className="h-2.5 w-2.5" /> Transferred
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Actions */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenInspect(request)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-indigo-50/70 hover:border-indigo-400 hover:text-indigo-700 transition cursor-pointer"
                          title="View complete transaction details"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          <span>View Details</span>
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
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {filteredRequests.map((request) => {
            const isRefund = Boolean(
              request.isRefund ||
              request.paymentMethod === 'wallet_refund' ||
              (request.refundType && request.refundType !== 'none') ||
              String(request.bankTid || '').toUpperCase().startsWith('REFUND-')
            )
            return (
              <MobileCard
                key={request.id}
                title={
                  <div className="flex items-center gap-1.5">
                    <span>{request.user}</span>
                    {isRefund && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                        Refund
                      </span>
                    )}
                  </div>
                }
                subtitle={request.email}
                badge={
                  isRefund ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      Refunded
                    </span>
                  ) : (
                    <RequestStatus status={request.status} />
                  )
                }
                actions={
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(request)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary-600" />
                      <span>View Details</span>
                    </button>
                  </div>
                }
              >
                <DetailRow label="Transaction ID" value={formatWalletTxId(request)} full />
                <DetailRow
                  label="Transaction Type"
                  value={
                    isRefund
                      ? `Order Refund (#${request.orderNo || request.bankTid.replace(/^REFUND-/, '')})`
                      : request.paymentMethod
                      ? request.paymentMethod.replace(/_/g, ' ').toUpperCase()
                      : 'OFFICIAL ACCOUNT'
                  }
                  full
                />
                <DetailRow
                  label="Amount"
                  value={
                    request.depositAmount != null
                      ? `${Number(request.depositAmount).toLocaleString()} ${request.depositCurrency || 'USD'}`
                      : `$${Number(request.amount).toFixed(2)}`
                  }
                />
                <DetailRow label="Credit to Wallet" value={`+$${Number(request.amount).toFixed(2)} USD`} />
                <DetailRow label="TID" value={request.bankTid} />
                <DetailRow label="Date" value={request.date} />
                {request.receiptImage && !isRefund && (
                  <div className="pt-1">
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
            )
          })}
        </div>

        <Pagination
          from={filteredRequests.length ? 1 : 0}
          to={filteredRequests.length}
          total={filteredRequests.length}
          prevLabel="Previous"
        />
      </Card>

      {/* ── WALLET REQUEST DETAILS MODAL ────────────────────────────────────── */}
      {inspectRequest && (() => {
        const isInspectRefund = Boolean(
          inspectRequest.isRefund ||
          inspectRequest.paymentMethod === 'wallet_refund' ||
          (inspectRequest.refundType && inspectRequest.refundType !== 'none') ||
          String(inspectRequest.bankTid || '').toUpperCase().startsWith('REFUND-')
        )
        const suppReversed = Number(
          inspectRequest.supplierAmount || Math.max(0, inspectRequest.amount - (inspectRequest.commissionRefunded || 0))
        ).toFixed(2)
        const commRefunded = Number(inspectRequest.commissionRefunded || 0).toFixed(2)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/90 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs ${
                      isInspectRefund
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    {isInspectRefund ? <RotateCcw className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {isInspectRefund ? 'Order Cancellation Refund Record' : 'Wallet Deposit Request'}
                      </h3>
                      {isInspectRefund ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                          <Check className="h-3 w-3" /> Approved &amp; Refunded
                        </span>
                      ) : (
                        <RequestStatus status={inspectRequest.status} />
                      )}
                    </div>
                    <p className="text-xs text-indigo-700 font-mono font-semibold">
                      Transaction ID: {formatWalletTxId(inspectRequest)}
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
                        {isInspectRefund ? 'Total Refund Credited to User Wallet' : 'Net USD To Credit Wallet'}
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-0.5">
                        +${Number(inspectRequest.amount).toFixed(2)} <span className="text-sm font-bold text-emerald-600">USD</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 block">
                        {isInspectRefund ? 'Refund Policy Status' : 'Original User Deposit'}
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {isInspectRefund
                          ? '100% Full Refund'
                          : inspectRequest.depositAmount != null
                          ? `${Number(inspectRequest.depositAmount).toLocaleString()} ${inspectRequest.depositCurrency || 'USD'}`
                          : `$${Number(inspectRequest.amount).toFixed(2)}`}
                      </span>
                      {isInspectRefund ? (
                        <span className="block text-[11px] font-medium text-emerald-700 mt-0.5">
                          ✓ Strict 12-Hour Verified
                        </span>
                      ) : (
                        inspectRequest.depositCurrency && inspectRequest.depositCurrency !== 'USD' && (
                          <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                            Rate: 1 USD = {inspectRequest.exchangeRate} {inspectRequest.depositCurrency}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Dedicated Order Refund Financial Breakdown */}
                {isInspectRefund && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-900">
                        <RotateCcw className="h-4 w-4 text-purple-700" />
                        <span>Order Cancellation Financial Breakdown</span>
                      </div>
                      {(inspectRequest.orderNo || inspectRequest.bankTid) && (
                        <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                          Order #{inspectRequest.orderNo || inspectRequest.bankTid.replace(/^REFUND-/, '')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-lg bg-white p-3 border border-purple-100 shadow-2xs">
                        <span className="text-slate-500 block text-[11px] font-semibold">1. Supplier Amount Reversed</span>
                        <span className="text-sm font-extrabold text-slate-800 block mt-0.5">
                          ${suppReversed} USD
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Pending payable reversed; supplier suffers zero loss.
                        </span>
                      </div>

                      <div className="rounded-lg bg-white p-3 border border-purple-100 shadow-2xs">
                        <span className="text-slate-500 block text-[11px] font-semibold">2. Platform Commission Refunded</span>
                        <span className="text-sm font-extrabold text-indigo-700 block mt-0.5">
                          ${commRefunded} USD
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Marketplace fee reversed and returned to customer.
                        </span>
                      </div>

                      <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-800 block text-[11px] font-bold">3. Total User Wallet Refund</span>
                        <span className="text-base font-extrabold text-emerald-700 block mt-0.5">
                          +${Number(inspectRequest.amount).toFixed(2)} USD
                        </span>
                        <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                          100% credited into buyer wallet balance.
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/90 p-2.5 text-xs text-slate-700 border border-purple-100 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Strict 12-Hour Cancellation Policy:</strong> Request was approved within the allowed 12-hour limit.
                      </span>
                    </div>
                  </div>
                )}

                {/* User & Wallet Profile Information */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <User className="h-4 w-4 text-primary-600" />
                    <span>Customer &amp; Wallet Account</span>
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
                    <span>Transaction Details &amp; Reference</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 block text-[11px]">System Reference TID</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(inspectRequest.bankTid, 'TID')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-sm select-all bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                        {inspectRequest.bankTid}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Transaction Date &amp; Time</span>
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
                      <div className="sm:col-span-2 rounded-lg bg-indigo-50 border border-indigo-200 p-2.5 text-xs text-indigo-900">
                        <span className="font-bold block text-[11px] uppercase tracking-wide">Audit Note:</span>
                        <p className="mt-0.5">{inspectRequest.adminNote}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Uploaded Slip / Verification Proof */}
                {!isInspectRefund && (
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
                )}
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
                    {isInspectRefund ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <Check className="h-3 w-3" /> Settled &amp; Credited
                      </span>
                    ) : (
                      <RequestStatus status={inspectRequest.status} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* DOLLAR RATE, DEPOSIT ACCOUNTS, INTERNATIONAL GATEWAYS & COURIER SETTINGS MODAL */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment & Logistics API Configurations</h3>
                  <p className="text-xs text-slate-500">
                    Configure exchange rates, domestic deposit accounts, international payment gateways, and shipping courier APIs.
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

            {/* TAB SELECTOR */}
            <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-100/70 px-6 py-2 shrink-0 overflow-x-auto text-xs">
              {[
                { id: 'general', label: '1. Rate & Platform Fees', icon: Coins },
                { id: 'pkr_usd', label: '2. Domestic Accounts (PKR/USD)', icon: Building },
                { id: 'international', label: '3. International Gateways (Wise/Stripe)', icon: Globe },
                { id: 'couriers', label: '4. Shipping Couriers (USPS/UPS/FedEx)', icon: Truck },
              ].map((tab) => {
                const isSelected = settingsTab === tab.id
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${isSelected
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-6 overflow-y-auto flex-1">
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

              {/* ── TAB 1: GENERAL (RATE & FEES) ── */}
              {settingsTab === 'general' && (
                <div className="space-y-5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Direct / Self-Fulfillment Platform Fee */}
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 to-white p-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                          Direct Selling Fee (Self-Fulfillment) *
                        </label>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Marketplace Only
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-sm text-slate-700">Commission =</span>
                        <div className="relative w-24">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={marketplaceFee}
                            onChange={(e) => setMarketplaceFee(e.target.value)}
                            required
                            className="w-full rounded-lg border border-amber-300 bg-white py-1.5 px-2.5 text-base font-bold text-amber-700 shadow-xs focus:border-amber-600 focus:outline-none"
                          />
                        </div>
                        <span className="font-bold text-sm text-slate-700">%</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                        Standard commission charged on orders fulfilled directly by the supplier from their shop.
                      </p>
                    </div>

                    {/* WMS Fulfillment Policy Fee */}
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-white p-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950">
                          WMS Fulfillment Policy Fee *
                        </label>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          WMS Central Hub
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-sm text-slate-700">Fee =</span>
                        <div className="relative w-24">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={wmsFee}
                            onChange={(e) => setWmsFee(e.target.value)}
                            required
                            className="w-full rounded-lg border border-emerald-300 bg-white py-1.5 px-2.5 text-base font-bold text-emerald-700 shadow-xs focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                        <span className="font-bold text-sm text-slate-700">%</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                        Adjusted fee policy applied to products verified and fulfilled through Sellvro WMS Central Warehouse.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: PKR & USD DOMESTIC ACCOUNTS ── */}
              {settingsTab === 'pkr_usd' && (
                <div className="space-y-6">
                  {/* 3 PKR Deposit Accounts */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block border-b border-slate-100 pb-1">
                      3 PKR Official Admin Deposit Accounts (Visible to Users)
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
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block border-b border-slate-100 pb-1">
                      3 USD Official Admin Deposit Accounts (Visible to Users)
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
                </div>
              )}

              {/* ── TAB 3: INTERNATIONAL PAYMENT GATEWAYS ── */}
              {settingsTab === 'international' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      International Real Payment Transfer Gateways
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Enter company credentials and API keys used to disburse real money transfers into client accounts (Wise, Payoneer, Stripe, SWIFT Direct Wire).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Wise (TransferWise) */}
                    <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                          <Globe className="h-4 w-4 text-indigo-600" />
                          Wise (TransferWise) Direct Payout
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                          API Ready
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">Account Title</label>
                          <input
                            type="text"
                            value={intlMethods.wise?.accountTitle || ''}
                            onChange={(e) => updateIntlField('wise', 'accountTitle', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Account Number</label>
                          <input
                            type="text"
                            value={intlMethods.wise?.accountNumber || ''}
                            onChange={(e) => updateIntlField('wise', 'accountNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">IBAN</label>
                          <input
                            type="text"
                            value={intlMethods.wise?.iban || ''}
                            onChange={(e) => updateIntlField('wise', 'iban', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Routing / Sort Code</label>
                          <input
                            type="text"
                            value={intlMethods.wise?.routing || ''}
                            onChange={(e) => updateIntlField('wise', 'routing', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[11px] text-slate-500 block">Wise API Token / Key</label>
                          <input
                            type="password"
                            placeholder="api_token_xxxxxxxxxxxx"
                            value={intlMethods.wise?.apiKey || ''}
                            onChange={(e) => updateIntlField('wise', 'apiKey', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payoneer */}
                    <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-amber-600" />
                          Payoneer Mass Payouts
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">
                          In-Network
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">Account Title</label>
                          <input
                            type="text"
                            value={intlMethods.payoneer?.accountTitle || ''}
                            onChange={(e) => updateIntlField('payoneer', 'accountTitle', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Payoneer ID / Acc #</label>
                          <input
                            type="text"
                            value={intlMethods.payoneer?.accountNumber || ''}
                            onChange={(e) => updateIntlField('payoneer', 'accountNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[11px] text-slate-500 block">Admin Payoneer Email</label>
                          <input
                            type="email"
                            value={intlMethods.payoneer?.email || ''}
                            onChange={(e) => updateIntlField('payoneer', 'email', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Payoneer Client ID</label>
                          <input
                            type="text"
                            value={intlMethods.payoneer?.clientId || ''}
                            onChange={(e) => updateIntlField('payoneer', 'clientId', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Client Secret</label>
                          <input
                            type="password"
                            placeholder="secret_xxxxxxxxxxxx"
                            value={intlMethods.payoneer?.clientSecret || ''}
                            onChange={(e) => updateIntlField('payoneer', 'clientSecret', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stripe Connect */}
                    <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                          <Zap className="h-4 w-4 text-purple-600" />
                          Stripe Connect / Direct Payouts
                        </span>
                        <span className="text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-bold">
                          Real-Time
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">Connected Stripe Account ID</label>
                          <input
                            type="text"
                            placeholder="acct_1xxxxxxxxxxxx"
                            value={intlMethods.stripe?.accountId || ''}
                            onChange={(e) => updateIntlField('stripe', 'accountId', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Stripe Secret Key</label>
                          <input
                            type="password"
                            placeholder="sk_live_xxxxxxxxxxxx"
                            value={intlMethods.stripe?.secretKey || ''}
                            onChange={(e) => updateIntlField('stripe', 'secretKey', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Publishable Key</label>
                          <input
                            type="text"
                            placeholder="pk_live_xxxxxxxxxxxx"
                            value={intlMethods.stripe?.publishableKey || ''}
                            onChange={(e) => updateIntlField('stripe', 'publishableKey', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Direct Bank Wire (SWIFT) */}
                    <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                          <Building className="h-4 w-4 text-emerald-600" />
                          Global Bank Wire (SWIFT / IBAN)
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          Global SWIFT
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">Bank Name</label>
                          <input
                            type="text"
                            value={intlMethods.bankWire?.bankName || ''}
                            onChange={(e) => updateIntlField('bankWire', 'bankName', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Account Title</label>
                          <input
                            type="text"
                            value={intlMethods.bankWire?.accountTitle || ''}
                            onChange={(e) => updateIntlField('bankWire', 'accountTitle', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Account Number</label>
                          <input
                            type="text"
                            value={intlMethods.bankWire?.accountNumber || ''}
                            onChange={(e) => updateIntlField('bankWire', 'accountNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">IBAN</label>
                          <input
                            type="text"
                            value={intlMethods.bankWire?.iban || ''}
                            onChange={(e) => updateIntlField('bankWire', 'iban', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">SWIFT / BIC Code</label>
                          <input
                            type="text"
                            value={intlMethods.bankWire?.swift || ''}
                            onChange={(e) => updateIntlField('bankWire', 'swift', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Routing / Sort Code</label>
                          <input
                            type="text"
                            value={intlMethods.bankWire?.routing || ''}
                            onChange={(e) => updateIntlField('bankWire', 'routing', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: SHIPPING COURIER APIS (USPS, UPS, FedEx) ── */}
              {settingsTab === 'couriers' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Shipping Courier Logistics APIs (USPS, UPS, FedEx)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Configure corporate courier account numbers and Developer REST API credentials for automated shipping label generation and barcode dispatch.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* USPS */}
                    <div className="rounded-xl border border-blue-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                        <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-blue-600" />
                          USPS Web Tools API
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold">
                          Post Office
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">USPS Account #</label>
                          <input
                            type="text"
                            value={couriers.usps?.accountNumber || ''}
                            onChange={(e) => updateCourierField('usps', 'accountNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Web Tools User ID</label>
                          <input
                            type="text"
                            placeholder="USPS_USER_ID"
                            value={couriers.usps?.userId || ''}
                            onChange={(e) => updateCourierField('usps', 'userId', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">API Password / Key</label>
                          <input
                            type="password"
                            placeholder="usps_api_key"
                            value={couriers.usps?.apiKey || ''}
                            onChange={(e) => updateCourierField('usps', 'apiKey', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Default Service Tier</label>
                          <input
                            type="text"
                            value={couriers.usps?.defaultService || ''}
                            onChange={(e) => updateCourierField('usps', 'defaultService', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* UPS */}
                    <div className="rounded-xl border border-amber-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-amber-600" />
                          UPS Developer REST API
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">
                          Express
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">UPS Account / Shipper #</label>
                          <input
                            type="text"
                            value={couriers.ups?.accountNumber || ''}
                            onChange={(e) => updateCourierField('ups', 'accountNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">OAuth Client ID</label>
                          <input
                            type="text"
                            placeholder="ups_client_id"
                            value={couriers.ups?.clientId || ''}
                            onChange={(e) => updateCourierField('ups', 'clientId', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Client Secret</label>
                          <input
                            type="password"
                            placeholder="ups_client_secret"
                            value={couriers.ups?.clientSecret || ''}
                            onChange={(e) => updateCourierField('ups', 'clientSecret', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Default Service Tier</label>
                          <input
                            type="text"
                            value={couriers.ups?.defaultService || ''}
                            onChange={(e) => updateCourierField('ups', 'defaultService', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* FedEx */}
                    <div className="rounded-xl border border-purple-200 p-4 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                        <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-purple-600" />
                          FedEx Logistics REST API
                        </span>
                        <span className="text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-bold">
                          Global Air
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">FedEx Account #</label>
                          <input
                            type="text"
                            value={couriers.fedex?.accountNumber || ''}
                            onChange={(e) => updateCourierField('fedex', 'accountNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">API Key</label>
                          <input
                            type="text"
                            placeholder="fedex_api_key"
                            value={couriers.fedex?.apiKey || ''}
                            onChange={(e) => updateCourierField('fedex', 'apiKey', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Secret Key</label>
                          <input
                            type="password"
                            placeholder="fedex_secret_key"
                            value={couriers.fedex?.secretKey || ''}
                            onChange={(e) => updateCourierField('fedex', 'secretKey', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">Meter # (if applicable)</label>
                          <input
                            type="text"
                            value={couriers.fedex?.meterNumber || ''}
                            onChange={(e) => updateCourierField('fedex', 'meterNumber', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setSettingsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSettings} className="inline-flex items-center gap-1.5">
                  <Save className="h-4 w-4" />
                  <span>{savingSettings ? 'Saving Settings…' : 'Save All Configurations'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
