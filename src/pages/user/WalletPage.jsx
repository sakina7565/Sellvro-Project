import { useEffect, useMemo, useState } from 'react'
import { User, Briefcase, HandCoins } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Input from '../../components/ui/Input.jsx'
import { walletApi, getErrorMessage, mediaUrl } from '../../lib/api.js'

const TABLE_HEAD = ['TID / NO', 'SCREENSHOT', 'AMOUNT', 'STATUS', 'DATE']

function UserWalletPage() {
  const [balance, setBalance] = useState(0)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [bankTid, setBankTid] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadWallet = async () => {
    setError('')
    try {
      const [balanceData, requestsData] = await Promise.all([
        walletApi.balance(),
        walletApi.myRequests(),
      ])
      setBalance(balanceData.balance ?? balanceData.walletBalance ?? 0)
      setRequests(requestsData.data || [])
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

    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid deposit amount greater than $0.00.')
      return
    }

    if (!receipt) {
      setError('Receipt image is required. Please upload your deposit slip / proof of payment before submitting.')
      return
    }

    setSaving(true)
    try {
      await walletApi.createRequest({ amount, bankTid }, receipt)
      setSuccess('Deposit request submitted successfully! Awaiting admin approval.')
      setAmount('')
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
          <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
          <p className="mt-1 text-sm text-slate-600">
            Current Balance:{' '}
            <span className="font-bold text-slate-900">${Number(balance).toFixed(2)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="link" className="text-sm">
            Learn Deposit Instructions
          </Button>
          <Button type="button" size="sm" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Close' : 'Request Amount'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <Card className="mb-6 p-5 shadow-soft border border-slate-200">
          <h3 className="mb-4 text-base font-bold text-slate-900">Submit Deposit / Recharge Request</h3>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <Input
              id="depositAmount"
              label="Amount (USD) *"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              id="bankTid"
              label="Bank Transaction ID (TID) *"
              placeholder="e.g. TXN-9843217"
              value={bankTid}
              onChange={(e) => setBankTid(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <label htmlFor="receipt" className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Receipt Screenshot / Payment Proof <span className="text-rose-500">* (Required)</span></span>
                {receipt && (
                  <span className="text-xs font-normal text-emerald-600">✓ File selected ({receipt.name})</span>
                )}
              </label>
              <input
                id="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                required
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-teal-700 hover:file:bg-teal-100 cursor-pointer rounded-lg border border-slate-200 p-2"
              />
              <p className="mt-1 text-xs text-slate-400">Supported formats: JPG, PNG, WEBP. A valid proof of transfer is required for verification.</p>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit Deposit Request'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <Card className="overflow-hidden border border-slate-200 shadow-none">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No transaction history found.
                  </td>
                </tr>
              )}
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{request.bankTid}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {request.receiptImage ? (
                      <a
                        href={mediaUrl(request.receiptImage)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    ${Number(request.amount).toFixed(2)}
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
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {isEmpty && (
            <p className="px-5 py-16 text-center text-sm text-slate-500">No transaction history found.</p>
          )}
          {requests.map((request) => (
            <div key={request.id} className="p-4">
              <p className="font-semibold text-slate-800">{request.bankTid}</p>
              <p className="mt-1 text-sm text-slate-600">${Number(request.amount).toFixed(2)}</p>
              <Badge
                className="mt-2"
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
            </div>
          ))}
        </div>
      </Card>
    </UserLayout>
  )
}

export default UserWalletPage
