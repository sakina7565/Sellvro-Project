import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Eye, XCircle } from 'lucide-react'
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
import PendingAccountDetailsModal from '../../components/admin/PendingAccountDetailsModal.jsx'
import { adminApi } from '../../lib/api.js'

const FILTERS = [{ label: 'All', options: ['Pending', 'Approved', 'Rejected'] }]

const TABLE_HEAD = ['Supplier & Contact', 'Location', 'Category', 'Payment Provider', 'Joined', 'Status', 'Actions']

function PendingSuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.pendingSuppliers()
      setSuppliers(data.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load pending suppliers.')
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
      setSuccess('Supplier application approved successfully!')
      setSelectedSupplier(null)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to approve supplier.')
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
      setSuccess('Supplier application rejected.')
      setSelectedSupplier(null)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to reject supplier.')
    } finally {
      setActionLoading(false)
    }
  }

  const isEmpty = !loading && suppliers.length === 0

  return (
    <AdminLayout>
      <PageHeader title="Pending Suppliers" />

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

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-left text-sm">
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
                      Loading pending suppliers…
                    </div>
                  </td>
                </tr>
              ) : isEmpty ? (
                <EmptyState message="No pending suppliers awaiting verification." colSpan={TABLE_HEAD.length} />
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold text-xs">
                          {(supplier.supplier || supplier.fullName || 'S').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{supplier.supplier || supplier.fullName}</p>
                          <p className="text-xs text-slate-400">{supplier.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 font-medium">{supplier.location}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{supplier.paymentProvider}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500 text-xs">{supplier.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone="warning">Pending Review</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* View Details Button */}
                        <button
                          onClick={() => setSelectedSupplier(supplier)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-600 hover:border-teal-200 transition-all shadow-2xs"
                          title="View complete supplier background and details"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          View Details
                        </button>

                        {/* Quick Approve Icon */}
                        <IconAction
                          icon={CheckCircle2}
                          tone="success"
                          aria-label="Approve supplier"
                          title="Approve immediately"
                          onClick={() => handleApprove(supplier.id)}
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
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>}
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No pending suppliers.</p>}
          {suppliers.map((supplier) => (
            <MobileCard
              key={supplier.id}
              title={supplier.supplier || supplier.fullName}
              subtitle={supplier.email}
              badge={<Badge tone="warning">Pending Review</Badge>}
              actions={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSupplier(supplier)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </button>
                  <IconAction
                    icon={CheckCircle2}
                    tone="success"
                    aria-label="Approve supplier"
                    onClick={() => handleApprove(supplier.id)}
                  />
                </div>
              }
            >
              <DetailRow label="Location" value={supplier.location} />
              <DetailRow label="Category" value={supplier.category} />
              <DetailRow label="Payment Provider" value={supplier.paymentProvider} />
              <DetailRow label="Joined" value={supplier.joined} />
            </MobileCard>
          ))}
        </div>

        <Pagination
          from={isEmpty ? 0 : 1}
          to={suppliers.length}
          total={suppliers.length}
          page={isEmpty ? 0 : 1}
        />
      </Card>

      {/* Interactive Details Modal */}
      <PendingAccountDetailsModal
        isOpen={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplier(null)}
        account={selectedSupplier}
        onApprove={handleApprove}
        onReject={handleReject}
        actionLoading={actionLoading}
      />
    </AdminLayout>
  )
}

export default PendingSuppliersPage
