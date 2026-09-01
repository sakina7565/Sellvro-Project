import { useCallback, useState } from 'react'

import { Check, MessageSquare, XCircle } from 'lucide-react'

import AdminLayout from '../../components/layout/AdminLayout.jsx'

import PageHeader from '../../components/admin/PageHeader.jsx'

import FilterBar from '../../components/admin/FilterBar.jsx'

import EmptyState from '../../components/admin/EmptyState.jsx'

import Card from '../../components/ui/Card.jsx'

import Badge from '../../components/ui/Badge.jsx'

import DisputeDetailDrawer from '../../components/disputes/DisputeDetailDrawer.jsx'

import DisputeLatestMessageCell, {

  DisputeUnreadBadge,

} from '../../components/disputes/DisputeLatestMessageCell.jsx'

import {

  DisputeRaisedByCell,

  DisputeAgainstCell,

  DisputeOrderCell,

  DisputeProductCell,

} from '../../components/disputes/DisputePartyCell.jsx'

import { formatPartySummary, getDisputeStatusMeta } from '../../lib/disputeHelpers.js'

import { adminApi, getErrorMessage } from '../../lib/api.js'

import { useDisputeList } from '../../hooks/useDisputeList.js'



const FILTERS = [{ label: 'All Status', options: ['Open', 'Resolved'] }]

const TABLE_HEAD = ['Raised By', 'Against', 'Order', 'Product', 'Latest reply', 'Date', 'Status', 'Actions']



function SupplierDisputesPage() {

  const loadDisputes = useCallback(() => adminApi.supplierDisputes(), [])

  const { items: disputes, error, setError, loading, loadItems, upsertItem, syncItemUnread } = useDisputeList({

    loadFn: loadDisputes,

  })

  const [busyId, setBusyId] = useState('')

  const [selectedId, setSelectedId] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)



  const handleResolve = async (id) => {

    setBusyId(id)

    try {

      await adminApi.resolveDispute(id)

      await loadItems()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to resolve dispute.'))

    } finally {

      setBusyId('')

    }

  }



  const handleReject = async (id) => {

    setBusyId(id)

    try {

      await adminApi.rejectDispute(id)

      await loadItems()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to reject dispute.'))

    } finally {

      setBusyId('')

    }

  }



  const openChat = (id, event) => {

    event?.stopPropagation?.()

    setSelectedId(id)

    setDrawerOpen(true)

  }



  const isEmpty = !loading && disputes.length === 0



  return (

    <AdminLayout>

      <PageHeader title="Supplier Disputes" />

      <FilterBar filters={FILTERS} />



      {error && (

        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>

      )}



      <Card className="overflow-hidden shadow-soft">

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full min-w-[1100px] text-left text-sm">

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

              {isEmpty ? (

                <EmptyState message="No disputes found." colSpan={TABLE_HEAD.length} />

              ) : (

                disputes.map((dispute) => {

                  const statusMeta = getDisputeStatusMeta(dispute.status)

                  return (

                  <tr

                    key={dispute.id}

                    className={`border-b border-slate-50 last:border-0 ${dispute.hasUnread ? 'bg-primary-50/40' : ''}`}

                  >

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeRaisedByCell dispute={dispute} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeAgainstCell dispute={dispute} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeOrderCell dispute={dispute} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeProductCell dispute={dispute} />

                    </td>

                    <td className="px-5 py-4">

                      <DisputeLatestMessageCell dispute={dispute} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{dispute.date}</td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <div className="flex items-center gap-2">

                        <Badge tone={statusMeta.tone}>

                          {statusMeta.label}

                        </Badge>

                        <DisputeUnreadBadge dispute={dispute} />

                      </div>

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <div className="flex items-center gap-2">

                        <button

                          type="button"

                          onClick={(event) => openChat(dispute.id, event)}

                          className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"

                        >

                          <MessageSquare className="h-3.5 w-3.5" />

                          Chat

                        </button>

                        {dispute.status === 'open' ? (

                          <>

                            <button

                              type="button"

                              disabled={busyId === dispute.id}

                              onClick={() => handleResolve(dispute.id)}

                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"

                            >

                              <Check className="h-3.5 w-3.5" />

                              Resolve

                            </button>

                            <button

                              type="button"

                              disabled={busyId === dispute.id}

                              onClick={() => handleReject(dispute.id)}

                              className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"

                            >

                              <XCircle className="h-3.5 w-3.5" />

                              Reject

                            </button>

                          </>

                        ) : null}

                      </div>

                    </td>

                  </tr>

                )})

              )}

            </tbody>

          </table>

        </div>



        <div className="md:hidden">

          {isEmpty ? (

            <p className="px-5 py-6 text-sm text-slate-500">No disputes found.</p>

          ) : (

            <div className="divide-y divide-slate-100">

              {disputes.map((dispute) => {

                const statusMeta = getDisputeStatusMeta(dispute.status)

                return (

                <div

                  key={dispute.id}

                  className={`p-4 ${dispute.hasUnread ? 'bg-primary-50/40' : ''}`}

                >

                  <div className="flex items-start justify-between gap-2">

                    <p className="text-sm font-semibold text-slate-800">{formatPartySummary(dispute)}</p>

                    <Badge tone={statusMeta.tone}>

                      {statusMeta.label}

                    </Badge>

                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-y-2.5 text-xs">

                    <div>

                      <dt className="text-slate-400">Order</dt>

                      <dd className="mt-0.5 font-medium text-slate-600">{dispute.orderNo || dispute.order}</dd>

                    </div>

                    <div>

                      <dt className="text-slate-400">Product</dt>

                      <dd className="mt-0.5 font-medium text-slate-600">{dispute.product}</dd>

                    </div>

                    <div className="col-span-2">

                      <dt className="text-slate-400">Latest reply</dt>

                      <dd className="mt-0.5">

                        <DisputeLatestMessageCell dispute={dispute} />

                      </dd>

                    </div>

                  </dl>

                  <div className="mt-3 flex gap-2">

                    <button

                      type="button"

                      onClick={(event) => openChat(dispute.id, event)}

                      className="rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700"

                    >

                      Chat

                    </button>

                    {dispute.status === 'open' && (

                      <>

                        <button

                          type="button"

                          onClick={() => handleResolve(dispute.id)}

                          className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"

                        >

                          Resolve

                        </button>

                        <button

                          type="button"

                          onClick={() => handleReject(dispute.id)}

                          className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"

                        >

                          Reject

                        </button>

                      </>

                    )}

                  </div>

                </div>

              )})}

            </div>

          )}

        </div>

      </Card>



      <DisputeDetailDrawer

        disputeId={selectedId}

        open={drawerOpen}

        onClose={() => setDrawerOpen(false)}

        fetchDispute={adminApi.getDispute}

        sendMessage={adminApi.sendDisputeMessage}

        markRead={adminApi.markDisputeRead}

        onUpdated={upsertItem}

        onUnreadSync={syncItemUnread}

        onResolve={adminApi.resolveDispute}

        onReject={adminApi.rejectDispute}

        showResolve

        showReject

        title="Supplier Dispute"

      />

    </AdminLayout>

  )

}



export default SupplierDisputesPage


