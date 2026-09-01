import { useCallback, useState } from 'react'

import { MessageSquare, Plus, SlidersHorizontal } from 'lucide-react'

import UserLayout from '../../components/layout/UserLayout.jsx'

import PageHeader from '../../components/admin/PageHeader.jsx'

import Card from '../../components/ui/Card.jsx'

import Badge from '../../components/ui/Badge.jsx'

import Button from '../../components/ui/Button.jsx'

import EmptyState from '../../components/admin/EmptyState.jsx'

import CreateDisputeForm from '../../components/disputes/CreateDisputeForm.jsx'

import DisputeDetailDrawer from '../../components/disputes/DisputeDetailDrawer.jsx'

import DisputeLatestMessageCell, {

  DisputeUnreadBadge,

} from '../../components/disputes/DisputeLatestMessageCell.jsx'

import {
  DisputeAgainstCell,
  DisputeOrderCell,
  DisputeProductCell,
} from '../../components/disputes/DisputePartyCell.jsx'

import { formatPartySummary } from '../../lib/disputeHelpers.js'

import { disputeApi, getErrorMessage } from '../../lib/api.js'

import { useDisputeList } from '../../hooks/useDisputeList.js'



const FILTER_CONTROL =

  'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-auto sm:min-w-[9rem]'



const TABLE_HEAD = ['Against', 'Order', 'Product', 'Latest reply', 'Status', 'Date', 'Actions']



const AGAINST_OPTIONS = [

  { value: 'admin', label: 'Admin / Platform' },

  { value: 'supplier', label: 'Supplier' },

]



function UserDisputesPage() {

  const loadDisputes = useCallback(() => disputeApi.mine(), [])

  const { items: disputes, error, setError, loading, loadItems, upsertItem } = useDisputeList({

    loadFn: loadDisputes,

  })

  const [selectedId, setSelectedId] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)

  const [showCreate, setShowCreate] = useState(false)

  const [creating, setCreating] = useState(false)



  const openChat = (id) => {

    setSelectedId(id)

    setDrawerOpen(true)

  }



  const handleCreate = async (payload) => {

    setCreating(true)

    setError('')

    try {

      await disputeApi.create(payload)

      setShowCreate(false)

      await loadItems()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to create dispute.'))

    } finally {

      setCreating(false)

    }

  }



  const isEmpty = !loading && disputes.length === 0



  return (

    <UserLayout>

      <PageHeader

        eyebrow="User Panel"

        title="Disputes"

        action={

          <Button size="sm" onClick={() => setShowCreate((value) => !value)}>

            <Plus className="mr-1 h-4 w-4" />

            New dispute

          </Button>

        }

      />



      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">

        <div className="flex flex-wrap items-center gap-3">

          <select defaultValue="" className={`appearance-none ${FILTER_CONTROL}`}>

            <option value="" disabled>

              Status -

            </option>

            <option value="open">Open</option>

            <option value="resolved">Resolved</option>

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



      {showCreate && (

        <Card className="mb-5 p-4 shadow-soft">

          <CreateDisputeForm

            disputeType="user_complaint"

            againstOptions={AGAINST_OPTIONS}

            onSubmit={handleCreate}

            creating={creating}

            onCancel={() => setShowCreate(false)}

          />

        </Card>

      )}



      {error && (

        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>

      )}



      <Card className="overflow-hidden shadow-soft">

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full min-w-[980px] text-left text-sm">

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

                <EmptyState message="No disputes yet." colSpan={TABLE_HEAD.length} />

              ) : (

                disputes.map((dispute) => (

                  <tr

                    key={dispute.id}

                    className={`border-b border-slate-50 last:border-0 ${dispute.hasUnread ? 'bg-primary-50/40' : ''}`}

                  >

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

                    <td className="whitespace-nowrap px-5 py-4">

                      <div className="flex items-center gap-2">

                        <Badge tone={dispute.status === 'resolved' ? 'success' : 'warning'}>

                          {dispute.status === 'resolved' ? 'Resolved' : 'Open'}

                        </Badge>

                        <DisputeUnreadBadge dispute={dispute} />

                      </div>

                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{dispute.date}</td>

                    <td className="whitespace-nowrap px-5 py-4">

                      <button

                        type="button"

                        onClick={() => openChat(dispute.id)}

                        className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"

                      >

                        <MessageSquare className="h-3.5 w-3.5" />

                        {dispute.hasUnread ? 'View reply' : 'Chat'}

                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>



        <div className="md:hidden divide-y divide-slate-100">

          {isEmpty ? (

            <p className="px-5 py-6 text-sm text-slate-500">No disputes yet.</p>

          ) : (

            disputes.map((dispute) => (

              <div

                key={dispute.id}

                className={`p-4 ${dispute.hasUnread ? 'bg-primary-50/40' : ''}`}

              >

                <div className="flex items-start justify-between gap-2">

                  <div className="min-w-0">

                    <p className="text-sm font-semibold text-slate-800">{formatPartySummary(dispute)}</p>

                    <p className="mt-1 text-xs text-slate-500">

                      {dispute.orderNo || dispute.order} · {dispute.product}

                    </p>

                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">

                    <Badge tone={dispute.status === 'resolved' ? 'success' : 'warning'}>

                      {dispute.status === 'resolved' ? 'Resolved' : 'Open'}

                    </Badge>

                    <DisputeUnreadBadge dispute={dispute} />

                  </div>

                </div>

                <div className="mt-3">

                  <DisputeLatestMessageCell dispute={dispute} />

                </div>

                <button

                  type="button"

                  onClick={() => openChat(dispute.id)}

                  className="mt-3 rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700"

                >

                  {dispute.hasUnread ? 'View reply' : 'Open chat'}

                </button>

              </div>

            ))

          )}

        </div>

      </Card>



      <DisputeDetailDrawer

        disputeId={selectedId}

        open={drawerOpen}

        onClose={() => setDrawerOpen(false)}

        fetchDispute={disputeApi.get}

        sendMessage={disputeApi.sendMessage}

        markRead={disputeApi.markRead}

        onUpdated={upsertItem}

        title="My Dispute"

      />

    </UserLayout>

  )

}



export default UserDisputesPage


