import { User, Briefcase, HandCoins } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import { SUPPLIER_TRANSACTIONS } from '../../lib/mockData.js'

const SUMMARY_STATS = [
  { label: 'Pending Payouts', value: 0, icon: User, tone: 'blue' },
  { label: 'Pending Amount', value: '$0.00', icon: Briefcase, tone: 'yellow' },
  { label: 'Processed Total', value: '$0.00', icon: HandCoins, tone: 'purple' },
]

const TABLE_HEAD = [
  { label: 'No', align: 'text-left' },
  { label: 'Transaction ID', align: 'text-left' },
  { label: 'Status', align: 'text-center' },
  { label: 'Total', align: 'text-center' },
  { label: 'Date', align: 'text-center' },
  { label: 'Action', align: 'text-right' },
]

function SupplierFinancePage() {
  const isEmpty = SUPPLIER_TRANSACTIONS.length === 0

  return (
    <SupplierLayout>
      <PageHeader eyebrow="Supplier Panel" title="Finance" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
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
            {isEmpty && (
              <tbody>
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No Transactions Found
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {/* Mobile: no horizontal scrolling needed */}
        <div className="md:hidden">
          {isEmpty && <p className="px-5 py-16 text-center text-sm text-slate-500">No Transactions Found</p>}
        </div>
      </Card>
    </SupplierLayout>
  )
}

export default SupplierFinancePage
