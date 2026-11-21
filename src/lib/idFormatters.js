/**
 * Standard ID formatters for Sellvro
 *
 * Patterns:
 * - SKU: SVRO-0001 (serial)
 * - Supplier: SPAK-1001 (starting from 1001)
 * - User: US-1001 (starting from 1001)
 * - Order: 26-SV-00001 (Year-SV-OrderNumber)
 * - Dispute: 26-D-0001 (Year-D-DisputeNumber)
 * - Wallet Transactions: 26-W-00001 (Year-W-TransactionNumber)
 * - Payout: 26-P-00001 (Year-P-PayoutNumber)
 */

export function formatSupplierId(supplierOrId) {
  if (!supplierOrId) return '—'
  if (typeof supplierOrId === 'object') {
    if (supplierOrId.displayId) return supplierOrId.displayId
    if (supplierOrId.supplierDisplayId) return supplierOrId.supplierDisplayId
    if (supplierOrId.clientId && /^SPAK-\d+$/i.test(supplierOrId.clientId)) return supplierOrId.clientId
    const raw = supplierOrId.id || supplierOrId._id || supplierOrId.supplierId || ''
    if (raw) {
      if (/^SPAK-\d+$/i.test(raw)) return raw
      const num = 1001 + (parseInt(String(raw).slice(-4), 16) % 8999)
      return `SPAK-${isNaN(num) ? 1001 : num}`
    }
    return 'SPAK-1001'
  }
  const str = String(supplierOrId).trim()
  if (/^SPAK-\d+$/i.test(str)) return str
  const num = 1001 + (parseInt(str.slice(-4), 16) % 8999)
  return `SPAK-${isNaN(num) ? 1001 : num}`
}

export function formatUserId(userOrId) {
  if (!userOrId) return '—'
  if (typeof userOrId === 'object') {
    if (userOrId.displayId) return userOrId.displayId
    if (userOrId.userDisplayId) return userOrId.userDisplayId
    if (userOrId.clientId && /^US-\d+$/i.test(userOrId.clientId)) return userOrId.clientId
    const raw = userOrId.id || userOrId._id || userOrId.userId || ''
    if (raw) {
      if (/^US-\d+$/i.test(raw)) return raw
      const num = 1001 + (parseInt(String(raw).slice(-4), 16) % 8999)
      return `US-${isNaN(num) ? 1001 : num}`
    }
    return 'US-1001'
  }
  const str = String(userOrId).trim()
  if (/^US-\d+$/i.test(str)) return str
  const num = 1001 + (parseInt(str.slice(-4), 16) % 8999)
  return `US-${isNaN(num) ? 1001 : num}`
}

export function formatOrderId(orderOrId) {
  if (!orderOrId) return '—'
  if (typeof orderOrId === 'object') {
    if (orderOrId.orderNo) return orderOrId.orderNo
    const raw = orderOrId.id || orderOrId._id || ''
    if (/^\d{2}-SV-\d+$/i.test(raw)) return raw
    const yy = new Date().getFullYear().toString().slice(-2)
    const num = String(10001 + (parseInt(String(raw).slice(-4), 16) % 89999)).slice(-5)
    return `${yy}-SV-${num}`
  }
  const str = String(orderOrId).trim()
  if (/^\d{2}-SV-\d+$/i.test(str)) return str
  const yy = new Date().getFullYear().toString().slice(-2)
  const num = String(10001 + (parseInt(str.slice(-4), 16) % 89999)).slice(-5)
  return `${yy}-SV-${num}`
}

export function formatDisputeId(disputeOrId) {
  if (!disputeOrId) return '—'
  if (typeof disputeOrId === 'object') {
    if (disputeOrId.disputeNo) return disputeOrId.disputeNo
    if (disputeOrId.disputeDisplayId) return disputeOrId.disputeDisplayId
    const raw = disputeOrId.id || disputeOrId._id || ''
    if (/^\d{2}-D-\d+$/i.test(raw)) return raw
    const yy = new Date().getFullYear().toString().slice(-2)
    const num = String(1001 + (parseInt(String(raw).slice(-4), 16) % 8999)).slice(-4)
    return `${yy}-D-${num}`
  }
  const str = String(disputeOrId).trim()
  if (/^\d{2}-D-\d+$/i.test(str)) return str
  const yy = new Date().getFullYear().toString().slice(-2)
  const num = String(1001 + (parseInt(str.slice(-4), 16) % 8999)).slice(-4)
  return `${yy}-D-${num}`
}

export function formatWalletTxId(txOrId) {
  if (!txOrId) return '—'
  if (typeof txOrId === 'object') {
    if (txOrId.transactionId) return txOrId.transactionId
    if (txOrId.transactionDisplayId) return txOrId.transactionDisplayId
    const raw = txOrId.id || txOrId._id || ''
    if (/^\d{2}-W-\d+$/i.test(raw)) return raw
    const yy = new Date().getFullYear().toString().slice(-2)
    const num = String(10001 + (parseInt(String(raw).slice(-4), 16) % 89999)).slice(-5)
    return `${yy}-W-${num}`
  }
  const str = String(txOrId).trim()
  if (/^\d{2}-W-\d+$/i.test(str)) return str
  const yy = new Date().getFullYear().toString().slice(-2)
  const num = String(10001 + (parseInt(str.slice(-4), 16) % 89999)).slice(-5)
  return `${yy}-W-${num}`
}

export function formatPayoutId(payoutOrId) {
  if (!payoutOrId) return '—'
  if (typeof payoutOrId === 'object') {
    if (payoutOrId.payoutNo) return payoutOrId.payoutNo
    if (payoutOrId.payoutDisplayId) return payoutOrId.payoutDisplayId
    const raw = payoutOrId.id || payoutOrId._id || ''
    if (/^\d{2}-P-\d+$/i.test(raw)) return raw
    const yy = new Date().getFullYear().toString().slice(-2)
    const num = String(10001 + (parseInt(String(raw).slice(-4), 16) % 89999)).slice(-5)
    return `${yy}-P-${num}`
  }
  const str = String(payoutOrId).trim()
  if (/^\d{2}-P-\d+$/i.test(str)) return str
  const yy = new Date().getFullYear().toString().slice(-2)
  const num = String(10001 + (parseInt(str.slice(-4), 16) % 89999)).slice(-5)
  return `${yy}-P-${num}`
}

