import { useEffect, useMemo, useState } from 'react'
import { UserRound, Lock, ArrowDownToLine, Check } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

const FILTERS = [
  { label: 'All Requests', options: ['Pending', 'Processed'] },
  { label: 'All Banks', options: ['Not Set'] },
]

const TABLE_HEAD = ['Supplier', 'Email', 'Payout', 'Held', 'Bank Details', 'Commission', 'Status', 'Actions']

function SupplierPayoutsPage() {
  const [payouts, setPayouts] = useState([])
  const [summary, setSummary] = useState({ pendingCount: 0, pendingAmount: 0, processedTotal: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const loadPayouts = async () => {
    setError('')
    try {
      const data = await adminApi.payouts()
      setPayouts(data.data || [])
      setSummary(data.summary || { pendingCount: 0, pendingAmount: 0, processedTotal: 0 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load payouts.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayouts()
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Pending Payouts', value: summary.pendingCount || 0, icon: UserRound, tone: 'purple' },
      {
        label: 'Pending Amount',
        value: `$${Number(summary.pendingAmount || 0).toFixed(2)}`,
        icon: Lock,
        tone: 'yellow',
        active: true,
      },
      {
        label: 'Processed Total',
        value: `$${Number(summary.processedTotal || 0).toFixed(2)}`,
        icon: ArrowDownToLine,
        tone: 'blue',
      },
    ],
    [summary],
  )

  const handleProcess = async (payout) => {
    if (!payout.supplierId || payout.statusRaw !== 'pending') return
    setBusyId(payout.id)
    setError('')
    try {
      await adminApi.processPayout(payout.supplierId)
      await loadPayouts()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to process payout.'))
    } finally {
      setBusyId('')
    }
  }

  return (
    <AdminLayout>
      <PageHeader title="Supplier Payouts" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
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
              {!loading && payouts.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    No payouts yet.
                  </td>
                </tr>
              )}
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{payout.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.payout}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.held}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.bankDetails}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.cardDate}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone={payout.status === 'Processed' ? 'success' : 'warning'}>{payout.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {payout.statusRaw === 'pending' ? (
                      <button
                        type="button"
                        disabled={busyId === payout.id}
                        onClick={() => handleProcess(payout)}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Process
                      </button>
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
          {payouts.map((payout) => (
            <MobileCard
              key={payout.id}
              title={payout.supplier}
              subtitle={payout.email}
              badge={<Badge tone={payout.status === 'Processed' ? 'success' : 'warning'}>{payout.status}</Badge>}
              actions={
                payout.statusRaw === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleProcess(payout)}
                    className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                  >
                    Process
                  </button>
                ) : null
              }
            >
              <DetailRow label="Payout" value={payout.payout} />
              <DetailRow label="Held" value={payout.held} />
              <DetailRow label="Bank Details" value={payout.bankDetails} />
              <DetailRow label="Commission" value={payout.cardDate} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={payouts.length ? 1 : 0} to={payouts.length} total={payouts.length} prevLabel="Previous" />
      </Card>
    </AdminLayout>
  )
}

export default SupplierPayoutsPage
