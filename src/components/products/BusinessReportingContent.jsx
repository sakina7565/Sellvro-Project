import {
  AlertTriangle,
  BarChart3,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  Send,
  Truck,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
  ALL_ACTIVITY,
  BUSINESS_DISPUTES,
  BUSINESS_FULFILLMENTS,
  BUSINESS_INVOICES,
  BUSINESS_METRICS,
  BUSINESS_MONTHLY_IN_OUT,
  BUSINESS_PRODUCTS,
  BUSINESS_PROFILE,
  BUSINESS_SHIPMENTS,
  CLIENT_JOURNEY,
  INVENTORY_MOVEMENTS,
} from '../../lib/mockBusinessReportData.js'

const FILTER_INPUT =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const PANEL_CONFIG = {
  user: {
    eyebrow: 'Client Portal',
    journeyTitle: 'Client Journey',
    idLabel: 'Owner ID',
    profileLink: '/user/business/detail',
  },
  admin: {
    eyebrow: 'Admin Panel',
    journeyTitle: 'Business Journey',
    idLabel: 'Admin ID',
    profileLink: '/admin/dashboard',
  },
  supplier: {
    eyebrow: 'Supplier Panel',
    journeyTitle: 'Supplier Journey',
    idLabel: 'Supplier ID',
    profileLink: '/supplier/business/details',
  },
}

