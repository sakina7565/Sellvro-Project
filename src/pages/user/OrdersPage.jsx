import { Link } from 'react-router-dom'
import { Eye, SlidersHorizontal } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { USER_ORDERS } from '../../lib/mockData.js'

const FILTER_CONTROL =
  'h-10 min-w-[9rem] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const TABLE_HEAD = ['Product', 'SKU', 'Label', 'Category', 'Location', 'Price', 'Quantity', 'Status', 'Action']

function UserOrdersPage() {
  const isEmpty = USER_ORDERS.length === 0

  return (
    <UserLayout>
      <PageHeader
        eyebrow="User Panel"
        title="Orders"
        action={
          <Button as={Link} to="/user/products" size="sm">
            Shop now
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <select defaultValue="" className={`appearance-none ${FILTER_CONTROL}`}>
            <option value="" disabled>
              Select Category -
            </option>
            <option value="mechanical-parts">Mechanical parts</option>
            <option value="shoes">shoes</option>
          </select>
          <select defaultValue="" className={`appearance-none ${FILTER_CONTROL}`}>
            <option value="" disabled>
              Product Status -
            </option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
          <Button type="button" size="sm">
            <Eye className="h-4 w-4" />
            View Added
          </Button>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"
        >
          Filter
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </Card>

      <h2 className="mb-3 text-base font-bold text-slate-900">Orders List</h2>

      <Card className="overflow-hidden border border-slate-200 shadow-none">
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
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          {isEmpty && <p className="px-5 py-16 text-center text-sm text-slate-500">No records found.</p>}
        </div>
      </Card>
    </UserLayout>
  )
}

export default UserOrdersPage
