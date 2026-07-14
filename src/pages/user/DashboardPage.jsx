import {
  SlidersHorizontal,
  Wallet,
  UserPlus,
  FileText,
  Crosshair,
  User,
  Briefcase,
  BarChart3,
} from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import MonthlyRevenueChart from '../../components/dashboard/MonthlyRevenueChart.jsx'
import Button from '../../components/ui/Button.jsx'

const OVERVIEW_STATS = [
  { label: 'Total Wallet', value: '$0.00', icon: Wallet, tone: 'yellow' },
  { label: 'Purchased', value: '$0.00', icon: UserPlus, tone: 'blue' },
  { label: 'Total Orders', value: 0, icon: FileText, tone: 'pink' },
  { label: 'Pending Amount', value: '$0.00', icon: Crosshair, tone: 'teal' },
]

const PENDING_TASKS = [
  { label: 'Disputes', value: 0, icon: User, tone: 'blue' },
  { label: 'Pending Orders', value: 0, icon: Briefcase, tone: 'yellow' },
  { label: 'Orders InProcess', value: 0, icon: BarChart3, tone: 'pink' },
]

function UserDashboardPage() {
  return (
    <UserLayout>
      <PageHeader
        eyebrow="User Panel"
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
      <MonthlyRevenueChart />
    </UserLayout>
  )
}

export default UserDashboardPage
