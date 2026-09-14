import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, SlidersHorizontal } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'

const FILTER_CONTROL =
  'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-auto sm:min-w-[9rem]'

const TABLE_HEAD = ['Order #', 'Product', 'Price', 'Quantity', 'Status', 'Date', 'Action']

function UserOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let active = true
    orderApi
      .mine()
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

  const openOrder = (order) => {
    setSelectedId(order.id)
    setDrawerOpen(true)
  }

  return (
    <UserLayout>
      <PageHeader
        eyebrow="User Panel"
        title="Orders"
        action={
          <Button as={Link} to="/user/products" size="sm">
            Shop now
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <select defaultValue="" className={`appearance-none ${FILTER_CONTROL}`}>
            <option value="" disabled>
              Select Category -
            </option>
          </select>
          <select defaultValue="" className={`appearance-none ${FILTER_CONTROL}`}>
            <option value="" disabled>
              Product Status -
            </option>
          </select>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
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
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No orders yet.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{order.orderNo}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.product}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">${Number(order.total).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.quantity}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone="success">{order.statusLabel || order.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.date}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <IconAction
                      icon={Eye}
                      tone="success"
                      aria-label="View order"
                      title="View order details"
                      onClick={() => openOrder(order)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {isEmpty && <p className="px-5 py-16 text-center text-sm text-slate-500">No orders yet.</p>}
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => openOrder(order)}
              className="block w-full p-4 text-left hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-800">{order.orderNo}</p>
              <p className="text-sm text-slate-500">{order.product}</p>
              <p className="mt-1 text-sm text-slate-600">${Number(order.total).toFixed(2)}</p>
            </button>
          ))}
        </div>
      </Card>

      <OrderDetailDrawer
        orderId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="My order"
      />
    </UserLayout>
  )
}

export default UserOrdersPage
