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
    setSaving(true)
    try {
      await walletApi.createRequest({ amount, bankTid }, receipt)
      setSuccess('Deposit request submitted.')
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
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}
      {success && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {showForm && (
        <Card className="mb-6 p-5 shadow-soft">
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <Input
              id="depositAmount"
              label="Amount (USD) *"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              id="bankTid"
              label="Bank TID *"
              value={bankTid}
              onChange={(e) => setBankTid(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <label htmlFor="receipt" className="mb-1.5 block text-sm font-medium text-slate-700">
                Receipt image
              </label>
              <input
                id="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit deposit request'}
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
