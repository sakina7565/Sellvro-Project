import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

const FILTERS = [
  { label: 'Select Category', options: ['Mechanical parts', 'shoes'] },
  { label: 'Order No', type: 'text' },
  { label: 'From date', type: 'date' },
  { label: 'To date', type: 'date' },
  { label: 'Order Status', options: ['Placed', 'Cancelled'] },
]

const TABLE_HEAD = ['Order #', 'User', 'Supplier', 'Items', 'Total', 'Commission', 'Date', 'Status', 'Actions']

function OrderStatus({ status }) {
  const label = status || '—'
  if (label.toLowerCase() === 'cancelled') return <Badge tone="danger">{label}</Badge>
  if (label.toLowerCase() === 'placed') return <Badge tone="success">{label}</Badge>
  if (label.toLowerCase().includes('process')) return <Badge tone="warning">{label}</Badge>
  return <span className="text-slate-600">{label}</span>
}

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadOrders = async () => {
    setError('')
    try {
      const data = await adminApi.orders()
      setOrders(data.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load orders.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  return (
    <AdminLayout>
      <PageHeader title="Orders" />

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
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    No orders yet.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{order.orderNo}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.user}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.items}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{Number(order.total).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{Number(order.commission).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.date}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <OrderStatus status={order.statusLabel || order.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-0.5">
                      <IconAction icon={Eye} tone="success" aria-label="View order" title={order.product} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {orders.map((order) => (
            <MobileCard
              key={order.id}
              title={order.orderNo}
              subtitle={order.user}
              badge={<OrderStatus status={order.statusLabel || order.status} />}
              actions={<IconAction icon={Eye} tone="success" aria-label="View order" />}
            >
              <DetailRow label="Supplier" value={order.supplier} />
              <DetailRow label="Items" value={order.items} />
              <DetailRow label="Total" value={Number(order.total).toFixed(2)} />
              <DetailRow label="Commission" value={Number(order.commission).toFixed(2)} />
              <DetailRow label="Date" value={order.date} full />
            </MobileCard>
          ))}
        </div>

        <Pagination from={orders.length ? 1 : 0} to={orders.length} total={orders.length} prevLabel="Previous" />
      </Card>
    </AdminLayout>
  )
}

export default OrdersPage
