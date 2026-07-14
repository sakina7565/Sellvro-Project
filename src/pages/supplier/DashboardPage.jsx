import { SlidersHorizontal, Wallet, Box, ShoppingBag, DollarSign, Inbox, BarChart3, Banknote } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import CustomerChart from '../../components/dashboard/CustomerChart.jsx'
import Button from '../../components/ui/Button.jsx'

const OVERVIEW_STATS = [
  { label: 'Approved', value: 0, icon: Wallet, tone: 'yellow' },
  { label: 'Total Products', value: 0, icon: Box, tone: 'blue' },
  { label: 'Total Orders', value: 0, icon: ShoppingBag, tone: 'pink' },
  { label: 'Total Revenue', value: '$0.00', icon: DollarSign, tone: 'teal' },
]

const PENDING_TASKS = [
  { label: 'Pending Status', value: 0, icon: Inbox, tone: 'yellow' },
  { label: 'Stock Difference', value: 0, icon: BarChart3, tone: 'red' },
  { label: 'Pending Payout', value: '$0.00', icon: Banknote, tone: 'teal' },
]

function SupplierDashboardPage() {
  return (
    <SupplierLayout>
      <PageHeader
        eyebrow="Supplier Panel"
        title="Overview"
        action={
          <Button variant="outline" size="sm" className="border border-slate-200">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {OVERVIEW_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-base font-bold text-slate-900">Pending Tasks</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PENDING_TASKS.map((task) => (
          <StatCard key={task.label} {...task} />
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-base font-bold text-slate-900">Monthly Revenue</h2>
      <CustomerChart />
    </SupplierLayout>
  )
}

export default SupplierDashboardPage
