import { useEffect, useState } from 'react'
import {
  Users,
  Building2,
  User,
  Plus,
  Search,
  LogIn,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  MapPin,
  DollarSign,
  ShoppingBag,
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
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'supplier' | 'user'
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState({
    totalAccounts: 0,
    totalSuppliers: 0,
    totalUsers: 0,
    totalApproved: 0,
    totalSuspended: 0,
    totalPending: 0,
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
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
          totalSuppliers: 0,
          totalUsers: 0,
          totalApproved: 0,
          totalSuspended: 0,
          totalPending: 0,
        },
      )
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load accounts.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [activeTab, statusFilter, debouncedSearch, page])

  // Impersonate / Login-As action
  const handleImpersonate = async (account) => {
    const roleTitle = account.role === 'supplier' ? 'Supplier' : 'Customer'
    const confirmed = window.confirm(
      `Login as "${account.fullName}" (${roleTitle})?\n\nYou will be redirected to their portal in Admin Impersonation Mode. You can return to Admin anytime via the banner at the top.`,
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await adminApi.impersonate(account.id)
      window.location.href = res.redirectUrl || (account.role === 'supplier' ? '/supplier/dashboard' : '/user/dashboard')
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to initiate login.'))
      setActionLoading(false)
    }
  }

  // Quick toggle status (Suspend / Activate)
  const handleToggleStatus = async (account) => {
    const nextStatus = account.status === 'suspended' ? 'approved' : 'suspended'
    try {
      await adminApi.updateAccount(account.id, { status: nextStatus })
      fetchAccounts()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update status.'))
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge tone="success">Approved</Badge>
      case 'pending_approval':
      case 'pending_details':
        return <Badge tone="warning">Pending</Badge>
      case 'suspended':
        return <Badge tone="danger">Suspended</Badge>
      case 'rejected':
        return <Badge tone="danger">Rejected</Badge>
      default:
        return <Badge tone="muted">{status}</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <PageHeader
            title="User &amp; Supplier Management"
            subtitle="Perform CRUD operations on customer and supplier accounts, manage status, and login directly as any user."
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
            <span>Add Account</span>
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
              <p className="text-xs font-medium text-slate-500">Total Accounts</p>
              <p className="text-xl font-bold text-slate-900">{stats.totalAccounts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Suppliers</p>
              <p className="text-xl font-bold text-indigo-700">{stats.totalSuppliers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Customers</p>
              <p className="text-xl font-bold text-emerald-700">{stats.totalUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Pending</p>
              <p className="text-xl font-bold text-amber-700">{stats.totalPending}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Suspended</p>
              <p className="text-xl font-bold text-rose-700">{stats.totalSuspended}</p>
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
              All Accounts ({stats.totalAccounts})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('supplier')
                setPage(1)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'supplier'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Suppliers ({stats.totalSuppliers})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('user')
                setPage(1)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Customers ({stats.totalUsers})</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5 max-w-lg">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name, email, city…"
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
              <option value="approved">Approved</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                <th className="px-5 py-3">Account / Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Business / Location</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-300" />
                    Loading accounts…
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <EmptyState
                  message="No matching accounts found."
                  colSpan={8}
                  action={
                    <Button size="sm" variant="outline" onClick={() => setAddModalOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add First Account
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
                            acc.role === 'supplier'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {acc.fullName ? acc.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{acc.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      {acc.role === 'supplier' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                          <Building2 className="h-3 w-3" /> Supplier
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                          <User className="h-3 w-3" /> Customer
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <p className="font-medium text-slate-800 truncate">
                        {acc.businessProfile?.businessName || '—'}
                      </p>
                      <p className="text-slate-400 truncate">{acc.businessProfile?.location || '—'}</p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3 text-slate-400" />
                        {acc.ordersCount || 0}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-slate-800">
                      ${acc.walletBalance?.toFixed(2) ?? '0.00'}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">{acc.joined}</td>

                    <td className="whitespace-nowrap px-4 py-3.5">{getStatusBadge(acc.status)}</td>

                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Prominent Login-As Impersonation Button */}
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleImpersonate(acc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white disabled:opacity-50 cursor-pointer shadow-2xs"
                          title={`Log in as ${acc.fullName}`}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Login As</span>
                        </button>

                        {/* Edit Button */}
                        <IconAction
                          icon={Pencil}
                          tone="primary"
                          aria-label="Edit account"
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
                            aria-label="Activate / Reinstate account"
                            onClick={() => handleToggleStatus(acc)}
                          />
                        ) : (
                          <IconAction
                            icon={XCircle}
                            tone="warning"
                            aria-label="Suspend account"
                            onClick={() => handleToggleStatus(acc)}
                          />
                        )}

                        {/* Delete Button */}
                        <IconAction
                          icon={Trash2}
                          tone="danger"
                          aria-label="Delete account"
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
            <p className="px-5 py-8 text-center text-xs text-slate-400">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">No accounts found.</p>
          ) : (
            accounts.map((acc) => (
              <MobileCard
                key={acc.id}
                title={acc.fullName}
                subtitle={acc.email}
                badge={getStatusBadge(acc.status)}
                actions={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleImpersonate(acc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>Login As</span>
                    </button>
                    <IconAction
                      icon={Pencil}
                      tone="primary"
                      aria-label="Edit account"
                      onClick={() => {
                        setSelectedAccount(acc)
                        setEditModalOpen(true)
                      }}
                    />
                    <IconAction
                      icon={Trash2}
                      tone="danger"
                      aria-label="Delete account"
                      onClick={() => {
                        setSelectedAccount(acc)
                        setDeleteModalOpen(true)
                      }}
                    />
                  </div>
                }
              >
                <DetailRow label="Role" value={acc.role === 'supplier' ? 'Supplier' : 'Customer'} />
                <DetailRow label="Location" value={acc.businessProfile?.location || '—'} />
                <DetailRow label="Balance" value={`$${acc.walletBalance?.toFixed(2) ?? '0.00'}`} />
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

      {/* Account Modals */}
      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchAccounts}
        initialRole={activeTab === 'supplier' ? 'supplier' : 'user'}
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
