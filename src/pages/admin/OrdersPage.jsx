import { Eye, AlertTriangle } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { ORDERS } from '../../lib/mockData.js'

const FILTERS = [
  { label: 'Select Category', options: ['Mechanical parts', 'shoes'] },
  { label: 'Order No', type: 'text' },
  { label: 'From date', type: 'date' },
  { label: 'To date', type: 'date' },
  { label: 'Order Status', options: ['Placed', 'Cancelled'] },
]

const TABLE_HEAD = ['Order #', 'User', 'Supplier', 'Items', 'Total', 'Commission', 'Date', 'Status', 'Actions']

function OrderStatus({ status }) {
  return status === 'Cancelled' ? <Badge tone="success">{status}</Badge> : <span className="text-slate-600">{status}</span>
}

function OrderActions() {
  return (
    <>
      <IconAction icon={Eye} tone="success" aria-label="View order" />
      <IconAction icon={AlertTriangle} tone="warning" aria-label="Flag order" />
    </>
  )
}

function OrdersPage() {
  return (
    <AdminLayout>
      <PageHeader title="Orders" />

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
              {ORDERS.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{order.orderNo}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.user}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.items}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.total.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.commission.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.date}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <OrderStatus status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-0.5">
                      <OrderActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {ORDERS.map((order) => (
            <MobileCard
              key={order.id}
              title={order.orderNo}
              subtitle={order.user}
              badge={<OrderStatus status={order.status} />}
              actions={<OrderActions />}
            >
              <DetailRow label="Supplier" value={order.supplier} />
              <DetailRow label="Items" value={order.items} />
              <DetailRow label="Total" value={order.total.toFixed(2)} />
              <DetailRow label="Commission" value={order.commission.toFixed(2)} />
              <DetailRow label="Date" value={order.date} full />
            </MobileCard>
          ))}
        </div>

        <Pagination from={1} to={ORDERS.length} total={ORDERS.length} prevLabel="Previous" />
      </Card>
    </AdminLayout>
  )
}

export default OrdersPage
