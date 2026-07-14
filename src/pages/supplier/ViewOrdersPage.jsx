import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Card from '../../components/ui/Card.jsx'
import { SUPPLIER_ORDERS } from '../../lib/mockData.js'

const FILTERS = [
  { label: 'All Categories' },
  { label: 'Order #', type: 'text' },
  { label: 'All Dates' },
  { label: 'Order Status' },
]

const TABLE_HEAD = ['Order #', 'Address', 'Customer', 'Items', 'Price', 'Commission', 'Date', 'Status', 'Label', 'Actions']

function SupplierViewOrdersPage() {
  const isEmpty = SUPPLIER_ORDERS.length === 0

  return (
    <SupplierLayout>
      <PageHeader eyebrow="Supplier Panel" title="Orders" />

      <FilterBar filters={FILTERS} />

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
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
            {isEmpty && (
              <tbody>
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No Orders Found
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {/* Mobile: no horizontal scrolling needed */}
        <div className="md:hidden">
          {isEmpty && <p className="px-5 py-16 text-center text-sm text-slate-500">No Orders Found</p>}
        </div>
      </Card>

      <p className="mt-4 text-sm text-slate-500">
        Showing {SUPPLIER_ORDERS.length} to {SUPPLIER_ORDERS.length} of {SUPPLIER_ORDERS.length} orders
      </p>
    </SupplierLayout>
  )
}

export default SupplierViewOrdersPage