const ICON_MAP = {
  package: Package,
  layers: Layers,
  truck: Truck,
  download: Download,
  send: Send,
  alert: AlertTriangle,
  box: Box,
  clock: Clock,
  dollar: DollarSign,
  wallet: Wallet,
  alertTriangle: AlertTriangle,
  userPlus: UserPlus,
  fileText: FileText,
  checkCircle: CheckCircle2,
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

function MetricCard({ icon, tone, value, label }) {
  const Icon = ICON_MAP[icon] || Package
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function ReportTable({ title, count, columns, rows, emptyMessage, renderRow }) {
  return (
    <Card className="overflow-hidden border border-slate-200 shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
          {count}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
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
              rows.map((row, index) => renderRow(row, index))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function BusinessReportingContent({ profile = BUSINESS_PROFILE, panel = 'user' }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const config = PANEL_CONFIG[panel] || PANEL_CONFIG.user

  const handleClear = () => {
    setFromDate('')
    setToDate('')
  }

  return (
    <>
      <PageHeader eyebrow={config.eyebrow} title="My Business Reporting" className="mb-5" />

      {/* Date filters */}
      <Card className="mb-5 border border-slate-200 p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-from" className="mb-1.5 block text-xs font-medium text-slate-500">
                From
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="biz-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`${FILTER_INPUT} pl-10`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="biz-to" className="mb-1.5 block text-xs font-medium text-slate-500">
                To
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="biz-to"
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

      {/* Profile summary */}
      <Card className="mb-5 border border-slate-200 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-50">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
                <Badge tone="success">{profile.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                <span>
                  <span className="text-slate-400">{config.idLabel}:</span> {profile.ownerId}
                </span>
                <span>
                  <span className="text-slate-400">Business:</span> {profile.business}
                </span>
                <span>
                  <span className="text-slate-400">Email:</span> {profile.email}
                </span>
                <span>
                  <span className="text-slate-400">Phone:</span> {profile.phone}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-400">Location:</span> {profile.location}
                </span>
                <span>
                  <span className="text-slate-400">Registered:</span> {profile.registered}
                </span>
              </div>
            </div>
          </div>
          <Button
            as={Link}
            to={config.profileLink}
            variant="outline"
            size="sm"
            className="shrink-0 border border-slate-200 bg-white"
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </Card>

      {/* KPI metrics */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {BUSINESS_METRICS.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* Client journey */}
      <Card className="mb-6 border border-slate-200 p-5 shadow-soft">
        <h3 className="mb-4 text-sm font-bold text-slate-900">{config.journeyTitle}</h3>
        <div className="space-y-4">
          {CLIENT_JOURNEY.map((item) => {
            const Icon = ICON_MAP[item.icon] || Package
            return (
              <div
                key={item.title}
                className="flex flex-col gap-2 border-b border-slate-50 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-slate-400 sm:pl-4">{item.date}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Monthly chart */}
      <Card className="mb-6 border border-slate-200 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Monthly In vs Out</h3>
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
            <BarChart data={BUSINESS_MONTHLY_IN_OUT} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      {/* Data tables */}
      <div className="flex flex-col gap-5">
        <ReportTable
          title="All Activity"
          count={ALL_ACTIVITY.length}
          columns={['DATE', 'TYPE', 'EVENT', 'DETAILS', 'STATUS']}
          rows={ALL_ACTIVITY}
          emptyMessage="No activity found"
          renderRow={(row) => (
            <tr key={`${row.date}-${row.event}`} className="border-b border-slate-50 last:border-0">
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
                  {row.type}
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-800">{row.event}</td>
              <td className="px-5 py-3.5 text-slate-600">{row.details}</td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <Badge tone="success">{row.status}</Badge>
              </td>
            </tr>
          )}
        />

        <ReportTable
          title="Products"
          count={BUSINESS_PRODUCTS.length}
          columns={['DATE', 'PRODUCT', 'SKU', 'CATEGORY', 'PRICE', 'STATUS']}
          rows={BUSINESS_PRODUCTS}
          emptyMessage="No products found"
          renderRow={(row) => (
            <tr key={row.sku} className="border-b border-slate-50 last:border-0">
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
              <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">{row.product}</td>
              <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.sku}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.category}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.price}</td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <Badge tone="success">{row.status}</Badge>
              </td>
            </tr>
          )}
        />

        <ReportTable
          title="Shipments"
          count={BUSINESS_SHIPMENTS.length}
          columns={['DATE', 'SHIPMENT #', 'CARRIER', 'TRACKING', 'WAREHOUSE', 'RECEIVED BY', 'STATUS']}
          rows={BUSINESS_SHIPMENTS}
          emptyMessage="No shipments found"
          renderRow={(row) => (
            <tr key={row.shipmentNo} className="border-b border-slate-50 last:border-0">
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
              <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.shipmentNo}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.carrier}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.tracking}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.warehouse}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.receivedBy}</td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <Badge tone="success">{row.status}</Badge>
              </td>
            </tr>
          )}
        />

        <ReportTable
          title="Fulfillments"
          count={BUSINESS_FULFILLMENTS.length}
          columns={['DATE', 'SKU', 'QTY', 'SHIPPER', 'TRACKING', 'STATUS']}
          rows={BUSINESS_FULFILLMENTS}
          emptyMessage="No fulfillments"
          renderRow={() => null}
        />

        <ReportTable
          title="Inventory Movements"
          count={INVENTORY_MOVEMENTS.length}
          columns={['DATE', 'SKU', 'CHANGE', 'PREVIOUS', 'NEW', 'TYPE']}
          rows={INVENTORY_MOVEMENTS}
          emptyMessage="No inventory movements found"
          renderRow={(row) => (
            <tr key={`${row.date}-${row.sku}`} className="border-b border-slate-50 last:border-0">
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.date}</td>
              <td className="whitespace-nowrap px-5 py-3.5 font-medium text-primary">{row.sku}</td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                  {row.change}
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.previous}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.newQty}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.type}</td>
            </tr>
          )}
        />

        <ReportTable
          title="Invoices & Payments"
          count={BUSINESS_INVOICES.length}
          columns={['DATE', 'INVOICE', 'AMOUNT', 'PAID', 'STATUS', 'PHONE']}
          rows={BUSINESS_INVOICES}
          emptyMessage="No invoices"
          renderRow={() => null}
        />

        <ReportTable
          title="Disputes"
          count={BUSINESS_DISPUTES.length}
          columns={['DATE', 'TYPE', 'MESSAGE', 'STATUS']}
          rows={BUSINESS_DISPUTES}
          emptyMessage="No disputes"
          renderRow={() => null}
        />
      </div>
    </>
  )
}

export default BusinessReportingContent
