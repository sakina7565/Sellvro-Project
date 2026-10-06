import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const DEFAULT_DATA = [
  { month: 'Jan', revenue: 0 },
  { month: 'Feb', revenue: 0 },
  { month: 'Mar', revenue: 0 },
  { month: 'Apr', revenue: 0 },
  { month: 'May', revenue: 0 },
  { month: 'Jun', revenue: 0 },
]

/**
 * Dynamic monthly trend chart for revenue, earnings, or spend.
 */
function RevenueChart({
  data = DEFAULT_DATA,
  dataKey = 'revenue',
  metricLabel = 'Revenue',
  color = '#3d4fe0',
}) {
  const chartData = Array.isArray(data) && data.length > 0 ? data : DEFAULT_DATA

  return (
    <div className="h-64 w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => (val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val}`)}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: '#e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: 12,
              padding: '8px 12px',
            }}
            formatter={(value) => [`$${Number(value || 0).toFixed(2)}`, metricLabel]}
            labelFormatter={(label, items) => {
              const item = items?.[0]?.payload
              return item?.fullMonth || label
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default RevenueChart
