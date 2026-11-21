import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import WalletRequest from '../models/WalletRequest.js'
import Notification from '../models/Notification.js'
import { reviewSupplierOrder } from '../controllers/orderController.js'

// Disable bufferCommands so unstubbed queries fail immediately
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

const supplierId = new mongoose.Types.ObjectId()
const buyerId = new mongoose.Types.ObjectId()
const orderId = new mongoose.Types.ObjectId()
const productId = new mongoose.Types.ObjectId()

function createMockOrder(overrides = {}) {
  const doc = {
    _id: orderId,
    id: orderId.toString(),
    orderNo: '26-SV-00099',
    supplier: supplierId,
    user: buyerId,
    product: productId,
    productName: 'Ergonomic Leather Chair',
    quantity: 2,
    unitPrice: 100,
    total: 200,
    commission: 16,
    status: 'awaiting_dispatch',
    trackingStatus: 'placed',
    supplierReviewStatus: 'pending_review',
    supplierTermsAccepted: false,
    paymentMethod: 'wallet',
    isRefunded: false,
    refundAmount: 0,
    trackingTimeline: [],
    save: async function () { return this },
    toSafeObject: function () {
      return {
        id: this.id,
        orderNo: this.orderNo,
        status: this.status,
        supplierReviewStatus: this.supplierReviewStatus,
        supplierTermsAccepted: this.supplierTermsAccepted,
        supplierRejectionReason: this.supplierRejectionReason,
      }
    },
    ...overrides,
  }
  return doc
}

// 1. Unauthorized access check
test('supplier-review: rejects request if caller is not the supplier or admin', async () => {
  const order = createMockOrder()
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => order,
      }),
    }),
  }))

  const randomUserId = new mongoose.Types.ObjectId()
  const req = {
    params: { id: orderId.toString() },
    user: { _id: randomUserId, role: 'supplier' },
    body: { decision: 'accept', termsAccepted: true },
  }
  const res = fakeRes()
  await reviewSupplierOrder(req, res)

  assert.equal(res.statusCode, 403)
  assert.match(res.body.message, /not authorized/i)
})

// 2. Requires valid decision
test('supplier-review: rejects invalid decision', async () => {
  const order = createMockOrder()
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => order,
      }),
    }),
  }))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: supplierId, role: 'supplier' },
    body: { decision: 'maybe' },
  }
  const res = fakeRes()
  await reviewSupplierOrder(req, res)

  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /must be either 'accept' or 'reject'/i)
})

// 3. Accept requires termsAccepted = true
test('supplier-review: accept requires termsAccepted to be true', async () => {
  const order = createMockOrder()
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => order,
      }),
    }),
  }))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: supplierId, role: 'supplier' },
    body: { decision: 'accept', termsAccepted: false },
  }
  const res = fakeRes()
  await reviewSupplierOrder(req, res)

  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /terms & conditions/i)
})

// 4. Successful Accept Order
test('supplier-review: successfully accepts order and records terms agreement', async () => {
  const order = createMockOrder()
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => order,
      }),
    }),
  }))

  const notificationsCreated = []
  stub(Notification, 'create', async (data) => {
    notificationsCreated.push(data)
    return data
  })

  const req = {
    params: { id: orderId.toString() },
    user: { _id: supplierId, role: 'supplier', fullName: 'Sakina Supplier' },
    body: { decision: 'accept', termsAccepted: true },
  }
  const res = fakeRes()
  await reviewSupplierOrder(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(order.supplierReviewStatus, 'accepted')
  assert.equal(order.supplierTermsAccepted, true)
  assert.ok(order.supplierReviewedAt)
  assert.ok(order.trackingTimeline.length > 0)
  assert.equal(res.body.order.supplierReviewStatus, 'accepted')
})

// 5. Reject requires valid reason
test('supplier-review: reject requires minimum 5 character reason', async () => {
  const order = createMockOrder()
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => order,
      }),
    }),
  }))

  const req = {
    params: { id: orderId.toString() },
    user: { _id: supplierId, role: 'supplier' },
    body: { decision: 'reject', rejectionReason: 'bad' },
  }
  const res = fakeRes()
  await reviewSupplierOrder(req, res)

  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /minimum 5 characters/i)
})

// 6. Successful Reject Order: 100% wallet refund & inventory restock
test('supplier-review: successfully rejects order, issues 100% refund, and restores stock', async () => {
  const order = createMockOrder({ total: 200, commission: 16, quantity: 2 })
  stub(Order, 'findById', () => ({
    populate: () => ({
      populate: () => ({
        populate: async () => order,
      }),
    }),
  }))

  const buyerDoc = {
    _id: buyerId,
    walletBalance: 50,
    save: async function () { return this },
  }
  stub(User, 'findById', async (id) => {
    if (id.toString() === buyerId.toString()) return buyerDoc
    return null
  })

  const productDoc = {
    _id: productId,
    quantity: 10,
    save: async function () { return this },
  }
  stub(Product, 'findById', async () => productDoc)

  const walletRequestsCreated = []
  stub(WalletRequest, 'create', async (data) => {
    walletRequestsCreated.push(data)
    return data
  })

  const notificationsCreated = []
  stub(Notification, 'create', async (data) => {
    notificationsCreated.push(data)
    return data
  })

  const req = {
    params: { id: orderId.toString() },
    user: { _id: supplierId, role: 'supplier', fullName: 'Sakina Supplier' },
    body: {
      decision: 'reject',
      rejectionReason: 'Out of Stock - Fabric shortage from manufacturer',
    },
  }
  const res = fakeRes()
  await reviewSupplierOrder(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(order.supplierReviewStatus, 'rejected')
  assert.equal(order.status, 'cancelled')
  assert.equal(order.isRefunded, true)
  assert.equal(order.refundAmount, 200)

  // Buyer wallet refunded: 50 + 200 = 250
  assert.equal(buyerDoc.walletBalance, 250)

  // Product stock restored: 10 + 2 = 12
  assert.equal(productDoc.quantity, 12)

  // WalletRequest transaction logged
  assert.equal(walletRequestsCreated.length, 1)
  assert.equal(walletRequestsCreated[0].amount, 200)
  assert.equal(walletRequestsCreated[0].refundType, 'supplier_rejection')
})
