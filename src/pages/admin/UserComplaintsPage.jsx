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



function UserComplaintsPage() {

  const loadComplaints = useCallback(() => adminApi.userComplaints(), [])

  const { items: complaints, error, setError, loading, loadItems, upsertItem, syncItemUnread } = useDisputeList({

    loadFn: loadComplaints,

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

      setError(getErrorMessage(err, 'Failed to resolve complaint.'))

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

      setError(getErrorMessage(err, 'Failed to reject complaint.'))

    } finally {

      setBusyId('')

    }

  }



  const openChat = (id, event) => {

    event?.stopPropagation?.()

    setSelectedId(id)

    setDrawerOpen(true)

  }



  const isEmpty = !loading && complaints.length === 0



  return (

    <AdminLayout>

      <PageHeader title="User Complaints" />

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

                <EmptyState message="No complaints found." colSpan={TABLE_HEAD.length} />

              ) : (

                complaints.map((complaint) => {

                  const statusMeta = getDisputeStatusMeta(complaint.status)

                  return (

                  <tr

                    key={complaint.id}

                    className={`border-b border-slate-50 last:border-0 ${complaint.hasUnread ? 'bg-primary-50/40' : ''}`}

                  >

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeRaisedByCell dispute={complaint} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeAgainstCell dispute={complaint} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeOrderCell dispute={complaint} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <DisputeProductCell dispute={complaint} />

                    </td>

                    <td className="px-5 py-4">

                      <DisputeLatestMessageCell dispute={complaint} />

                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{complaint.date}</td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <div className="flex items-center gap-2">

                        <Badge tone={statusMeta.tone}>

                          {statusMeta.label}

                        </Badge>

                        <DisputeUnreadBadge dispute={complaint} />

                      </div>

                    </td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <div className="flex items-center gap-2">

                        <button

                          type="button"

                          onClick={(event) => openChat(complaint.id, event)}

                          className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"

                        >

                          <MessageSquare className="h-3.5 w-3.5" />

                          Chat

                        </button>

                        {complaint.status === 'open' ? (

                          <>

                            <button

                              type="button"

                              disabled={busyId === complaint.id}

                              onClick={() => handleResolve(complaint.id)}

                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"

                            >

                              <Check className="h-3.5 w-3.5" />

                              Resolve

                            </button>

                            <button

                              type="button"

                              disabled={busyId === complaint.id}

                              onClick={() => handleReject(complaint.id)}

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

            <p className="px-5 py-6 text-sm text-slate-500">No complaints found.</p>

          ) : (

            <div className="divide-y divide-slate-100">

              {complaints.map((complaint) => {

                const statusMeta = getDisputeStatusMeta(complaint.status)

                return (

                <div

                  key={complaint.id}

                  className={`p-4 ${complaint.hasUnread ? 'bg-primary-50/40' : ''}`}

                >

                  <div className="flex items-start justify-between gap-2">

                    <p className="text-sm font-semibold text-slate-800">{formatPartySummary(complaint)}</p>

                    <Badge tone={statusMeta.tone}>

                      {statusMeta.label}

                    </Badge>

                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-y-2.5 text-xs">

                    <div>

                      <dt className="text-slate-400">Order</dt>

                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.orderNo || complaint.order}</dd>

                    </div>

                    <div>

                      <dt className="text-slate-400">Product</dt>

                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.product}</dd>

                    </div>

                    <div className="col-span-2">

                      <dt className="text-slate-400">Latest reply</dt>

                      <dd className="mt-0.5">

                        <DisputeLatestMessageCell dispute={complaint} />

                      </dd>

                    </div>

                  </dl>

                  <div className="mt-3 flex gap-2">

                    <button

                      type="button"

                      onClick={(event) => openChat(complaint.id, event)}

                      className="rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700"

                    >

                      Chat

                    </button>

                    {complaint.status === 'open' && (

                      <>

                        <button

                          type="button"

                          onClick={() => handleResolve(complaint.id)}

                          className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"

                        >

                          Resolve

                        </button>

                        <button

                          type="button"

                          onClick={() => handleReject(complaint.id)}

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

        title="User Complaint"

      />

    </AdminLayout>

  )

}



export default UserComplaintsPage


