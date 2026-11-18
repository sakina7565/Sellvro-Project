import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, Clock, DollarSign, MapPin, Package, Store, User as UserIcon, X, XCircle } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import DisputeChatPanel from './DisputeChatPanel.jsx'
import { getErrorMessage, orderApi } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'
import { usePolling } from '../../hooks/usePolling.js'
import { formatAgainstLabel, formatRaisedByLabel, formatPartySummary } from '../../lib/disputeHelpers.js'
import { formatDisputeId } from '../../lib/idFormatters.js'



export default function DisputeDetailDrawer({

  disputeId,

  open,

  onClose,

  fetchDispute,

  sendMessage,

  markRead,

  onResolve,

  onReject,

  onUpdated,

  onUnreadSync,

  showResolve = false,

  showReject = false,

  title = 'Dispute Details',

}) {

  const { user } = useAuth()

  const { refreshUnreadCount } = useDisputeNotifications()

  const [dispute, setDispute] = useState(null)

  const [loading, setLoading] = useState(false)

  const [sending, setSending] = useState(false)

  const [resolving, setResolving] = useState(false)

  const [rejecting, setRejecting] = useState(false)

  const [error, setError] = useState('')



  const loadDispute = useCallback(

    async ({ silent = false, syncList = !silent } = {}) => {

      if (!disputeId) return null

      if (!silent) {

        setLoading(true)

        setError('')

      }

      try {

        const data = await fetchDispute(disputeId)

        let next = data.dispute || data

        if (next && !next.orderDetails && (next.orderId || (next.order && next.order !== '—'))) {
          try {
            const ordData = await orderApi.lookup(next.orderId || next.order)
            const o = ordData.order || ordData
            if (o && o.orderNo) {
              const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0
              const diffMs = orderTime ? Date.now() - orderTime : 0
              next = {
                ...next,
                orderDetails: {
                  id: o.id || '',
                  orderNo: o.orderNo || '',
                  trackingNumber: o.trackingNumber || 'Pending Courier Handover',
                  carrier: o.carrier || 'FedEx',
                  status: o.status || '',
                  total: Number(o.total || 0),
                  unitPrice: Number(o.unitPrice || 0),
                  quantity: Number(o.quantity || 1),
                  commission: Number(o.commission || 0),
                  productName: o.productName || o.product || '—',
                  productSku: o.productSku || '',
                  shippingAddress: o.shippingAddress || {},
                  user: {
                    name: o.user || 'Customer',
                    email: o.userEmail || '',
                    phone: o.shippingAddress?.phone || '',
                    displayId: o.userDisplayId || '',
                  },
                  supplier: {
                    name: o.supplier || 'Supplier',
                    email: o.supplierEmail || '',
                    displayId: o.supplierDisplayId || '',
                  },
                  createdAt: o.createdAt,
                  cancellationRequest: o.cancellationRequest || null,
                  isWithin12Hours: orderTime ? diffMs <= 12 * 60 * 60 * 1000 : false,
                  hoursElapsed: orderTime ? Number((diffMs / (1000 * 60 * 60)).toFixed(1)) : 0,
                },
              }
            }
          } catch {
            // silent fallback
          }
        }

        setDispute(next)

        if (syncList) onUpdated?.(next)

        return next

      } catch (err) {

        if (!silent) {

          setError(getErrorMessage(err, 'Failed to load dispute.'))

        }

        return null

      } finally {

        if (!silent) setLoading(false)

      }

    },

    [disputeId, fetchDispute, onUpdated],

  )



  useEffect(() => {

    if (!open || !disputeId) {

      if (!open) {

        setDispute(null)

        setError('')

      }

      return undefined

    }

    let cancelled = false

    ;(async () => {

      const loaded = await loadDispute()

      if (cancelled || !loaded || !markRead) return

      try {

        const data = await markRead(disputeId)

        if (cancelled) return

        const next = data.dispute || data

        if (next?.id) {

          setDispute((prev) =>

            prev ? { ...prev, hasUnread: false, unreadCount: 0, latestMessage: next.latestMessage ?? prev.latestMessage } : next,

          )

          if (onUnreadSync) {

            onUnreadSync(next.id, {

              hasUnread: false,

              unreadCount: 0,

              latestMessage: next.latestMessage,

            })

          }

        }

        refreshUnreadCount()

      } catch (err) {

        if (import.meta.env.DEV) {

          console.warn('markDisputeRead failed:', err)

        }

      }

    })()

    return () => {

      cancelled = true

    }

  }, [open, disputeId, loadDispute, markRead, onUnreadSync, refreshUnreadCount])



  usePolling(

    () => {

      if (open && disputeId) loadDispute({ silent: true, syncList: false })

    },

    4000,

    open && Boolean(disputeId),

  )



  const handleSend = async (text) => {

    setSending(true)

    setError('')

    try {

      const data = await sendMessage(disputeId, text)

      const next = data.dispute || data

      setDispute(next)

      onUpdated?.(next)

      refreshUnreadCount()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to send message.'))

    } finally {

      setSending(false)

    }

  }



  const handleResolve = async () => {

    if (!onResolve) return

    setResolving(true)

    setError('')

    try {

      await onResolve(disputeId)

      await loadDispute()

      refreshUnreadCount()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to resolve dispute.'))

    } finally {

      setResolving(false)

    }

  }



  const handleReject = async () => {

    if (!onReject) return

    setRejecting(true)

    setError('')

    try {

      const data = await onReject(disputeId)

      const next = data.dispute || data

      if (next?.id) {

        setDispute(next)

        onUpdated?.(next)

      } else {

        await loadDispute()

      }

      refreshUnreadCount()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to reject dispute.'))

    } finally {

      setRejecting(false)

    }

  }



  const statusTone =

    dispute?.status === 'resolved' ? 'success' : dispute?.status === 'rejected' ? 'danger' : 'warning'

  const statusLabel =

    dispute?.status === 'resolved' ? 'Resolved' : dispute?.status === 'rejected' ? 'Rejected' : 'Open'

  const isAdminViewer = showResolve || user?.role === 'admin'

  const adminCanReply = isAdminViewer && dispute?.status === 'open'



  if (!open) return null



  return (

    <div className="fixed inset-0 z-50 flex justify-end">

      <button

        type="button"

        aria-label="Close dispute panel"

        className="absolute inset-0 bg-slate-900/30"

        onClick={onClose}

      />

      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
              {dispute && (
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {formatDisputeId(dispute)}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {dispute?.orderNo && dispute.orderNo !== '—'
                ? `Order ${dispute.orderNo}`
                : dispute?.order && dispute.order !== '—'
                  ? `Order ${dispute.order}`
                  : `Dispute ${formatDisputeId(dispute)}`}
            </h2>
          </div>

          <button

            type="button"

            onClick={onClose}

            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"

          >

            <X className="h-5 w-5" />

          </button>

        </div>



        <div className="flex-1 overflow-y-auto px-5 py-4">

          {loading ? (

            <p className="text-sm text-slate-500">Loading dispute…</p>

          ) : dispute ? (

            <div className="space-y-4">

              <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Dispute parties</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">

                  <span className="rounded-lg bg-white px-3 py-2 font-semibold text-slate-800 shadow-sm">

                    {formatRaisedByLabel(dispute)}

                  </span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />

                  <span className="text-xs font-medium text-primary-700">complained against</span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />

                  <span className="rounded-lg bg-white px-3 py-2 font-semibold text-slate-800 shadow-sm">

                    {formatAgainstLabel(dispute)}

                  </span>

                </div>

                <p className="mt-2 text-xs text-primary-700">{formatPartySummary(dispute)}</p>

              </div>



              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">

                <div className="mb-3 flex items-center justify-between gap-2">

                  <Badge tone={statusTone}>

                    {statusLabel}

                  </Badge>

                  <span className="text-xs text-slate-400">{dispute.date}</span>

                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">

                  <div>

                    <dt className="text-slate-400">Order</dt>

                    <dd className="mt-0.5 font-medium text-slate-700">

                      {dispute.orderNo || dispute.order}

                      {dispute.orderId ? (

                        <span className="mt-0.5 block text-[10px] text-slate-400">ID: {dispute.orderId}</span>

                      ) : null}

                    </dd>

                  </div>

                  <div>

                    <dt className="text-slate-400">Product</dt>

                    <dd className="mt-0.5 font-medium text-slate-700">

                      {dispute.product}

                      {dispute.productId ? (

                        <span className="mt-0.5 block text-[10px] text-slate-400">ID: {dispute.productId}</span>

                      ) : null}

                    </dd>

                  </div>

                  <div className="col-span-2">
                    <dt className="text-slate-400">Initial request</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">{dispute.requests}</dd>
                  </div>
                </dl>

                {/* Complete Order Details Section for Admin & Viewer */}
                {dispute.orderDetails ? (() => {
                  const o = dispute.orderDetails
                  const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0
                  const diffMs = orderTime ? Date.now() - orderTime : 0
                  const totalMinutesLimit = 12 * 60
                  const totalMinutesElapsed = Math.floor(diffMs / (1000 * 60))
                  const is12hExpired = totalMinutesElapsed >= totalMinutesLimit
                  const hoursElapsed = (diffMs / (1000 * 60 * 60)).toFixed(1)
                  const remainingMins = Math.max(0, totalMinutesLimit - totalMinutesElapsed)
                  const remHours = Math.floor(remainingMins / 60)
                  const remMins = remainingMins % 60
                  const isCancellation = dispute.type === 'order_cancellation' || o.cancellationRequest?.isRequested || o.status === 'cancellation_pending'

                  return (
                    <div className="mt-4 rounded-xl border border-indigo-200 bg-slate-50/70 p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-indigo-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                            Complete Order &amp; Parcel Information
                          </h4>
                        </div>
                        <span className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded font-bold ${is12hExpired ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                          <Clock className="h-3 w-3" />
                          {is12hExpired ? `12h Limit Expired (${hoursElapsed}h)` : `${remHours}h ${remMins}m left in 12h policy`}
                        </span>
                      </div>

                      {/* Prominent Cancellation Reason Banner */}
                      {isCancellation && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs">
                          <span className="block text-[10px] font-bold uppercase text-amber-800">
                            Cancellation Reason Provided by {dispute.fromLabel || 'Requester'}
                          </span>
                          <p className="mt-1 font-semibold text-slate-900 italic">
                            &quot;{dispute.message || dispute.requests || o.cancellationRequest?.reason}&quot;
                          </p>
                        </div>
                      )}

                      {/* Order & Tracking Summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Order Number / ID</span>
                          <strong className="font-mono text-indigo-700">#{o.orderNo}</strong>
                          <span className="block text-[10px] text-slate-400">ID: {o.id}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Tracking Number</span>
                          <strong className="font-mono text-slate-800">{o.trackingNumber || 'Pending Courier Handover'}</strong>
                          <span className="block text-[10px] text-slate-400">Carrier: {o.carrier || 'FedEx'}</span>
                        </div>
                      </div>

                      {/* Customer Details & Supplier Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                        <div className="rounded-lg bg-white p-2 border border-slate-200">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                            <UserIcon className="h-3 w-3 text-indigo-600" /> Customer Details
                          </div>
                          <p className="mt-1 font-bold text-slate-800">{o.user?.name || 'Customer'}</p>
                          <p className="text-[11px] text-slate-600">{o.user?.email || '—'}</p>
                          <p className="text-[11px] text-slate-600">Phone: {o.user?.phone || '—'}</p>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-200">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                            <Store className="h-3 w-3 text-amber-600" /> Supplier Details
                          </div>
                          <p className="mt-1 font-bold text-slate-800">{o.supplier?.name || 'Supplier'}</p>
                          <p className="text-[11px] text-slate-600">{o.supplier?.storeName ? `Store: ${o.supplier.storeName}` : (o.supplier?.email || '—')}</p>
                          <p className="text-[11px] text-slate-600">Phone: {o.supplier?.phone || '—'}</p>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="rounded-lg bg-white p-2 border border-slate-200 text-xs">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                          <MapPin className="h-3 w-3 text-rose-600" /> Delivery Address (Parcel Destination)
                        </div>
                        <div className="mt-1 text-slate-700">
                          {o.shippingAddress?.fullName ? (
                            <>
                              <strong className="block text-slate-900">{o.shippingAddress.fullName} {o.shippingAddress.phone ? `(${o.shippingAddress.phone})` : ''}</strong>
                              <span>{o.shippingAddress.addressLine}, {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.postalCode}, {o.shippingAddress.country}</span>
                            </>
                          ) : 'No delivery address recorded.'}
                        </div>
                      </div>

                      {/* Parcel Value / Financial breakdown */}
                      <div className="rounded-lg bg-white p-2 border border-slate-200 text-xs">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                          <DollarSign className="h-3 w-3 text-emerald-600" /> Parcel Value &amp; Financials
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded bg-slate-50 p-1">
                            <span className="block text-[10px] text-slate-400">Unit Price</span>
                            <strong className="text-slate-800">${Number(o.unitPrice || 0).toFixed(2)}</strong>
                          </div>
                          <div className="rounded bg-slate-50 p-1">
                            <span className="block text-[10px] text-slate-400">Qty</span>
                            <strong className="text-slate-800">{o.quantity}</strong>
                          </div>
                          <div className="rounded bg-emerald-50 p-1">
                            <span className="block text-[10px] text-emerald-700 font-bold">Total Value</span>
                            <strong className="text-emerald-800 font-black">${Number(o.total || 0).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Strict 12-Hour Warning if Expired */}
                      {is12hExpired && isCancellation && (
                        <div className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800 font-medium">
                          ⚠️ <strong>Strict Policy Warning:</strong> This order was placed {hoursElapsed} hours ago. Platform policy strictly prohibits cancelling orders after 12 hours. Admin cannot approve cancellation.
                        </div>
                      )}
                    </div>
                  )
                })() : null}

                {dispute.status === 'open' && (showResolve || showReject) ? (
                  <div className="mt-4 space-y-2">
                    {/* If cancellation dispute and 12-hour expired */}
                    {dispute.orderDetails?.isWithin12Hours === false && (dispute.type === 'order_cancellation' || dispute.orderDetails?.cancellationRequest?.isRequested) && (
                      <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                        Approval Blocked: 12-hour cancellation policy has expired. This order cannot be cancelled.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {showResolve ? (
                        <button
                          type="button"
                          disabled={resolving || rejecting || (dispute.orderDetails?.isWithin12Hours === false && (dispute.type === 'order_cancellation' || dispute.orderDetails?.cancellationRequest?.isRequested))}
                          onClick={handleResolve}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {dispute.type === 'order_cancellation' ? 'Approve Cancellation (100% Refund)' : 'Mark resolved'}
                        </button>
                      ) : null}

                      {showReject ? (
                        <button
                          type="button"
                          disabled={resolving || rejecting}
                          onClick={handleReject}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 shadow-2xs"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {dispute.type === 'order_cancellation' ? 'Reject Cancellation Request' : 'Reject'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

              </div>



              <DisputeChatPanel

                dispute={dispute}

                currentUserId={user?.id || user?._id || ''}

                onSend={handleSend}

                sending={sending}

                error={error}

                canReply={adminCanReply}

              />

            </div>

          ) : (

            <p className="text-sm text-slate-500">{error || 'Dispute not found.'}</p>

          )}

        </div>

      </aside>

    </div>

  )

}


