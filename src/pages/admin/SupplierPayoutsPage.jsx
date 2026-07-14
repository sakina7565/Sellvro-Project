import { UserRound, Lock, ArrowDownToLine, Eye, AlertTriangle } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { SUPPLIER_PAYOUTS } from '../../lib/mockData.js'

const SUMMARY_STATS = [
  { label: 'Pending Payouts', value: 0, icon: UserRound, tone: 'purple' },
  { label: 'Pending Amount', value: '$0.00', icon: Lock, tone: 'yellow', active: true },
  { label: 'Processed Total', value: '$200.00', icon: ArrowDownToLine, tone: 'blue' },
]

const FILTERS = [
  { label: 'All Requests', options: ['Pending', 'Processed'] },
  { label: 'All Banks', options: ['Not Set'] },
]

const TABLE_HEAD = ['Supplier', 'Email', 'Payout', 'Held', 'Bank Details', 'Commission', 'Status', 'Actions']

function PayoutActions() {
  return (
    <>
      <IconAction icon={Eye} tone="success" aria-label="View payout" />
      <IconAction icon={AlertTriangle} tone="warning" aria-label="Flag payout" />
    </>
  )
}

function SupplierPayoutsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Supplier Payouts" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <FilterBar filters={FILTERS} />

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
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
              {SUPPLIER_PAYOUTS.map((payout) => (
                <tr key={payout.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{payout.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.payout}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.held}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.bankDetails}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payout.cardDate}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone="warning">{payout.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-0.5">
                      <PayoutActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {SUPPLIER_PAYOUTS.map((payout) => (
            <MobileCard
              key={payout.id}
              title={payout.supplier}
              subtitle={payout.email}
              badge={<Badge tone="warning">{payout.status}</Badge>}
              actions={<PayoutActions />}
            >
              <DetailRow label="Payout" value={payout.payout} />
              <DetailRow label="Held" value={payout.held} />
              <DetailRow label="Bank Details" value={payout.bankDetails} />
              <DetailRow label="Commission" value={payout.cardDate} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={1} to={SUPPLIER_PAYOUTS.length} total={SUPPLIER_PAYOUTS.length} prevLabel="Previous" />
      </Card>
    </AdminLayout>
  )
}

export default SupplierPayoutsPage
