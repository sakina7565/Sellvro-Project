import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../ui/Card.jsx'

const data = [
  { year: '2016', value: 18000 },
  { year: '2017', value: 32000 },
  { year: '2018', value: 22000 },
  { year: '2019', value: 28000 },
  { year: '2020', value: 15000 },
  { year: '2021', value: 25000 },
]

const currencyTick = (value) => `$${value.toLocaleString()}`

/**
 * Monthly Revenue area chart used on the User Panel Overview,
 * matching the screenshot: years on the X axis, dollar amounts on
 * the Y axis, and a teal filled wave.
 */
function MonthlyRevenueChart() {
  return (
    <Card className="p-5 shadow-soft">
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="monthlyRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 40000]}
              ticks={[0, 10000, 20000, 30000, 40000]}
              tickFormatter={currencyTick}
              axisLine={false}
              tickLine={false}
              width={64}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#14b8a6"
              strokeWidth={2.5}
              fill="url(#monthlyRevenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default MonthlyRevenueChart
