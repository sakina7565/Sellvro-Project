import { useState } from 'react'
import { Share2, Minus } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Card from '../ui/Card.jsx'

const TABS = ['Last week', 'Last month', 'Last Year']

const LEGEND = [
  { label: 'Forecast', color: 'bg-slate-300' },
  { label: 'Visitors', color: 'bg-indigo-300' },
  { label: 'Unique Customers', color: 'bg-indigo-600' },
]

const data = Array.from({ length: 7 }, (_, i) => ({ point: i, value: 0 }))

/**
 * "Total Customers" analytics card shown on the Supplier dashboard:
 * period tabs, headline stat with a growth badge, an area chart, and
 * a legend row.
 */
function CustomerChart() {
  const [activeTab, setActiveTab] = useState(TABS[0])

  return (
    <Card className="p-5 shadow-soft">
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between">
        <p className="text-sm font-bold text-slate-900">Total Customers</p>
        <div className="flex items-center gap-1 text-slate-400">
          <button type="button" className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50" aria-label="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50" aria-label="Collapse">
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">0</span>
        <span className="text-xs font-semibold text-emerald-500">+9.2%</span>
      </div>
      <p className="text-xs text-slate-400">vs 3,568 last month</p>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="point" hide />
            <Tooltip formatter={(value) => [value, 'Customers']} />
            <Area type="monotone" dataKey="value" stroke="#4338ca" strokeWidth={2} fill="#4338ca" fillOpacity={0.08} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </Card>
  )
}

export default CustomerChart
