import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Dispute from '../models/Dispute.js'
import WalletRequest from '../models/WalletRequest.js'
import {
  requestOrderCancellation,
  approveOrderCancellation,
  rejectOrderCancellation,
} from '../controllers/orderController.js'

mongoose.set('bufferCommands', false)

const restores = []
function stub(obj, key, fn) {
  restores.push([obj, key, obj[key]])
  obj[key] = fn
}
afterEach(() => {
  while (restores.length) {
    const [obj, key, original] = restores.pop()
    obj[key] = original
  }
})

function fakeRes() {
  const res = { statusCode: 200, body: undefined }
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    res.body = body
    return res
  }
  return res
}

test('Order Cancellation: User request rejected if reason is missing or < 5 chars', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()
  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-TEST01',
    user: { _id: userId, equals: (id) => id.toString() === userId.toString() },
    createdAt: new Date(),
    status: 'awaiting_dispatch',
    trackingStatus: 'awaiting_dispatch',
    isRefunded: false,
    isDispatched: false,
    save: async () => {},
    toSafeObject: () => ({ id: orderId.toString(), orderNo: 'ORD-TEST01' }),
  }

  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: userId, role: 'user' },
    body: { reason: 'bad' }, // less than 5 characters
  }
  const res = fakeRes()

  await requestOrderCancellation(req, res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /minimum 5 characters/i)
})

test('Order Cancellation: User request rejected if order placed > 12 hours ago', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()
  const order14HoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000)

  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-TEST02',
    user: { _id: userId, equals: (id) => id.toString() === userId.toString() },
    createdAt: order14HoursAgo,
    status: 'awaiting_dispatch',
    trackingStatus: 'awaiting_dispatch',
    isRefunded: false,
    isDispatched: false,
    save: async () => {},
    toSafeObject: () => ({ id: orderId.toString() }),
  }

  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: userId, role: 'user' },
    body: { reason: 'Customer changed mind after 14 hours' },
  }
  const res = fakeRes()

  await requestOrderCancellation(req, res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /12 hours/i)
})

test('Order Cancellation: Request within 12h sets status to cancellation_pending and notifies admin', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()
  const supplierId = new mongoose.Types.ObjectId()
  const order2HoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  let saved = false
  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-TEST03',
    user: { _id: userId, equals: (id) => id.toString() === userId.toString() },
    supplier: { _id: supplierId, equals: (id) => id.toString() === supplierId.toString() },
    product: { _id: new mongoose.Types.ObjectId() },
    createdAt: order2HoursAgo,
    status: 'awaiting_dispatch',
    trackingStatus: 'awaiting_dispatch',
    isRefunded: false,
    isDispatched: false,
    trackingTimeline: [],
    save: async () => { saved = true },
    toSafeObject: () => ({ id: orderId.toString(), status: 'cancellation_pending' }),
  }

  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))
  stub(Dispute, 'create', async () => ({}))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: userId, role: 'user' },
    body: { reason: 'Ordered incorrect size by mistake' },
  }
  const res = fakeRes()

  await requestOrderCancellation(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(saved, true)
  assert.equal(dummyOrder.status, 'cancellation_pending')
  assert.equal(dummyOrder.cancellationRequest.status, 'pending')
  assert.equal(dummyOrder.cancellationRequest.reason, 'Ordered incorrect size by mistake')
})

test('Order Cancellation: Admin approval BLOCKED if 12-hour limit has expired', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const adminId = new mongoose.Types.ObjectId()
  const order13HoursAgo = new Date(Date.now() - 13 * 60 * 60 * 1000)

  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-TEST04',
    createdAt: order13HoursAgo,
    status: 'cancellation_pending',
    trackingStatus: 'awaiting_dispatch',
    isRefunded: false,
    isDispatched: false,
    cancellationRequest: { status: 'pending', reason: 'Some reason' },
    save: async () => {},
  }

  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: adminId, role: 'admin' },
    body: { adminNote: 'Trying to approve late' },
  }
  const res = fakeRes()

  await approveOrderCancellation(req, res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /12-hour/i)
  assert.notEqual(dummyOrder.status, 'cancelled')
})

test('Order Cancellation: Admin approval within 12h cancels order and executes refund', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const adminId = new mongoose.Types.ObjectId()
  const buyerId = new mongoose.Types.ObjectId()
  const prodId = new mongoose.Types.ObjectId()
  const order1HourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

  let orderSaved = false
  let buyerSaved = false
  const dummyBuyer = {
    _id: buyerId,
    walletBalance: 50.00,
    save: async () => { buyerSaved = true },
  }

  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-TEST05',
    user: { _id: buyerId },
    supplier: { _id: new mongoose.Types.ObjectId() },
    product: { _id: prodId },
    createdAt: order1HourAgo,
    total: 25.00,
    quantity: 1,
    paymentMethod: 'wallet',
    status: 'cancellation_pending',
    trackingStatus: 'awaiting_dispatch',
    isRefunded: false,
    isDispatched: false,
    trackingTimeline: [],
    cancellationRequest: { status: 'pending', reason: 'Legitimate defect' },
    save: async () => { orderSaved = true },
    toSafeObject: () => ({ id: orderId.toString(), status: 'cancelled' }),
  }

  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))
  stub(User, 'findById', async () => dummyBuyer)
  // Atomic claim on the order before refunding (prevents double approval)
  stub(Order, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(Product, 'findById', async () => ({ quantity: 5, save: async () => {} }))
  stub(Dispute, 'updateMany', async () => ({}))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: adminId, role: 'admin' },
    body: { adminNote: 'Verified genuine request within 1h' },
  }
  const res = fakeRes()

  await approveOrderCancellation(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(orderSaved, true)
  assert.equal(dummyOrder.status, 'cancelled')
  assert.equal(dummyOrder.isRefunded, true)
  assert.equal(dummyOrder.refundAmount, 25.00)
  assert.equal(dummyBuyer.walletBalance, 75.00) // 50 + 25 refunded
  assert.equal(buyerSaved, true)
})

