import { SlidersHorizontal, Users, Truck, ShoppingBag, DollarSign, CreditCard, AlertTriangle, PackageSearch } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import RevenueChart from '../../components/dashboard/RevenueChart.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'

const OVERVIEW_STATS = [
  { label: 'Total Users', value: 10, icon: Users, tone: 'yellow' },
  { label: 'Total Suppliers', value: 15, icon: Truck, tone: 'blue' },
  { label: 'Total Orders', value: 3, icon: ShoppingBag, tone: 'pink' },
  { label: 'Total Revenue', value: '$0', icon: DollarSign, tone: 'teal' },
  { label: 'Payments', value: 400, icon: CreditCard, tone: 'red' },
  { label: 'Disputes', value: 2, icon: AlertTriangle, tone: 'teal' },
]

const PENDING_TASKS = [
  { label: 'Pending Users', value: 5, icon: Users, tone: 'yellow' },
  { label: 'Pending Suppliers', value: 12, icon: PackageSearch, tone: 'blue' },
  { label: 'Pending Payout', value: 2, icon: DollarSign, tone: 'pink' },
  { label: 'Pending Request', value: 1, icon: AlertTriangle, tone: 'teal' },
]

function DashboardPage() {
  return (
    <AdminLayout>
      <PageHeader
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PENDING_TASKS.map((task) => (
          <StatCard key={task.label} {...task} />
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-base font-bold text-slate-900">Monthly Revenue</h2>
      <Card className="shadow-soft p-5">
        <RevenueChart />
      </Card>
    </AdminLayout>
  )
}

export default DashboardPage
