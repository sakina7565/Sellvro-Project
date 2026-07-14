import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
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
import { adminApi } from '../../lib/api.js'

const FILTERS = [{ label: 'All Status', options: ['Pending', 'approved', 'suspended'] }]

const TABLE_HEAD = ['User', 'Wallet', 'Location', 'Joined', 'Status', 'Actions']

function PendingUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    try {
      await adminApi.approve(id)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to approve user.')
    }
  }

  const isEmpty = !loading && users.length === 0

  return (
    <AdminLayout>
      <PageHeader title="Pending Users" />

      <FilterBar filters={FILTERS} />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-900">Registered Users</h2>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
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
              {loading ? (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : isEmpty ? (
                <EmptyState message="No users found." colSpan={TABLE_HEAD.length} />
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-medium text-slate-800">{user.fullName}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.wallet}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.location}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone="warning">{user.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <IconAction
                        icon={CheckCircle2}
                        tone="success"
                        aria-label="Approve user"
                        onClick={() => handleApprove(user.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>}
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No users found.</p>}
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <MobileCard
                key={user.id}
                title={user.fullName}
                subtitle={user.email}
                badge={<Badge tone="warning">{user.status}</Badge>}
                actions={
                  <IconAction
                    icon={CheckCircle2}
                    tone="success"
                    aria-label="Approve user"
                    onClick={() => handleApprove(user.id)}
                  />
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
    </AdminLayout>
  )
}

export default PendingUsersPage
