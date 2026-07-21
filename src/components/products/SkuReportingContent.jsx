import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Hourglass,
  Image as ImageIcon,
  Package,
  RotateCcw,
  Search,
  Send,
  Target,
  Truck,
  User,
  UserCog,
  Warehouse,
} from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../admin/PageHeader.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import {
  SKU_DISPUTES,
  SKU_FULFILLMENTS,
  SKU_MONTHLY_IN_OUT,
  SKU_REPORT_METRICS,
  SKU_REPORT_PRODUCT,
  SKU_SHIPMENTS,
} from '../../lib/mockSkuReportData.js'

const ICON_MAP = {
  warehouse: Warehouse,
  truck: Truck,
  download: Download,
  truckOut: Truck,
  alert: AlertTriangle,
  target: Target,
  alertCircle: AlertCircle,
  send: Send,
  hourglass: Hourglass,
  userCog: UserCog,
  user: User,
}

const TONE_CLASSES = {
  blue: 'bg-sky-50 text-sky-500',
  green: 'bg-emerald-50 text-emerald-500',
  orange: 'bg-amber-50 text-amber-500',
  red: 'bg-rose-50 text-rose-500',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-violet-50 text-violet-500',
  teal: 'bg-teal-50 text-teal-500',
}

const FILTER_INPUT =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const PANEL_COPY = {
  user: {
    eyebrow: 'Client Portal',
    subtitle: 'Search and report on your own product SKUs only.',
  },
  admin: {
    eyebrow: 'Admin Panel',
    subtitle: 'Search and report on product SKUs across the warehouse.',
  },
  supplier: {
    eyebrow: 'Supplier Panel',
    subtitle: 'Search and report on your own product SKUs only.',
  },
}

function SkuMetricCard({ icon, tone, value, label }) {
  const Icon = ICON_MAP[icon] || Package

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function SectionTable({ title, count, icon: Icon, columns, rows, emptyMessage }) {
  return (
    <Card className="overflow-hidden border border-slate-200 shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
          {count}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-5 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-400">
                  <Package className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.shipmentNo || row.date} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
                    {row.shipmentNo}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.courier}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.expected}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
                      {row.received}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.damaged}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.missing}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Badge tone="success">{row.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/**
 * Shared SKU Reporting page content — used by user, admin and supplier panels.
 */
function SkuReportingContent({ panel = 'user' }) {
  const [skuQuery, setSkuQuery] = useState(SKU_REPORT_PRODUCT.sku)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const product = SKU_REPORT_PRODUCT
  const copy = PANEL_COPY[panel] || PANEL_COPY.user

  const handleClear = () => {
    setSkuQuery('')
    setFromDate('')
    setToDate('')
  }

  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title="My SKU Reporting" className="mb-4" />
      <p className="mb-5 text-sm text-slate-500">{copy.subtitle}</p>

      <Card className="mb-5 border border-slate-200 p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="sku-search" className="mb-1.5 block text-xs font-medium text-slate-500">
              Search SKU
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="sku-search"
                type="search"
                value={skuQuery}
                onChange={(e) => setSkuQuery(e.target.value)}
                placeholder="Enter SKU..."
                className={`${FILTER_INPUT} pl-10`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
            <div>
              <label htmlFor="from-date" className="mb-1.5 block text-xs font-medium text-slate-500">
                From
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="to-date" className="mb-1.5 block text-xs font-medium text-slate-500">
                To
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-10">
              <BarChart3 className="h-4 w-4" />
              Load Report
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 border border-slate-200 bg-white"
              onClick={handleClear}
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mb-5 border border-slate-200 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <ImageIcon className="h-8 w-8 text-slate-300" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{product.name}</h2>
              <Badge tone="success">{product.status}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
              <span>
                <span className="font-medium text-slate-400">SKU:</span> {product.sku}
              </span>
              <span>
                <span className="font-medium text-slate-400">Category:</span> {product.category}
              </span>
              <span>
                <span className="font-medium text-slate-400">Brand:</span> {product.brand}
              </span>
              <span>
                <span className="font-medium text-slate-400">Client:</span> {product.client}
              </span>
              <span>
                <span className="font-medium text-slate-400">Price:</span> {product.price}
              </span>
              <span>
                <span className="font-medium text-slate-400">Added:</span> {product.added}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SKU_REPORT_METRICS.slice(0, 6).map((metric) => (
          <SkuMetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SKU_REPORT_METRICS.slice(6).map((metric) => (
          <SkuMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <Card className="mb-6 border border-slate-200 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Monthly In vs Out (Last 6 Months)</h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              Received
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Dispatched
            </span>
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SKU_MONTHLY_IN_OUT} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ display: 'none' }} />
              <Bar dataKey="received" fill="#3d4fe0" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="dispatched" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        <SectionTable
          title="Shipments Timeline"
          count={SKU_SHIPMENTS.length}
          columns={['DATE', 'SHIPMENT #', 'COURIER', 'EXPECTED', 'RECEIVED', 'DAMAGED', 'MISSING', 'STATUS']}
          rows={SKU_SHIPMENTS}
          emptyMessage="No shipments found"
        />

        <SectionTable
          title="Fulfillment Requests"
          count={SKU_FULFILLMENTS.length}
          columns={['DATE', 'TRACKING #', 'QUANTITY', 'SOURCE', 'LOCATION', 'STATUS']}
          rows={SKU_FULFILLMENTS}
          emptyMessage="No fulfillment requests found"
        />

        <SectionTable
          title="Disputes"
          count={SKU_DISPUTES.length}
          icon={AlertTriangle}
          columns={['DATE', 'TYPE', 'MESSAGE', 'RAISED BY', 'STATUS']}
          rows={SKU_DISPUTES}
          emptyMessage="No disputes found"
        />
      </div>
    </>
  )
}

export default SkuReportingContent
