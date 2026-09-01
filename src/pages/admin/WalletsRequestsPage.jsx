import { useEffect, useMemo, useState } from 'react'
import { Wallet, Coins, CheckCircle2, Check, X } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { adminApi, getErrorMessage, mediaUrl } from '../../lib/api.js'

const FILTERS = [
  { label: 'From date', type: 'date' },
  { label: 'To date', type: 'date' },
  { label: 'All Requests', options: ['New Request', 'Approved'] },
]

const TABLE_HEAD = ['User', 'Business Name', 'Email', 'Amount', 'TID', 'Date', 'Status', 'Actions']

function RequestStatus({ status }) {
  const label = status === 'pending' ? 'New Request' : status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : status
  const tone = label === 'Approved' ? 'success' : label === 'Rejected' ? 'danger' : 'warning'
  return <Badge tone={tone}>{label}</Badge>
}

function WalletsRequestsPage() {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

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

  useEffect(() => {
    loadRequests()
  }, [])

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

  const handleApprove = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await adminApi.approveWalletRequest(id)
      await loadRequests()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve request.'))
    } finally {
      setBusyId('')
    }
  }

  const handleReject = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await adminApi.rejectWalletRequest(id)
      await loadRequests()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject request.'))
    } finally {
      setBusyId('')
    }
  }

  return (
    <AdminLayout>
      <PageHeader title="Wallets Requests" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <FilterBar filters={FILTERS} />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
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
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    No wallet requests yet.
                  </td>
                </tr>
              )}
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{request.user}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.business}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">${Number(request.amount).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {request.receiptImage ? (
                      <a
                        href={mediaUrl(request.receiptImage)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {request.bankTid}
                      </a>
                    ) : (
                      request.bankTid
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.date}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <RequestStatus status={request.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {request.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === request.id}
                          onClick={() => handleApprove(request.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === request.id}
                          onClick={() => handleReject(request.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {requests.map((request) => (
            <MobileCard
              key={request.id}
              title={request.user}
              subtitle={request.email}
              badge={<RequestStatus status={request.status} />}
              actions={
                request.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(request.id)}
                      className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(request.id)}
                      className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                  </>
                ) : null
              }
            >
              <DetailRow label="Business Name" value={request.business} full />
              <DetailRow label="Amount" value={`$${Number(request.amount).toFixed(2)}`} />
              <DetailRow label="TID" value={request.bankTid} />
              <DetailRow label="Date" value={request.date} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={requests.length ? 1 : 0} to={requests.length} total={requests.length} prevLabel="Previous" />
      </Card>
    </AdminLayout>
  )
}

export default WalletsRequestsPage
