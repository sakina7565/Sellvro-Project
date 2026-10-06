import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Eye, XCircle } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import PendingAccountDetailsModal from '../../components/admin/PendingAccountDetailsModal.jsx'
import { adminApi } from '../../lib/api.js'

const FILTERS = [{ label: 'All Status', options: ['Pending', 'approved', 'suspended'] }]

const TABLE_HEAD = ['User & Contact', 'Wallet', 'Location', 'Joined', 'Status', 'Actions']

function PendingUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.pendingUsers()
      setUsers(data.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load pending users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async (id) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.approve(id)
      setSuccess('User application approved successfully!')
      setSelectedUser(null)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to approve user.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.reject(id)
      setSuccess('User application rejected.')
      setSelectedUser(null)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to reject user.')
    } finally {
      setActionLoading(false)
    }
  }

  const isEmpty = !loading && users.length === 0

  return (
    <AdminLayout>
      <PageHeader title="Pending Users" />

      <FilterBar filters={FILTERS} />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Pending User Registrations Awaiting Verification</h2>
        <span className="text-xs text-slate-500 font-medium">Total: {users.length}</span>
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3.5">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></span>
                      Loading pending users…
                    </div>
                  </td>
                </tr>
              ) : isEmpty ? (
                <EmptyState message="No pending users found." colSpan={TABLE_HEAD.length} />
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold text-xs">
                          {(user.fullName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{user.fullName}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">{user.wallet}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 font-medium">{user.location}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500 text-xs">{user.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone="warning">Pending Review</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* View Details Button */}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-600 hover:border-teal-200 transition-all shadow-2xs"
                          title="View complete user details and registration profile"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          View Details
                        </button>

                        {/* Quick Approve Icon */}
                        <IconAction
                          icon={CheckCircle2}
                          tone="success"
                          aria-label="Approve user"
                          title="Approve user immediately"
                          onClick={() => handleApprove(user.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>}
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No users found.</p>}
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <MobileCard
                key={user.id}
                title={user.fullName}
                subtitle={user.email}
                badge={<Badge tone="warning">Pending Review</Badge>}
                actions={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </button>
                    <IconAction
                      icon={CheckCircle2}
                      tone="success"
                      aria-label="Approve user"
                      onClick={() => handleApprove(user.id)}
                    />
                  </div>
                }
              >
                <DetailRow label="Wallet" value={user.wallet} />
                <DetailRow label="Location" value={user.location} />
                <DetailRow label="Joined" value={user.joined} />
              </MobileCard>
            ))}
          </div>
        </div>

        <Pagination from={isEmpty ? 0 : 1} to={users.length} total={users.length} page={isEmpty ? 0 : 1} />
      </Card>

      {/* Interactive Details Modal */}
      <PendingAccountDetailsModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        account={selectedUser}
        onApprove={handleApprove}
        onReject={handleReject}
        actionLoading={actionLoading}
      />
    </AdminLayout>
  )
}

export default PendingUsersPage
