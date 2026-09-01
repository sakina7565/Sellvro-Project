import { useCallback, useEffect, useState } from 'react'

import { ArrowRight, Check, X, XCircle } from 'lucide-react'

import Badge from '../ui/Badge.jsx'

import DisputeChatPanel from './DisputeChatPanel.jsx'

import { getErrorMessage } from '../../lib/api.js'

import { useAuth } from '../../context/AuthContext.jsx'

import { useDisputeNotifications } from '../../context/DisputeNotificationContext.jsx'

import { usePolling } from '../../hooks/usePolling.js'

import { formatAgainstLabel, formatRaisedByLabel, formatPartySummary } from '../../lib/disputeHelpers.js'



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

        const next = data.dispute || data

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

            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>

            <h2 className="mt-1 text-lg font-semibold text-slate-900">

              {dispute?.orderNo && dispute.orderNo !== '—'

                ? `Order ${dispute.orderNo}`

                : dispute?.order && dispute.order !== '—'

                  ? `Order ${dispute.order}`

                  : 'Dispute'}

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

                {dispute.status === 'open' && (showResolve || showReject) ? (

                  <div className="mt-4 flex flex-wrap gap-2">

                    {showResolve ? (

                      <button

                        type="button"

                        disabled={resolving || rejecting}

                        onClick={handleResolve}

                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"

                      >

                        <Check className="h-3.5 w-3.5" />

                        Mark resolved

                      </button>

                    ) : null}

                    {showReject ? (

                      <button

                        type="button"

                        disabled={resolving || rejecting}

                        onClick={handleReject}

                        className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"

                      >

                        <XCircle className="h-3.5 w-3.5" />

                        Reject

                      </button>

                    ) : null}

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


