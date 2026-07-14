import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import EmptyState from '../../components/admin/EmptyState.jsx'
import Card from '../../components/ui/Card.jsx'
import { USER_COMPLAINTS } from '../../lib/mockData.js'

const FILTERS = [{ label: 'All Status', options: ['Open', 'Resolved'] }]

const TABLE_HEAD = ['Complaint From', 'Complaint To', 'Order', 'Product', 'Requests', 'Date', 'Actions']

function UserComplaintsPage() {
  const isEmpty = USER_COMPLAINTS.length === 0

  return (
    <AdminLayout>
      <PageHeader title="User Complaints" />

      <FilterBar filters={FILTERS} />

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
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
              {isEmpty ? (
                <EmptyState message="No complaints found." colSpan={TABLE_HEAD.length} />
              ) : (
                USER_COMPLAINTS.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{complaint.from}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{complaint.to}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{complaint.order}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{complaint.product}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{complaint.requests}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{complaint.date}</td>
                    <td className="whitespace-nowrap px-5 py-4" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="md:hidden">
          {isEmpty ? (
            <p className="px-5 py-6 text-sm text-slate-500">No complaints found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {USER_COMPLAINTS.map((complaint) => (
                <div key={complaint.id} className="p-4">
                  <p className="font-semibold text-slate-800">{complaint.from}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-y-2.5 text-xs">
                    <div>
                      <dt className="text-slate-400">Complaint To</dt>
                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.to}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Order</dt>
                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.order}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Product</dt>
                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.product}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Requests</dt>
                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.requests}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-400">Date</dt>
                      <dd className="mt-0.5 font-medium text-slate-600">{complaint.date}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default UserComplaintsPage
