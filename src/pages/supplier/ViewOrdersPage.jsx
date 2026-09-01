import { useEffect, useState } from 'react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'

const FILTERS = [
  { label: 'All Categories' },
  { label: 'Order #', type: 'text' },
  { label: 'All Dates' },
  { label: 'Order Status' },
]

const TABLE_HEAD = ['Order #', 'Customer', 'Product', 'Items', 'Price', 'Commission', 'Date', 'Status']

function SupplierViewOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    orderApi
      .supplier()
      .then((data) => {
        if (active) setOrders(data.data || [])
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load orders.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const isEmpty = !loading && orders.length === 0

  return (
    <SupplierLayout>
      <PageHeader eyebrow="Supplier Panel" title="Orders" />

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
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No Orders Found
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{order.orderNo}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.user}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.product}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.items}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">${Number(order.total).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">${Number(order.commission).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.date}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone="success">{order.statusLabel || order.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {isEmpty && <p className="px-5 py-16 text-center text-sm text-slate-500">No Orders Found</p>}
          {orders.map((order) => (
            <div key={order.id} className="p-4">
              <p className="font-semibold text-slate-800">{order.orderNo}</p>
              <p className="text-sm text-slate-500">{order.user}</p>
              <p className="mt-1 text-sm text-slate-600">
                {order.product} · ${Number(order.total).toFixed(2)}
              </p>
              <Badge className="mt-2" tone="success">
                {order.statusLabel || order.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-sm text-slate-500">
        Showing {orders.length} of {orders.length} orders
      </p>
    </SupplierLayout>
  )
}

export default SupplierViewOrdersPage
