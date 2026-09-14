/**
 * Shared helpers for SKU / Business reporting pages.
 */

export function formatMoney(value) {
  const num = Number(value) || 0
  return `Rs ${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

export function formatReportDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatReportDateTime(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusLabel(status) {
  if (!status) return '—'
  return String(status)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function parseDayStart(dateStr) {
  if (!dateStr) return null
  const date = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseDayEnd(dateStr) {
  if (!dateStr) return null
  const date = new Date(`${dateStr}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function inDateRange(value, fromDate, toDate) {
  if (!value) return !fromDate && !toDate
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const from = parseDayStart(fromDate)
  const to = parseDayEnd(toDate)
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function lastSixMonthBuckets() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      received: 0,
      dispatched: 0,
    })
  }
  return months
}

export function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${date.getMonth()}`
}

export function badgeToneForStatus(status) {
  const value = String(status || '').toLowerCase()
  if (['active', 'approved', 'received', 'resolved', 'processed', 'placed'].includes(value)) {
    return 'success'
  }
  if (['pending', 'pending_approval', 'in_process', 'open'].includes(value)) {
    return 'warning'
  }
  if (['rejected', 'cancelled', 'danger', 'closed'].includes(value)) {
    return 'danger'
  }
  return 'neutral'
}
