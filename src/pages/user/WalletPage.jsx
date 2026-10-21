import { useEffect, useMemo, useState } from 'react'
import {
  User,
  Briefcase,
  HandCoins,
  ArrowRightLeft,
  DollarSign,
  ShieldCheck,
  Building,
  Smartphone,
  CreditCard,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  QrCode,
  FileText,
  Upload,
} from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Input from '../../components/ui/Input.jsx'
import { walletApi, getErrorMessage, mediaUrl } from '../../lib/api.js'

const TABLE_HEAD = [
  'TID / NO',
  'SCREENSHOT',
  'DEPOSIT AMOUNT',
  'FINAL WALLET CREDIT',
  'STATUS',
  'DATE',
]

const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', ratePerUsd: 1, feePercent: 0 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', ratePerUsd: 280.0, feePercent: 0 },
]

const DEFAULT_PKR_ACCOUNTS = [
  {
    id: 'pkr_bank',
    methodName: 'Bank Transfer (IBFT)',
    bankName: 'Meezan Bank Ltd.',
    accountTitle: 'Sellvro Technologies (Pvt) Ltd',
    accountNumber: '01020304050607',
    iban: 'PK36MEZN0001020304050607',
    branch: 'Main Branch, Karachi',
    instructions: 'Send via Online Mobile Banking or ATM IBFT transfer. Enter TID & attach receipt.',
  },
  {
    id: 'pkr_easypaisa',
    methodName: 'EasyPaisa',
    bankName: 'Telenor Microfinance Bank',
    accountTitle: 'Sellvro Official / Admin',
    accountNumber: '0300-1234567',
    iban: '',
    branch: 'EasyPaisa Wallet',
    instructions: 'Send via EasyPaisa App > Send Money > EasyPaisa Transfer.',
  },
  {
    id: 'pkr_jazzcash',
    methodName: 'JazzCash',
    bankName: 'Mobilink Microfinance Bank',
    accountTitle: 'Sellvro Official / Admin',
    accountNumber: '0301-7654321',
    iban: '',
    branch: 'JazzCash Wallet',
    instructions: 'Send via JazzCash App > Send Money > Mobile Account.',
  },
]

const DEFAULT_USD_ACCOUNTS = [
  {
    id: 'usd_crypto',
    methodName: 'Binance / USDT (TRC-20)',
    bankName: 'Binance / TRON Network',
    accountTitle: 'Sellvro Corporate Crypto',
    accountNumber: 'TYd3X9kP8vLm2qR7zW4bN6eJ1aC5sT0uFa',
    iban: '',
    branch: 'TRON (TRC-20) Network Only',
    instructions: 'Send exact USDT on TRC-20 network. Enter Transaction Hash (TxID) and upload screenshot.',
  },
  {
    id: 'usd_wise',
    methodName: 'Wise / Bank Wire (SWIFT)',
    bankName: 'Wise / Community Federal Savings Bank',
    accountTitle: 'Sellvro Global Inc.',
    accountNumber: '890123456789',
    iban: 'US8901234567890123',
    branch: 'Routing: 026009593 / SWIFT: TRWUS33XXX',
    instructions: 'Transfer USD via Wise or International wire. Enter transfer reference.',
  },
  {
    id: 'usd_payoneer',
    methodName: 'Payoneer / Direct USD Transfer',
    bankName: 'Payoneer Direct',
    accountTitle: 'Sellvro Enterprise',
    accountNumber: 'payments@sellvro.com',
    iban: '',
    branch: 'Payoneer In-Network Payment',
    instructions: 'Pay to registered Payoneer email payments@sellvro.com. Enter Payment ID.',
  },
]

