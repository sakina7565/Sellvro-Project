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

const FILTERS = [{ label: 'All Status', options: ['Approved', 'Pending', 'Suspended'] }]
const TABLE_HEAD = ['Supplier', 'Location', 'Orders', 'Revenue', 'Payout', 'Joined', 'Status', 'Actions']

function AllSuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.accounts({ role: 'supplier' })
      setSuppliers(res.data || [])
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const handleImpersonate = async (supplier) => {
    const confirmed = window.confirm(
      `Login as "${supplier.fullName}" (Supplier)?\n\nYou will be redirected to the supplier dashboard in Admin Impersonation Mode.`,
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await adminApi.impersonate(supplier.id)
      window.location.href = res.redirectUrl || '/supplier/dashboard'
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to login as supplier.'))
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async (supplier) => {
    const nextStatus = supplier.status === 'suspended' ? 'approved' : 'suspended'
    try {
      await adminApi.updateAccount(supplier.id, { status: nextStatus })
      loadSuppliers()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update supplier status.'))
    }
  }

  const isEmpty = !loading && suppliers.length === 0

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <PageHeader title="All Suppliers" subtitle="Manage registered suppliers, edit profiles, and login directly." />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSuppliers}
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
            <span>Add Supplier</span>
          </Button>
        </div>
      </div>

      <FilterBar filters={FILTERS} />

      <h2 className="mb-3 text-sm font-bold text-slate-900">Registered Suppliers</h2>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
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
                <EmptyState message="No suppliers found." colSpan={TABLE_HEAD.length} />
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      <div>
                        <p className="font-semibold text-slate-900">{supplier.fullName}</p>
                        <p className="text-xs text-slate-400">{supplier.email}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {supplier.businessProfile?.location || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.ordersCount || 0}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500 font-medium">
                      {supplier.revenueLabel || `$${Number(supplier.revenue || 0).toFixed(2)}`}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500 capitalize">
                      {supplier.businessProfile?.payoutSchedule || 'Weekly'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone={supplier.status === 'approved' ? 'success' : supplier.status === 'suspended' ? 'danger' : 'warning'}>
                        {supplier.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleImpersonate(supplier)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white disabled:opacity-50 cursor-pointer shadow-2xs"
                          title={`Log in as ${supplier.fullName}`}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Login As</span>
                        </button>

                        <IconAction
                          icon={Pencil}
                          tone="primary"
                          aria-label="Edit supplier"
                          onClick={() => {
                            setSelectedSupplier(supplier)
                            setEditModalOpen(true)
                          }}
                        />

                        {supplier.status === 'suspended' ? (
                          <IconAction
                            icon={CheckCircle2}
                            tone="success"
                            aria-label="Reinstate supplier"
                            onClick={() => handleToggleStatus(supplier)}
                          />
                        ) : (
                          <IconAction
                            icon={XCircle}
                            tone="danger"
                            aria-label="Suspend supplier"
                            onClick={() => handleToggleStatus(supplier)}
                          />
                        )}

                        <IconAction
                          icon={Trash2}
                          tone="danger"
                          aria-label="Delete supplier"
                          onClick={() => {
                            setSelectedSupplier(supplier)
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
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No suppliers found.</p>}
          {suppliers.map((supplier) => (
            <MobileCard
              key={supplier.id}
              title={supplier.fullName}
              subtitle={supplier.email}
              badge={
                <Badge tone={supplier.status === 'approved' ? 'success' : supplier.status === 'suspended' ? 'danger' : 'warning'}>
                  {supplier.status}
                </Badge>
              }
              actions={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleImpersonate(supplier)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-bold text-white shadow-xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Login As</span>
                  </button>
                  <IconAction
                    icon={Pencil}
                    tone="primary"
                    aria-label="Edit supplier"
                    onClick={() => {
                      setSelectedSupplier(supplier)
                      setEditModalOpen(true)
                    }}
                  />
                  <IconAction
                    icon={Trash2}
                    tone="danger"
                    aria-label="Delete supplier"
                    onClick={() => {
                      setSelectedSupplier(supplier)
                      setDeleteModalOpen(true)
                    }}
                  />
                </div>
              }
            >
              <DetailRow label="Location" value={supplier.businessProfile?.location || '—'} />
              <DetailRow label="Joined" value={supplier.joined} />
              <DetailRow label="Orders" value={supplier.ordersCount || 0} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={isEmpty ? 0 : 1} to={suppliers.length} total={suppliers.length} page={isEmpty ? 0 : 1} />
      </Card>

      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadSuppliers}
        initialRole="supplier"
      />

      <EditAccountModal
        isOpen={editModalOpen}
        account={selectedSupplier}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedSupplier(null)
        }}
        onSuccess={loadSuppliers}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        account={selectedSupplier}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedSupplier(null)
        }}
        onSuccess={loadSuppliers}
      />
    </AdminLayout>
  )
}

export default AllSuppliersPage