test('Order Cancellation: Admin rejection restores active status and logs rejection note', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const adminId = new mongoose.Types.ObjectId()

  let orderSaved = false
  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-TEST06',
    status: 'cancellation_pending',
    isDispatched: false,
    trackingTimeline: [],
    cancellationRequest: { status: 'pending', reason: 'Unreasonable claim' },
    save: async () => { orderSaved = true },
    toSafeObject: () => ({ id: orderId.toString(), status: 'awaiting_dispatch' }),
  }

  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))
  stub(Dispute, 'updateMany', async () => ({}))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: adminId, role: 'admin' },
    body: { rejectionReason: 'Dispute investigated: Item already prepared custom engraved.' },
  }
  const res = fakeRes()

  await rejectOrderCancellation(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(orderSaved, true)
  assert.equal(dummyOrder.status, 'awaiting_dispatch')
  assert.equal(dummyOrder.cancellationRequest.status, 'rejected')
  assert.equal(dummyOrder.cancellationRequest.rejectionReason, 'Dispute investigated: Item already prepared custom engraved.')
})

test('Order Cancellation Refund: Full breakdown created with supplier reversed and commission refunded', async () => {
  const orderId = new mongoose.Types.ObjectId()
  const adminId = new mongoose.Types.ObjectId()
  const buyerId = new mongoose.Types.ObjectId()
  const supplierId = new mongoose.Types.ObjectId()
  const orderTime = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago

  const dummyBuyer = {
    _id: buyerId,
    walletBalance: 100.00,
    save: async () => {},
  }

  const dummyOrder = {
    _id: orderId,
    orderNo: 'ORD-REFUND-01',
    user: { _id: buyerId },
    supplier: { _id: supplierId },
    product: { _id: new mongoose.Types.ObjectId() },
    createdAt: orderTime,
    total: 100.00,
    commission: 8.00, // 8% commission
    quantity: 2,
    paymentMethod: 'wallet',
    status: 'cancellation_pending',
    trackingStatus: 'awaiting_dispatch',
    payoutStatus: 'pending',
    isRefunded: false,
    isDispatched: false,
    trackingTimeline: [],
    cancellationRequest: { status: 'pending', reason: 'Customer requested cancellation' },
    save: async () => {},
    toSafeObject: () => ({ id: orderId.toString(), orderNo: 'ORD-REFUND-01', status: 'cancelled' }),
  }

  let createdWalletTx = null
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => dummyOrder,
      }),
    }),
  }))
  stub(User, 'findById', async () => dummyBuyer)
  // Atomic claim on the order before refunding (prevents double approval)
  stub(Order, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(Product, 'findById', async () => ({ quantity: 10, save: async () => {} }))
  stub(Dispute, 'updateMany', async () => ({}))
  stub(WalletRequest, 'create', async (doc) => {
    createdWalletTx = doc
    return doc
  })

  const req = {
    params: { id: orderId.toString() },
    user: { _id: adminId, role: 'admin' },
    body: { adminNote: 'Approved refund within policy window' },
  }
  const res = fakeRes()

  await approveOrderCancellation(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(dummyOrder.status, 'cancelled')
  assert.equal(dummyOrder.payoutStatus, 'cancelled') // Supplier pending payable revoked
  assert.equal(dummyOrder.isRefunded, true)
  assert.equal(dummyBuyer.walletBalance, 200.00) // $100 existing + $100 full refund

  // Verify WalletRequest created for Payment Management
  assert.ok(createdWalletTx, 'WalletRequest must be created')
  assert.equal(createdWalletTx.amount, 100.00) // 100% credited to user
  assert.equal(createdWalletTx.supplierAmount, 92.00) // $100 - $8 commission reversed from supplier
  assert.equal(createdWalletTx.commissionRefunded, 8.00) // $8 commission refunded
  assert.equal(createdWalletTx.orderNo, 'ORD-REFUND-01')
  assert.equal(createdWalletTx.refundType, 'order_cancellation')
  assert.equal(createdWalletTx.paymentMethod, 'wallet_refund')
  assert.equal(createdWalletTx.status, 'approved')
  assert.equal(createdWalletTx.bankTid, 'REFUND-ORD-REFUND-01')
})

test('WalletRequest Model: toSafeObject formats order refund details for Payment Management', () => {
  const reqDoc = new WalletRequest({
    transactionId: '26-W-99001',
    user: new mongoose.Types.ObjectId(),
    amount: 150.00,
    depositCurrency: 'USD',
    bankTid: 'REFUND-ORD-99001',
    paymentMethod: 'wallet_refund',
    refundType: 'order_cancellation',
    orderNo: 'ORD-99001',
    supplierAmount: 138.00,
    commissionRefunded: 12.00,
    status: 'approved',
  })

  const safe = reqDoc.toSafeObject('Apex Retailers')
  assert.equal(safe.transactionId, '26-W-99001')
  assert.equal(safe.amount, 150.00)
  assert.equal(safe.orderNo, 'ORD-99001')
  assert.equal(safe.refundType, 'order_cancellation')
  assert.equal(safe.supplierAmount, 138.00)
  assert.equal(safe.commissionRefunded, 12.00)
  assert.equal(safe.isRefund, true)
  assert.equal(safe.status, 'approved')
})
