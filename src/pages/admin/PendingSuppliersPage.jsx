import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi } from '../../lib/api.js'

const FILTERS = [{ label: 'All', options: ['Pending', 'Approved', 'Rejected'] }]

const TABLE_HEAD = ['Supplier', 'Location', 'Category', 'Payment Provider', 'Joined', 'Status', 'Actions']

function PendingSuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    try {
      await adminApi.approve(id)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to approve supplier.')
    }
  }

  const isEmpty = !loading && suppliers.length === 0

  return (
    <AdminLayout>
      <PageHeader title="Pending Suppliers" />

      <FilterBar filters={FILTERS} />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left text-sm">
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
                <EmptyState message="No pending suppliers." colSpan={TABLE_HEAD.length} />
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-semibold text-slate-800">{supplier.supplier}</p>
                      <p className="text-xs text-slate-400">{supplier.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.location}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.category}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.paymentProvider}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone="warning">{supplier.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <IconAction
                        icon={CheckCircle2}
                        tone="success"
                        aria-label="Approve supplier"
                        onClick={() => handleApprove(supplier.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {loading && <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>}
          {isEmpty && <p className="px-5 py-6 text-sm text-slate-500">No pending suppliers.</p>}
          {suppliers.map((supplier) => (
            <MobileCard
              key={supplier.id}
              title={supplier.supplier}
              subtitle={supplier.email}
              badge={<Badge tone="warning">{supplier.status}</Badge>}
              actions={
                <IconAction
                  icon={CheckCircle2}
                  tone="success"
                  aria-label="Approve supplier"
                  onClick={() => handleApprove(supplier.id)}
                />
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
    </AdminLayout>
  )
}

export default PendingSuppliersPage
