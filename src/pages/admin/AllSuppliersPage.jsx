import { useEffect, useState } from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'
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

const FILTERS = [{ label: 'All Status', options: ['Approved', 'Pending', 'Suspended'] }]

const TABLE_HEAD = ['Supplier', 'Location', 'Orders', 'Revenue', 'Payout', 'Warn', 'Joined', 'Status', 'Actions']

function AllSuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminApi
      .suppliers()
      .then((data) => {
        if (active) setSuppliers(data.data || [])
      })
      .catch(() => {
        if (active) setSuppliers([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const isEmpty = !loading && suppliers.length === 0

  return (
    <AdminLayout>
      <PageHeader title="All Suppliers" />

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
                  <tr key={supplier.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{supplier.supplier}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.location}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.orders}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.revenue}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.payout}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.warn}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{supplier.joined}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone="success">{supplier.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-0.5">
                        <IconAction icon={AlertTriangle} tone="warning" aria-label="Warn supplier" />
                        <IconAction icon={XCircle} tone="danger" aria-label="Suspend supplier" />
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
              title={supplier.supplier}
              badge={<Badge tone="success">{supplier.status}</Badge>}
              actions={
                <>
                  <IconAction icon={AlertTriangle} tone="warning" aria-label="Warn supplier" />
                  <IconAction icon={XCircle} tone="danger" aria-label="Suspend supplier" />
                </>
              }
            >
              <DetailRow label="Location" value={supplier.location} />
              <DetailRow label="Joined" value={supplier.joined} />
              <DetailRow label="Orders" value={supplier.orders} />
              <DetailRow label="Revenue" value={supplier.revenue} />
              <DetailRow label="Payout" value={supplier.payout} />
              <DetailRow label="Warn" value={supplier.warn} />
            </MobileCard>
          ))}
        </div>

        <Pagination from={isEmpty ? 0 : 1} to={suppliers.length} total={suppliers.length} page={isEmpty ? 0 : 1} />
      </Card>
    </AdminLayout>
  )
}

export default AllSuppliersPage
