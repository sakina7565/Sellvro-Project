import { useEffect, useState } from 'react'
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import AddAccountModal from '../../components/admin/AddAccountModal.jsx'
import EditAccountModal from '../../components/admin/EditAccountModal.jsx'
import DeleteAccountModal from '../../components/admin/DeleteAccountModal.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function AccountsManagementPage() {
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'super_admin' | 'sub_admin'
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState({
    totalAccounts: 0,
    totalStaff: 0,
    totalSuperAdmins: 0,
    totalSubAdmins: 0,
    totalApproved: 0,
    totalSuspended: 0,
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const fetchAccounts = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.accounts({
        role: activeTab,
        status: statusFilter,
        search: debouncedSearch,
        page,
        limit: 25,
      })
      setAccounts(res.data || [])
      setStats(
        res.stats || {
          totalAccounts: 0,
          totalStaff: 0,
          totalSuperAdmins: 0,
          totalSubAdmins: 0,
          totalApproved: 0,
          totalSuspended: 0,
        },
      )
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load staff accounts.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [activeTab, statusFilter, debouncedSearch, page])

  // Quick toggle status (Suspend / Activate)
  const handleToggleStatus = async (account) => {
    const nextStatus = account.status === 'suspended' ? 'approved' : 'suspended'
    const actionName = nextStatus === 'suspended' ? 'suspend' : 'reinstate'
    const confirmed = window.confirm(
      `Are you sure you want to ${actionName} "${account.fullName}"?\n${
        nextStatus === 'suspended'
          ? 'They will be immediately blocked from logging into the administrative portal.'
          : 'Their administrative portal access will be restored.'
      }`,
    )
    if (!confirmed) return

    try {
      await adminApi.updateAccount(account.id, { status: nextStatus })
      fetchAccounts()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update staff status.'))
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge tone="success">Active</Badge>
      case 'suspended':
        return <Badge tone="danger">Suspended</Badge>
      default:
        return <Badge tone="muted">{status}</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <PageHeader
            title="Staff Accounts Management"
            subtitle="Manage internal administrators, sub-admins, and managers. Assign roles, manage permissions, and control access."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
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
            <span>Add Staff Account</span>
          </Button>
        </div>
      </div>

      {/* Metric summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Staff</p>
              <p className="text-xl font-bold text-slate-900">{stats.totalStaff ?? stats.totalAccounts ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Super Admins</p>
              <p className="text-xl font-bold text-purple-700">{stats.totalSuperAdmins ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Sub-Admins</p>
              <p className="text-xl font-bold text-indigo-700">{stats.totalSubAdmins ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Active</p>
              <p className="text-xl font-bold text-emerald-700">{stats.totalApproved ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Suspended</p>
              <p className="text-xl font-bold text-rose-700">{stats.totalSuspended ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main card with tabs, search, and table */}
      <Card className="overflow-hidden shadow-soft">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 pt-4 pb-3">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all')
                setPage(1)
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Staff ({stats.totalStaff ?? stats.totalAccounts ?? 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('super_admin')
                setPage(1)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'super_admin'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Super Admins ({stats.totalSuperAdmins ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('sub_admin')
                setPage(1)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'sub_admin'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Sub-Admins &amp; Managers ({stats.totalSubAdmins ?? 0})</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5 max-w-lg">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search staff by name, email, or role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:border-primary focus:bg-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Desktop Data Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Privileges / Access</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-300" />
                    Loading staff accounts…
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <EmptyState
                  message="No matching staff accounts found."
                  colSpan={6}
                  action={
                    <Button size="sm" variant="outline" onClick={() => setAddModalOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Staff Member
                    </Button>
                  }
                />
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            acc.isSuperAdmin
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {acc.fullName ? acc.fullName.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{acc.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone={acc.isSuperAdmin ? 'solid' : 'primary'}>
                        {acc.roleLabel}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">
                        {acc.isSuperAdmin
                          ? 'Full Root Access (All Permissions)'
                          : `${acc.permissionsCount ?? 0} Permissions Assigned`}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{acc.roleDescription}</p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">{getStatusBadge(acc.status)}</td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">{acc.joined}</td>

                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <IconAction
                          icon={Pencil}
                          tone="primary"
                          aria-label="Edit staff account"
                          onClick={() => {
                            setSelectedAccount(acc)
                            setEditModalOpen(true)
                          }}
                        />

                        {/* Toggle Suspend / Reinstate */}
                        {acc.status === 'suspended' ? (
                          <IconAction
                            icon={CheckCircle2}
                            tone="success"
                            aria-label="Activate staff account"
                            onClick={() => handleToggleStatus(acc)}
                          />
                        ) : (
                          <IconAction
                            icon={XCircle}
                            tone="warning"
                            aria-label="Suspend staff account"
                            onClick={() => handleToggleStatus(acc)}
                          />
                        )}

                        {/* Delete Button */}
                        <IconAction
                          icon={Trash2}
                          tone="danger"
                          aria-label="Delete staff account"
                          onClick={() => {
                            setSelectedAccount(acc)
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

        {/* Mobile View */}
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">Loading staff accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">No staff accounts found.</p>
          ) : (
            accounts.map((acc) => (
              <MobileCard
                key={acc.id}
                title={acc.fullName}
                subtitle={acc.email}
                badge={getStatusBadge(acc.status)}
                actions={
                  <div className="flex items-center gap-2">
                    <IconAction
                      icon={Pencil}
                      tone="primary"
                      aria-label="Edit staff account"
                      onClick={() => {
                        setSelectedAccount(acc)
                        setEditModalOpen(true)
                      }}
                    />
                    <IconAction
                      icon={Trash2}
                      tone="danger"
                      aria-label="Delete staff account"
                      onClick={() => {
                        setSelectedAccount(acc)
                        setDeleteModalOpen(true)
                      }}
                    />
                  </div>
                }
              >
                <DetailRow label="Role" value={acc.roleLabel} />
                <DetailRow
                  label="Permissions"
                  value={acc.isSuperAdmin ? 'Full Root Access' : `${acc.permissionsCount ?? 0} Permissions`}
                />
                <DetailRow label="Joined" value={acc.joined} />
              </MobileCard>
            ))
          )}
        </div>

        {/* Pagination */}
        <Pagination
          from={accounts.length === 0 ? 0 : (page - 1) * pagination.limit + 1}
          to={accounts.length === 0 ? 0 : (page - 1) * pagination.limit + accounts.length}
          total={pagination.total}
          page={page}
          totalPages={pagination.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
        />
      </Card>

      {/* Staff Account Modals */}
      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchAccounts}
        initialRole="admin"
      />

      <EditAccountModal
        isOpen={editModalOpen}
        account={selectedAccount}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedAccount(null)
        }}
        onSuccess={fetchAccounts}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        account={selectedAccount}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedAccount(null)
        }}
        onSuccess={fetchAccounts}
      />
    </AdminLayout>
  )
}

export default AccountsManagementPage
