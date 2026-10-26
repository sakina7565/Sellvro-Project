import { useEffect, useMemo, useState } from 'react'
import { User, Briefcase, HandCoins, DollarSign, Percent, TrendingDown, ArrowDownRight } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { financeApi, getErrorMessage } from '../../lib/api.js'

const TABLE_HEAD = [
  { label: 'No', align: 'text-left' },
  { label: 'Reference / Order', align: 'text-left' },
  { label: 'Status', align: 'text-center' },
  { label: 'Gross Sale', align: 'text-center' },
  { label: 'Sellvro Fee', align: 'text-center' },
  { label: 'Net Payout', align: 'text-center' },
  { label: 'Date', align: 'text-center' },
]

function SupplierFinancePage() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({
    pendingPayouts: 0,
    pendingAmount: 0,
    grossTotal: 0,
    commissionTotal: 0,
    processedTotal: 0,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    financeApi
      .supplier()
      .then((data) => {
        if (!active) return
        setTransactions(data.data || [])
        setSummary(
          data.summary || {
            pendingPayouts: 0,
            pendingAmount: 0,
            grossTotal: 0,
            commissionTotal: 0,
            processedTotal: 0,
          },
        )
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
      {
        label: 'Gross Sales (Unpaid)',
        value: `$${Number(summary.grossTotal || summary.pendingAmount || 0).toFixed(2)}`,
        icon: DollarSign,
        tone: 'blue',
      },
      {
        label: 'Platform Commission Cut',
        value: `-$${Number(summary.commissionTotal || 0).toFixed(2)}`,
        icon: TrendingDown,
        tone: 'pink',
      },
      {
        label: 'Net Pending Payable',
        value: `$${Number(summary.pendingAmount || 0).toFixed(2)}`,
        icon: Briefcase,
        tone: 'yellow',
      },
      {
        label: 'Settled / Processed Total',
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
      <PageHeader eyebrow="Supplier Panel" title="Finance & Payout Ledger" />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      {/* Financial Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[750px] text-sm">
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
                <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{tx.no}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                    <span className="font-mono">{tx.transactionId}</span>
                    <span className="block text-[11px] text-slate-400 capitalize">{tx.type === 'payout' ? 'Bank Payout' : 'Order Earning'}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    <Badge tone={tx.status === 'Processed' ? 'success' : 'warning'}>{tx.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center text-slate-700 font-medium">
                    ${Number(tx.grossTotal !== undefined ? tx.grossTotal : tx.total).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center text-rose-600 font-medium">
                    {tx.commission && tx.commission > 0 ? `-$${Number(tx.commission).toFixed(2)}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center text-emerald-700 font-bold">
                    +${Number(tx.total).toFixed(2)}
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
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 font-mono text-xs">{tx.transactionId}</p>
                <Badge tone={tx.status === 'Processed' ? 'success' : 'warning'}>
                  {tx.status}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Gross: ${Number(tx.grossTotal || tx.total).toFixed(2)}</span>
                {tx.commission > 0 && <span className="text-rose-600">Fee: -${Number(tx.commission).toFixed(2)}</span>}
                <span className="font-bold text-emerald-700">Net: +${Number(tx.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </SupplierLayout>
  )
}

export default SupplierFinancePage
