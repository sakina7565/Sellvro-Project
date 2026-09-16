import { useEffect, useState } from 'react'
import { Plus, LogIn, Pencil, Trash2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import AddAccountModal from '../../components/admin/AddAccountModal.jsx'
import EditAccountModal from '../../components/admin/EditAccountModal.jsx'
import DeleteAccountModal from '../../components/admin/DeleteAccountModal.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

const FILTERS = [{ label: 'All Status', options: ['approved', 'suspended'] }]
const TABLE_HEAD = ['User', 'Wallet', 'Joined', 'Status', 'Actions']

function AllUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.accounts({ role: 'user' })
      setUsers(res.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleImpersonate = async (user) => {
    const confirmed = window.confirm(
      `Login as "${user.fullName}" (Customer)?\n\nYou will be redirected to the customer dashboard in Admin Impersonation Mode.`,
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await adminApi.impersonate(user.id)
      window.location.href = res.redirectUrl || '/user/dashboard'
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to login as user.'))
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'suspended' ? 'approved' : 'suspended'
    try {
      await adminApi.updateAccount(user.id, { status: nextStatus })
      loadUsers()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update user status.'))
    }
  }

  const isEmpty = !loading && users.length === 0

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <PageHeader title="All Users" subtitle="Manage registered customers, view wallet balances, and login directly." />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

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
                  <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      <div>
                        <p className="font-semibold text-slate-900">{user.fullName}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                      ${user.walletBalance?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone={user.status === 'approved' ? 'success' : user.status === 'suspended' ? 'danger' : 'warning'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleImpersonate(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white disabled:opacity-50 cursor-pointer shadow-2xs"
                          title={`Log in as ${user.fullName}`}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Login As</span>
                        </button>

                        <IconAction
                          icon={Pencil}
                          tone="primary"
                          aria-label="Edit user"
                          onClick={() => {
                            setSelectedUser(user)
                            setEditModalOpen(true)
                          }}
                        />

                        {user.status === 'suspended' ? (
                          <IconAction
                            icon={CheckCircle2}
                            tone="success"
                            aria-label="Reinstate user"
                            onClick={() => handleToggleStatus(user)}
                          />
                        ) : (
                          <IconAction
                            icon={XCircle}
                            tone="danger"
                            aria-label="Suspend user"
                            onClick={() => handleToggleStatus(user)}
                          />
                        )}

                        <IconAction
                          icon={Trash2}
                          tone="danger"
                          aria-label="Delete user"
                          onClick={() => {
                            setSelectedUser(user)
                            setDeleteModalOpen(true)
                          }}
                        />
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
            <MobileCard
              key={user.id}
              title={user.fullName}
              subtitle={user.email}
              badge={
                <Badge tone={user.status === 'approved' ? 'success' : user.status === 'suspended' ? 'danger' : 'warning'}>
                  {user.status}
                </Badge>
              }
              actions={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleImpersonate(user)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-bold text-white shadow-xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Login As</span>
                  </button>
                  <IconAction
                    icon={Pencil}
                    tone="primary"
                    aria-label="Edit user"
                    onClick={() => {
                      setSelectedUser(user)
                      setEditModalOpen(true)
                    }}
                  />
                  <IconAction
                    icon={Trash2}
                    tone="danger"
                    aria-label="Delete user"
                    onClick={() => {
                      setSelectedUser(user)
                      setDeleteModalOpen(true)
                    }}
                  />
                </div>
              }
            >
              <DetailRow label="Wallet" value={`$${user.walletBalance?.toFixed(2) ?? '0.00'}`} />
              <DetailRow label="Joined" value={user.joined} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={isEmpty ? 0 : 1} to={users.length} total={users.length} page={isEmpty ? 0 : 1} />
      </Card>

      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadUsers}
        initialRole="user"
      />

      <EditAccountModal
        isOpen={editModalOpen}
        account={selectedUser}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedUser(null)
        }}
        onSuccess={loadUsers}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        account={selectedUser}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedUser(null)
        }}
        onSuccess={loadUsers}
      />
    </AdminLayout>
  )
}

export default AllUsersPage
