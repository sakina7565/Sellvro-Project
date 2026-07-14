import { User, Briefcase, HandCoins } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { USER_WALLET_TRANSACTIONS } from '../../lib/mockData.js'

const SUMMARY_STATS = [
  { label: 'Pending Requests', value: 0, icon: User, tone: 'blue' },
  { label: 'Pending Amount', value: '$0.00', icon: Briefcase, tone: 'yellow' },
  { label: 'Processed Total', value: '$0.00', icon: HandCoins, tone: 'green' },
]

const TABLE_HEAD = ['TID / NO', 'SCREENSHOT', 'AMOUNT', 'STATUS', 'DATE', 'ACTION']

function UserWalletPage() {
  const isEmpty = USER_WALLET_TRANSACTIONS.length === 0

  return (
    <UserLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">User Panel</p>
          <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
          <p className="mt-1 text-sm text-slate-600">
            Current Balance: <span className="font-bold text-slate-900">$0.00</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="link" className="text-sm">
            Learn Deposit Instructions
          </Button>
          <Button type="button" size="sm">
            Request Amount
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} shape="circle" />
        ))}
      </div>

      <Card className="overflow-hidden border border-slate-200 shadow-none">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                <tr>
                  <td colSpan={TABLE_HEAD.length} className="px-5 py-16 text-center text-sm text-slate-500">
                    No transaction history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          {isEmpty && (
            <p className="px-5 py-16 text-center text-sm text-slate-500">No transaction history found.</p>
          )}
        </div>
      </Card>
    </UserLayout>
  )
}

export default UserWalletPage
