import Counter from '../models/Counter.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
import Dispute from '../models/Dispute.js'
import WalletRequest from '../models/WalletRequest.js'
import Payout from '../models/Payout.js'

function getYearPrefix() {
  const year = new Date().getFullYear().toString()
  return year.slice(-2)
}

/**
 * Atomically increments a counter and returns the sequence number.
 * If the counter doesn't exist, it uses initFn to determine the starting sequence.
 */
async function getNextSequence(key, minStart = 1, initFn = null) {
  let counter = await Counter.findOne({ key })
  if (!counter) {
    let startingSeq = minStart - 1
    if (typeof initFn === 'function') {
      try {
        const foundMax = await initFn()
        if (typeof foundMax === 'number' && foundMax >= minStart) {
          startingSeq = foundMax
        }
      } catch (err) {
        console.warn(`[sequenceService] initFn error for key ${key}:`, err?.message)
      }
    }
    counter = await Counter.findOneAndUpdate(
      { key },
      { $setOnInsert: { seq: startingSeq } },
      { upsert: true, new: true },
    )
  }

  const updated = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )

  return updated.seq
}

/**
 * 1. SKU Pattern : SVRO-0001 (Must be Serial)
 */
export async function getNextSku() {
  let attempts = 0
  while (attempts < 20) {
    attempts += 1
    const seq = await getNextSequence('sku', 1, async () => {
      const prods = await Product.find({ sku: { $regex: /^SVRO-\d+$/i } }, 'sku').lean()
      let maxNum = 0
      for (const p of prods) {
        const match = p.sku.match(/^SVRO-(\d+)$/i)
        if (match) {
          const num = parseInt(match[1], 10)
          if (!isNaN(num) && num > maxNum) maxNum = num
        }
      }
      return maxNum
    })

    const candidate = `SVRO-${String(seq).padStart(4, '0')}`
    const exists = await Product.findOne({ sku: candidate }).lean()
    if (!exists) return candidate
  }

  // Fallback timestamp serial if 20 collisions
  return `SVRO-${String(Date.now()).slice(-4)}`
}

/**
 * 2. Supplier Pattern : SPAK-1001 (supplier id)
 */
export async function getNextSupplierId() {
  const seq = await getNextSequence('supplier', 1001, async () => {
    const suppliers = await User.find(
      { role: 'supplier', displayId: { $regex: /^SPAK-\d+$/i } },
      'displayId',
    ).lean()
    let maxNum = 1000
    for (const s of suppliers) {
      const match = s.displayId.match(/^SPAK-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return maxNum
  })

  return `SPAK-${seq}`
}

/**
 * 3. User Pattern : US-1001 (user id)
 */
export async function getNextUserId() {
  const seq = await getNextSequence('user', 1001, async () => {
    const users = await User.find(
      { role: { $in: ['user', 'buyer'] }, displayId: { $regex: /^US-\d+$/i } },
      'displayId',
    ).lean()
    let maxNum = 1000
    for (const u of users) {
      const match = u.displayId.match(/^US-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return maxNum
  })

  return `US-${seq}`
}

/**
 * 4. Order Pattern : 26-SV-00001 (order id)
 * Year- SV- Order Number
 */
export async function getNextOrderNo() {
  const yy = getYearPrefix()
  const key = `order_${yy}`

  const seq = await getNextSequence(key, 1, async () => {
    const regex = new RegExp(`^${yy}-SV-(\\d+)$`, 'i')
    const orders = await Order.find({ orderNo: { $regex: regex } }, 'orderNo').lean()
    let maxNum = 0
    for (const o of orders) {
      const match = o.orderNo.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return maxNum
  })

  return `${yy}-SV-${String(seq).padStart(5, '0')}`
}

/**
 * 5. Dispute Pattern : 26-D-0001 (disputes id)
 */
export async function getNextDisputeNo() {
  const yy = getYearPrefix()
  const key = `dispute_${yy}`

  const seq = await getNextSequence(key, 1, async () => {
    const regex = new RegExp(`^${yy}-D-(\\d+)$`, 'i')
    const disputes = await Dispute.find({ disputeNo: { $regex: regex } }, 'disputeNo').lean()
    let maxNum = 0
    for (const d of disputes) {
      const match = d.disputeNo?.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return maxNum
  })

  return `${yy}-D-${String(seq).padStart(4, '0')}`
}

/**
 * 6. Wallet Transactions Pattern : 26-W-00001 (wallet transaction id)
 */
export async function getNextWalletTxId() {
  const yy = getYearPrefix()
  const key = `wallet_${yy}`

  const seq = await getNextSequence(key, 1, async () => {
    const regex = new RegExp(`^${yy}-W-(\\d+)$`, 'i')
    const requests = await WalletRequest.find({ transactionId: { $regex: regex } }, 'transactionId').lean()
    let maxNum = 0
    for (const r of requests) {
      const match = r.transactionId?.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return maxNum
  })

  return `${yy}-W-${String(seq).padStart(5, '0')}`
}

/**
 * 7. Payout Pattern : 26-P-00001 (payout pattern)
 */
export async function getNextPayoutNo() {
  const yy = getYearPrefix()
  const key = `payout_${yy}`

  const seq = await getNextSequence(key, 1, async () => {
    const regex = new RegExp(`^${yy}-P-(\\d+)$`, 'i')
    const payouts = await Payout.find({ payoutNo: { $regex: regex } }, 'payoutNo').lean()
    let maxNum = 0
    for (const p of payouts) {
      const match = p.payoutNo?.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return maxNum
  })

  return `${yy}-P-${String(seq).padStart(5, '0')}`
}

/**
 * Formatters for consistent rendering across panels
 */
export function formatSupplierId(userOrId) {
  if (!userOrId) return ''
  if (typeof userOrId === 'object') {
    if (userOrId.displayId) return userOrId.displayId
    if (userOrId.clientId && /^SPAK-\d+$/i.test(userOrId.clientId)) return userOrId.clientId
    const rawId = userOrId._id?.toString() || userOrId.id?.toString() || ''
    if (rawId) {
      // Deterministic 4-digit number from hex >= 1001
      const num = 1001 + (parseInt(rawId.slice(-4), 16) % 8999)
      return `SPAK-${num}`
    }
    return 'SPAK-1001'
  }
  const str = String(userOrId).trim()
  if (/^SPAK-\d+$/i.test(str)) return str
  const num = 1001 + (parseInt(str.slice(-4), 16) % 8999)
  return `SPAK-${isNaN(num) ? 1001 : num}`
}

export function formatUserId(userOrId) {
  if (!userOrId) return ''
  if (typeof userOrId === 'object') {
    if (userOrId.displayId) return userOrId.displayId
    if (userOrId.clientId && /^US-\d+$/i.test(userOrId.clientId)) return userOrId.clientId
    const rawId = userOrId._id?.toString() || userOrId.id?.toString() || ''
    if (rawId) {
      const num = 1001 + (parseInt(rawId.slice(-4), 16) % 8999)
      return `US-${num}`
    }
    return 'US-1001'
  }
  const str = String(userOrId).trim()
  if (/^US-\d+$/i.test(str)) return str
  const num = 1001 + (parseInt(str.slice(-4), 16) % 8999)
  return `US-${isNaN(num) ? 1001 : num}`
}

