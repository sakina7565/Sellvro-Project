import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { orderApi, getErrorMessage } from '../../lib/api.js'
import { formatShippingAddress, hasShippingAddress } from '../../lib/orderHelpers.js'

function UserOrderConfirmationPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(location.state?.order || null)
  const [message, setMessage] = useState(location.state?.message || 'Order placed successfully.')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!location.state?.order)

  useEffect(() => {
    if (order?.id === orderId) {
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    orderApi
      .lookup(orderId)
      .then((data) => {
        if (active) setOrder(data.order || data)
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load order.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orderId, order?.id])

  const shipping = order?.shippingAddress

  return (
    <UserLayout>
      <PageHeader eyebrow="User Panel" title="Order confirmation" />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">Loading order…</Card>
      ) : !order ? (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">
          Order not found.{' '}
          <Link to="/user/orders" className="font-semibold text-primary">
            View orders
          </Link>
        </Card>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="p-6 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">Thank you!</h2>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
            <p className="mt-3 text-sm font-semibold text-slate-800">Order {order.orderNo}</p>
            <Badge className="mt-2" tone="success">
              {order.statusLabel || order.status}
            </Badge>
          </Card>

          <Card className="space-y-4 p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Product</p>
                <p className="mt-1 font-semibold text-slate-800">{order.product}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total paid</p>
                <p className="mt-1 text-lg font-bold text-slate-900">${Number(order.total || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Quantity</p>
                <p className="font-medium text-slate-700">{order.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Unit price</p>
                <p className="font-medium text-slate-700">${Number(order.unitPrice || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Date</p>
                <p className="font-medium text-slate-700">{order.date}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ship to</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {hasShippingAddress(shipping) ? formatShippingAddress(shipping) : '—'}
              </p>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button as={Link} to="/user/orders" size="sm">
              View my orders
            </Button>
            <Button as={Link} to="/user/products" variant="outline" size="sm">
              Continue shopping
            </Button>
          </div>
        </div>
      )}
    </UserLayout>
  )
}

export default UserOrderConfirmationPage