export default function UserWalletPage() {
  const [balance, setBalance] = useState(0)
  const [requests, setRequests] = useState([])
  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES)
  const [pkrAccounts, setPkrAccounts] = useState(DEFAULT_PKR_ACCOUNTS)
  const [usdAccounts, setUsdAccounts] = useState(DEFAULT_USD_ACCOUNTS)
  const [usdRatePerPkr, setUsdRatePerPkr] = useState(280)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form states
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('PKR')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [bankTid, setBankTid] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState('')

  const handleCopy = (text, id) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 2000)
  }

  const selectedCurrency = useMemo(() => {
    if (selectedCurrencyCode === 'USD') {
      return { code: 'USD', name: 'US Dollar', symbol: '$', ratePerUsd: 1 }
    }
    return {
      code: 'PKR',
      name: 'Pakistani Rupee',
      symbol: '₨',
      ratePerUsd: usdRatePerPkr || 280,
    }
  }, [selectedCurrencyCode, usdRatePerPkr])

  // Available deposit methods for chosen currency
  const availableMethods = useMemo(() => {
    return selectedCurrencyCode === 'USD' ? usdAccounts : pkrAccounts
  }, [selectedCurrencyCode, usdAccounts, pkrAccounts])

  // Auto-select first method when currency changes
  useEffect(() => {
    if (availableMethods.length > 0) {
      setSelectedMethodId(availableMethods[0].id)
    }
  }, [selectedCurrencyCode, availableMethods])

  // Exact net USD credited to wallet (0 fees)
  const creditedUsd = useMemo(() => {
    const rawVal = parseFloat(depositAmount) || 0
    if (rawVal <= 0) return 0
    if (selectedCurrencyCode === 'USD') return Number(rawVal.toFixed(2))
    const rate = usdRatePerPkr > 0 ? usdRatePerPkr : 280
    return Number((rawVal / rate).toFixed(2))
  }, [depositAmount, selectedCurrencyCode, usdRatePerPkr])

  const loadWallet = async () => {
    setError('')
    try {
      const [balanceData, requestsData, currData, settingsData] = await Promise.all([
        walletApi.balance(),
        walletApi.myRequests(),
        walletApi.currencies().catch(() => ({ currencies: DEFAULT_CURRENCIES })),
        walletApi.settings().catch(() => ({ data: null })),
      ])
      setBalance(balanceData.balance ?? balanceData.walletBalance ?? 0)
      setRequests(requestsData.data || [])

      if (currData?.currencies && Array.isArray(currData.currencies)) {
        setCurrencies(currData.currencies)
      }

      if (settingsData?.data) {
        if (settingsData.data.usdRatePerPkr) {
          setUsdRatePerPkr(settingsData.data.usdRatePerPkr)
        }
        if (Array.isArray(settingsData.data.pkrAccounts) && settingsData.data.pkrAccounts.length > 0) {
          setPkrAccounts(settingsData.data.pkrAccounts)
        }
        if (Array.isArray(settingsData.data.usdAccounts) && settingsData.data.usdAccounts.length > 0) {
          setUsdAccounts(settingsData.data.usdAccounts)
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load wallet.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWallet()
  }, [])

  const summary = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending')
    const approved = requests.filter((r) => r.status === 'approved')
    return [
      { label: 'Pending Requests', value: pending.length, icon: User, tone: 'blue' },
      {
        label: 'Pending Amount',
        value: `$${pending.reduce((sum, r) => sum + Number(r.amount || 0), 0).toFixed(2)}`,
        icon: Briefcase,
        tone: 'yellow',
      },
      {
        label: 'Processed Total',
        value: `$${approved.reduce((sum, r) => sum + Number(r.amount || 0), 0).toFixed(2)}`,
        icon: HandCoins,
        tone: 'green',
      },
    ]
  }, [requests])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const numAmount = parseFloat(depositAmount)
    if (!numAmount || numAmount <= 0) {
      setError(`Please enter a valid deposit amount greater than 0 ${selectedCurrency.code}.`)
      return
    }

    // TID check: strictly mandatory
    if (!bankTid.trim()) {
      setError('Bank Transaction ID (TID) / Reference is required. You cannot submit without TID.')
      return
    }

    // Receipt proof: strictly essential
    if (!receipt) {
      setError('Payment Receipt screenshot is essential and strictly required. Please upload your transfer slip before submitting.')
      return
    }

    setSaving(true)
    try {
      await walletApi.createRequest(
        {
          depositCurrency: selectedCurrency.code,
          depositAmount: numAmount,
          bankTid: bankTid.trim(),
        },
        receipt,
      )
      setSuccess(
        `Deposit request for ${numAmount.toLocaleString()} ${selectedCurrency.code} (~$${creditedUsd.toFixed(2)} USD net credit) submitted successfully! Admin will verify and approve your wallet credit.`,
      )
      setDepositAmount('')
      setBankTid('')
      setReceipt(null)
      setShowForm(false)
      await loadWallet()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit deposit request.'))
    } finally {
      setSaving(false)
    }
  }

  const isEmpty = !loading && requests.length === 0

  return (
    <UserLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">User Panel</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wallet Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Available Wallet Balance:{' '}
            <span className="font-extrabold text-emerald-600 text-lg">${Number(balance).toFixed(2)} USD</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowForm((prev) => !prev)
              setError('')
              setSuccess('')
            }}
          >
            {showForm ? 'Close Deposit Form' : '+ Deposit / Add Funds'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <Card className="mb-8 p-6 shadow-soft border border-slate-200 bg-white">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Deposit Funds to Wallet</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Deposit money via Pakistani Rupee (PKR) or US Dollar (USD) directly to official admin accounts.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> Official Sellvro Admin Accounts
            </span>
          </div>

          {/* Currency Selection: ONLY USD AND PKR */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Select Deposit Currency *
            </label>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                type="button"
                onClick={() => setSelectedCurrencyCode('PKR')}
                className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition ${
                  selectedCurrencyCode === 'PKR'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-left">
                  <span className="block font-bold text-base">PKR (₨)</span>
                  <span className="text-xs text-slate-500">Pakistani Rupee</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-1 rounded-md border border-emerald-200">
                  1 USD = {usdRatePerPkr} PKR
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCurrencyCode('USD')}
                className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition ${
                  selectedCurrencyCode === 'USD'
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-left">
                  <span className="block font-bold text-base">USD ($)</span>
                  <span className="text-xs text-slate-500">US Dollar</span>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-1 rounded-md border border-indigo-200">
                  Direct USD (1:1)
                </span>
              </button>
            </div>
          </div>

          {/* 3 DEPOSIT OPTIONS WITH ADMIN ACCOUNT DETAILS */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Choose Admin Deposit Option & Transfer Funds ({availableMethods.length} Options in {selectedCurrencyCode}) *
              </label>
              <span className="text-xs text-slate-500">
                Rate: 1 USD = <strong>{selectedCurrencyCode === 'USD' ? '1' : usdRatePerPkr} {selectedCurrencyCode}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableMethods.map((method, idx) => {
                const isSelected = selectedMethodId === method.id
                return (
                  <div
                    key={method.id || idx}
                    onClick={() => setSelectedMethodId(method.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition relative ${
                      isSelected
                        ? 'border-indigo-600 bg-gradient-to-b from-indigo-50/50 to-white shadow-md'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-indigo-700">
                        {method.id.includes('bank') ? <Building className="h-4 w-4" /> : method.id.includes('crypto') ? <QrCode className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                        Option {idx + 1}: {method.methodName}
                      </span>
                      {isSelected && (
                        <span className="rounded-full bg-indigo-600 p-0.5 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 mt-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Bank / Service:</span>
                        <strong className="text-slate-900 block">{method.bankName}</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Account Title:</span>
                        <strong className="text-slate-900 block">{method.accountTitle}</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          {method.id.includes('crypto') ? 'USDT (TRC-20) Address:' : 'Account # / IBAN:'}
                        </span>
                        <div className="flex items-center justify-between gap-1 mt-0.5 rounded-md bg-white p-1.5 border border-slate-200 font-mono text-[11px] text-slate-900">
                          <span className="truncate">{method.accountNumber}</span>
                          <button
                            type="button"
                            title="Copy Account Number"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(method.accountNumber, method.id)
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1 shrink-0"
                          >
                            {copiedId === method.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {method.iban && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">IBAN:</span>
                          <span className="font-mono text-[10px] text-slate-600 break-all">{method.iban}</span>
                        </div>
                      )}

                      {method.instructions && (
                        <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                          {method.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* DEPOSIT FORM */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Amount Input */}
              <div>
                <Input
                  id="depositAmount"
                  label={`Deposit Amount in ${selectedCurrency.code} (${selectedCurrency.symbol}) *`}
                  type="number"
                  min="1"
                  step="any"
                  placeholder={`e.g. ${selectedCurrency.code === 'PKR' ? '28000' : '100'}`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Enter the exact transferred sum in {selectedCurrency.code}.
                </p>
              </div>

              {/* Exact USD Credited to Wallet */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Amount Credited to Wallet (USD)
                </label>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-700 block">100% Credited (Zero Fee)</span>
                    <span className="text-xl font-extrabold text-emerald-700">
                      ${creditedUsd.toFixed(2)} USD
                    </span>
                  </div>
                  <span className="text-xs text-emerald-800 bg-emerald-100 px-2 py-1 rounded font-semibold">
                    Rate: 1 USD = {selectedCurrencyCode === 'USD' ? '1' : usdRatePerPkr} {selectedCurrencyCode}
                  </span>
                </div>
              </div>

              {/* Bank TID - Strictly Required */}
              <div>
                <label htmlFor="bankTid" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Bank Transaction ID (TID) / Reference <span className="text-rose-600">* (Required)</span>
                </label>
                <input
                  id="bankTid"
                  type="text"
                  placeholder="e.g. TXN-9843217, IBFT-4910294 or TxID"
                  value={bankTid}
                  onChange={(e) => setBankTid(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  * Without TID, your request cannot be submitted or verified.
                </p>
              </div>

              {/* Receipt File Upload - Strictly Essential */}
              <div>
                <label htmlFor="receipt" className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span>Payment Receipt / Slip <span className="text-rose-600">* (Essential Proof)</span></span>
                  {receipt && (
                    <span className="text-xs font-normal text-emerald-600">✓ Selected ({receipt.name})</span>
                  )}
                </label>
                <input
                  id="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  required
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer rounded-lg border border-slate-300 p-1.5 bg-white"
                />
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  * Proof receipt is strictly essential. Attach screenshot of transfer receipt.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={saving || !bankTid.trim() || !receipt}>
                {saving ? 'Submitting…' : `Submit Deposit ($${creditedUsd.toFixed(2)} USD)`}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      {/* Requests History Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Deposit History Records</h2>
          <span className="text-xs text-slate-500">{requests.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50/70">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No transaction history found. Click "+ Deposit / Add Funds" to submit your first deposit.
                  </td>
                </tr>
              )}
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/50 transition">
                  <td className="whitespace-nowrap px-5 py-4 font-mono font-medium text-slate-800">
                    {request.bankTid}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {request.receiptImage ? (
                      <a
                        href={mediaUrl(request.receiptImage)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        View Slip
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-semibold text-slate-800">
                      {request.depositAmount != null
                        ? `${Number(request.depositAmount).toLocaleString()} ${request.depositCurrency || 'USD'}`
                        : `$${Number(request.amount).toFixed(2)}`}
                    </span>
                    {request.depositCurrency && request.depositCurrency !== 'USD' && (
                      <span className="block text-xs text-slate-400">
                        Rate: 1 USD = {request.exchangeRate} {request.depositCurrency}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-bold text-emerald-600 text-sm">
                      ${Number(request.amount).toFixed(2)} USD
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge
                      tone={
                        request.status === 'approved'
                          ? 'success'
                          : request.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {request.statusLabel || request.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                    {request.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </UserLayout>
  )
}
