import { Wallet, Coins, CheckCircle2, Eye, AlertTriangle } from 'lucide-react'
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
import { WALLET_REQUESTS } from '../../lib/mockData.js'

const SUMMARY_STATS = [
  { label: 'Total Requests', value: WALLET_REQUESTS.length, icon: Wallet, tone: 'blue' },
  { label: 'New Requests', value: WALLET_REQUESTS.filter((r) => r.status === 'New Request').length, icon: Coins, tone: 'yellow' },
  { label: 'Approved Requests', value: WALLET_REQUESTS.filter((r) => r.status === 'Approved').length, icon: CheckCircle2, tone: 'teal' },
]

const FILTERS = [
  { label: 'From date', type: 'date' },
  { label: 'To date', type: 'date' },
  { label: 'All Requests', options: ['New Request', 'Approved'] },
]

const TABLE_HEAD = ['User', 'Business Name', 'Email', 'Date', 'Status', 'Actions']

function RequestStatus({ status }) {
  return <Badge tone={status === 'Approved' ? 'success' : 'warning'}>{status}</Badge>
}

function RequestActions() {
  return (
    <>
      <IconAction icon={Eye} tone="success" aria-label="View request" />
      <IconAction icon={AlertTriangle} tone="warning" aria-label="Flag request" />
    </>
  )
}

function WalletsRequestsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Wallets Requests" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <FilterBar filters={FILTERS} />

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left text-sm">
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
              {WALLET_REQUESTS.map((request) => (
                <tr key={request.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{request.user}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.business}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{request.date}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <RequestStatus status={request.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-0.5">
                      <RequestActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {WALLET_REQUESTS.map((request) => (
            <MobileCard
              key={request.id}
              title={request.user}
              subtitle={request.email}
              badge={<RequestStatus status={request.status} />}
              actions={<RequestActions />}
            >
              <DetailRow label="Business Name" value={request.business} full />
              <DetailRow label="Date" value={request.date} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={1} to={WALLET_REQUESTS.length} total={WALLET_REQUESTS.length} prevLabel="Previous" />
      </Card>
    </AdminLayout>
  )
}

export default WalletsRequestsPage
