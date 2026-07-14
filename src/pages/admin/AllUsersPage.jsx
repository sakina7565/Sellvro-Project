import { useEffect, useState } from 'react'
import { Wallet, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi } from '../../lib/api.js'

const FILTERS = [{ label: 'All Status', options: ['approved', 'suspended'] }]

const TABLE_HEAD = ['User', 'Wallet', 'Joined', 'Status', 'Actions']

function UserActions({ status }) {
  const isSuspended = status === 'suspended'
  return (
    <>
      <IconAction icon={Wallet} tone="primary" aria-label="View wallet" />
      <IconAction icon={AlertTriangle} tone="warning" aria-label="Warn user" />
      {isSuspended ? (
        <IconAction icon={CheckCircle2} tone="success" aria-label="Reinstate user" />
      ) : (
        <IconAction icon={XCircle} tone="danger" aria-label="Suspend user" />
      )}
    </>
  )
}

function AllUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminApi
      .users()
      .then((data) => {
        if (active) setUsers(data.data || [])
      })
      .catch(() => {
        if (active) setUsers([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const isEmpty = !loading && users.length === 0

  return (
    <AdminLayout>
      <PageHeader title="All Users" />

      <FilterBar filters={FILTERS} />

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
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{user.email}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.wallet}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.status}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-0.5">
                        <UserActions status={user.status} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>}
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No users found.</p>}
          {users.map((user) => (
            <MobileCard key={user.id} title={user.email} actions={<UserActions status={user.status} />}>
              <DetailRow label="Wallet" value={user.wallet} />
              <DetailRow label="Joined" value={user.joined} />
              <DetailRow label="Status" value={user.status} full />
            </MobileCard>
          ))}
        </div>

        <Pagination from={isEmpty ? 0 : 1} to={users.length} total={users.length} page={isEmpty ? 0 : 1} />
      </Card>
    </AdminLayout>
  )
}

export default AllUsersPage
