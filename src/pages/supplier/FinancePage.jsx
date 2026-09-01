import { useEffect, useMemo, useState } from 'react'
import { User, Briefcase, HandCoins } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { financeApi, getErrorMessage } from '../../lib/api.js'

const TABLE_HEAD = [
  { label: 'No', align: 'text-left' },
  { label: 'Transaction ID', align: 'text-left' },
  { label: 'Status', align: 'text-center' },
  { label: 'Total', align: 'text-center' },
  { label: 'Date', align: 'text-center' },
]

function SupplierFinancePage() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ pendingPayouts: 0, pendingAmount: 0, processedTotal: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    financeApi
      .supplier()
      .then((data) => {
        if (!active) return
        setTransactions(data.data || [])
        setSummary(data.summary || { pendingPayouts: 0, pendingAmount: 0, processedTotal: 0 })
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load finance.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Pending Payouts', value: summary.pendingPayouts || 0, icon: User, tone: 'blue' },
      {
        label: 'Pending Amount',
        value: `$${Number(summary.pendingAmount || 0).toFixed(2)}`,
        icon: Briefcase,
        tone: 'yellow',
      },
      {
        label: 'Processed Total',
        value: `$${Number(summary.processedTotal || 0).toFixed(2)}`,
        icon: HandCoins,
        tone: 'purple',
      },
    ],
    [summary],
  )

  const isEmpty = !loading && transactions.length === 0

  return (
    <SupplierLayout>
      <PageHeader eyebrow="Supplier Panel" title="Finance" />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head.label} className={`whitespace-nowrap px-5 py-3 font-medium ${head.align}`}>
                    {head.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No Transactions Found
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{tx.no}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{tx.transactionId}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    <Badge tone={tx.status === 'Processed' ? 'success' : 'warning'}>{tx.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center text-slate-500">
                    ${Number(tx.total).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center text-slate-500">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {isEmpty && <p className="px-5 py-16 text-center text-sm text-slate-500">No Transactions Found</p>}
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4">
              <p className="font-semibold text-slate-800">{tx.transactionId}</p>
              <p className="mt-1 text-sm text-slate-600">${Number(tx.total).toFixed(2)}</p>
              <Badge className="mt-2" tone={tx.status === 'Processed' ? 'success' : 'warning'}>
                {tx.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </SupplierLayout>
  )
}

export default SupplierFinancePage
