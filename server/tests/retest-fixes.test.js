// Regression tests for the Round-2 QA fixes (N1, N2, N5, N6, N7, H3, H4 in the re-test report).
// Runs the real controllers/middleware with database calls stubbed, so no MongoDB is needed.
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Dispute from '../models/Dispute.js'
import Role from '../models/Role.js'
import WalletRequest from '../models/WalletRequest.js'
import { approveOrderCancellation, updateOrderStatus, lookupOrder } from '../controllers/orderController.js'
import { resolveDispute } from '../controllers/disputeController.js'
import { requireWmsSecret } from '../middleware/wmsSecret.js'
import orderRoutes from '../routes/orderRoutes.js'

mongoose.set('bufferCommands', false)

const restores = []
function stub(obj, key, fn) {
  restores.push([obj, key, obj[key]])
  obj[key] = fn
}
const mustNotBeCalled = (name) => () => {
  throw new Error(`${name} must not be called`)
}
afterEach(() => {
  while (restores.length) {
    const [obj, key, original] = restores.pop()
    obj[key] = original
  }
  delete process.env.WMS_WEBHOOK_SECRET
})

function fakeRes() {
  const res = { statusCode: 200, body: undefined }
  res.status = (code) => ((res.statusCode = code), res)
  res.json = (body) => ((res.body = body), res)
  return res
}

const populated = (doc) => () => ({ populate: () => ({ populate: () => ({ populate: async () => doc }) }) })
// Query stub that accepts any number of .populate() calls and resolves to doc when awaited.
const anyPopulate = (doc) => () => {
  const query = { populate: () => query, then: (ok, fail) => Promise.resolve(doc).then(ok, fail) }
  return query
}

function pendingOrder(overrides = {}) {
  const id = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()
  const supplierId = new mongoose.Types.ObjectId()
  return {
    _id: id,
    orderNo: 'ORD-QA001',
    user: { _id: userId, equals: (x) => String(x) === String(userId) },
    supplier: { _id: supplierId, equals: (x) => String(x) === String(supplierId) },
    product: { _id: new mongoose.Types.ObjectId() },
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    total: 500,
    commission: 40,
    quantity: 1,
    paymentMethod: 'wallet',
    status: 'cancellation_pending',
    trackingStatus: 'awaiting_dispatch',
    isRefunded: false,
    isDispatched: false,
    trackingTimeline: [],
    cancellationRequest: { status: 'pending', reason: 'changed my mind' },
    save: async () => {},
    toSafeObject() {
      return { id: String(this._id), status: this.status }
    },
    ...overrides,
  }
}

const admin = () => ({ _id: new mongoose.Types.ObjectId(), role: 'admin' })

// ---------- N1: COD cancellation must not create money ----------
test('N1: approving cancellation of a Cash-on-Delivery order does not credit the wallet', async () => {
  const buyer = { walletBalance: 0, save: async () => {} }
  const order = pendingOrder({ paymentMethod: 'cod' })
  stub(Order, 'findById', populated(order))
  stub(Order, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(User, 'findById', async () => buyer)
  stub(WalletRequest, 'create', mustNotBeCalled('WalletRequest.create'))
  stub(Product, 'findById', async () => ({ quantity: 5, save: async () => {} }))
  stub(Dispute, 'updateMany', async () => ({}))

  const res = fakeRes()
  await approveOrderCancellation({ params: { id: String(order._id) }, user: admin(), body: {} }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(buyer.walletBalance, 0)
  assert.equal(order.status, 'cancelled')
  assert.equal(order.refundAmount, 0)
})

test('N1: a wallet-paid order is still refunded in full', async () => {
  const buyer = { walletBalance: 10, save: async () => {} }
  const order = pendingOrder()
  stub(Order, 'findById', populated(order))
  stub(Order, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(User, 'findById', async () => buyer)
  stub(WalletRequest, 'create', async (d) => d)
  stub(Product, 'findById', async () => ({ quantity: 5, save: async () => {} }))
  stub(Dispute, 'updateMany', async () => ({}))

  const res = fakeRes()
  await approveOrderCancellation({ params: { id: String(order._id) }, user: admin(), body: {} }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(buyer.walletBalance, 510)
})

// ---------- N6: no double refund ----------
test('N6: a second approval of the same cancellation is refused and refunds nothing', async () => {
  const order = pendingOrder()
  stub(Order, 'findById', populated(order))
  stub(Order, 'updateOne', async () => ({ modifiedCount: 0 })) // another request already claimed it
  stub(User, 'findById', mustNotBeCalled('User.findById'))

  const res = fakeRes()
  await approveOrderCancellation({ params: { id: String(order._id) }, user: admin(), body: {} }, res)
  assert.equal(res.statusCode, 409)
})

// ---------- N2: dispute refunds ----------
function openCancellationDispute(order) {
  return {
    _id: new mongoose.Types.ObjectId(),
    disputeNo: 'DSP-QA1',
    type: 'order_cancellation',
    status: 'open',
    order: { _id: order._id },
    save: async () => {},
    toSafeObject: () => ({}),
  }
}

test('N2: resolving a cancellation dispute on a COD order cancels it without crediting the wallet', async () => {
  const order = pendingOrder({ paymentMethod: 'cod' })
  stub(Dispute, 'findById', anyPopulate(openCancellationDispute(order)))
  stub(Order, 'findById', async () => order)
  stub(Order, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(User, 'findByIdAndUpdate', mustNotBeCalled('User.findByIdAndUpdate'))
  stub(WalletRequest, 'create', mustNotBeCalled('WalletRequest.create'))
  stub(Product, 'findByIdAndUpdate', async () => ({}))

  const res = fakeRes()
  await resolveDispute({ params: { id: 'x' }, user: admin(), body: {} }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(order.status, 'cancelled')
  assert.equal(order.refundAmount, 0)
})

test('N2: a dispute refund larger than the order total is rejected', async () => {
  const order = pendingOrder()
  stub(Dispute, 'findById', anyPopulate(openCancellationDispute(order)))
  stub(Order, 'findById', async () => order)
  stub(User, 'findByIdAndUpdate', mustNotBeCalled('User.findByIdAndUpdate'))

  const res = fakeRes()
  await resolveDispute({ params: { id: 'x' }, user: admin(), body: { refundAmount: 5000 } }, res)
  assert.equal(res.statusCode, 400)
})

// ---------- N7: supplier cancellation follows the request/approval policy ----------
test('N7: a supplier setting status "cancelled" creates a pending request, with no instant refund', async () => {
  const order = pendingOrder({ status: 'awaiting_dispatch', cancellationRequest: undefined })
  stub(Order, 'findById', populated(order))
  stub(Order, 'updateOne', mustNotBeCalled('Order.updateOne'))
  stub(User, 'findByIdAndUpdate', mustNotBeCalled('User.findByIdAndUpdate'))
  stub(Dispute, 'create', async () => ({}))

  const res = fakeRes()
  await updateOrderStatus(
    { params: { id: String(order._id) }, user: { _id: order.supplier._id, role: 'supplier' }, body: { status: 'cancelled' } },
    res,
  )
  assert.equal(res.statusCode, 200)
  assert.equal(order.status, 'cancellation_pending')
  assert.equal(order.cancellationRequest.status, 'pending')
})

// ---------- N5: sub-admins need the sales permission to approve cancellations ----------
async function runRouteGuards(path, method, req) {
  const layer = orderRoutes.stack.find((l) => l.route?.path === path && l.route.methods[method])
  const handlers = layer.route.stack.map((s) => s.handle)
  const res = fakeRes()
  // Skip protect + authorize (JWT); run the permission guards, stop before the controller.
  for (const handle of handlers.slice(2, -1)) {
    let advanced = false
    await handle(req, res, () => {
      advanced = true
    })
    if (!advanced) return res
  }
  return { statusCode: 'reached-controller' }
}

test('N5: a sub-admin without sales permission cannot approve a cancellation', async () => {
  stub(Role, 'findById', async () => ({ name: 'Support', permissions: ['admin.sales.view'] }))
  const req = { user: { _id: new mongoose.Types.ObjectId(), role: 'admin', adminRoleId: new mongoose.Types.ObjectId() } }
  const res = await runRouteGuards('/:id/approve-cancel', 'post', req)
  assert.equal(res.statusCode, 403)
})

test('N5: a sub-admin with sales.manage and a Super Admin can approve', async () => {
  stub(Role, 'findById', async () => ({ name: 'Sales', permissions: ['admin.sales.manage'] }))
  const sub = { user: { _id: new mongoose.Types.ObjectId(), role: 'admin', adminRoleId: new mongoose.Types.ObjectId() } }
  assert.equal((await runRouteGuards('/:id/approve-cancel', 'post', sub)).statusCode, 'reached-controller')
  const superAdmin = { user: { _id: new mongoose.Types.ObjectId(), role: 'admin' } }
  assert.equal((await runRouteGuards('/:id/approve-cancel', 'post', superAdmin)).statusCode, 'reached-controller')
})

test('N5: buyers and suppliers are not blocked by the admin permission guard', async () => {
  const buyer = { user: { _id: new mongoose.Types.ObjectId(), role: 'user' } }
  assert.equal((await runRouteGuards('/:id/cancel', 'post', buyer)).statusCode, 'reached-controller')
  const supplier = { user: { _id: new mongoose.Types.ObjectId(), role: 'supplier' } }
  assert.equal((await runRouteGuards('/:id/status', 'patch', supplier)).statusCode, 'reached-controller')
})

// ---------- H4: anonymous order lookup ----------
test('H4: anonymous order lookup is refused (no buyer details exposed)', async () => {
  stub(Order, 'findById', mustNotBeCalled('Order.findById'))
  stub(Order, 'findOne', mustNotBeCalled('Order.findOne'))
  const res = fakeRes()
  await lookupOrder({ query: { ref: 'ORD-QA001' } }, res)
  assert.equal(res.statusCode, 401)
})

// ---------- H3: WMS webhook secret ----------
test('H3: WMS webhook secret is enforced once configured', () => {
  let passed = false
  const next = () => {
    passed = true
  }

  requireWmsSecret({ headers: {} }, fakeRes(), next)
  assert.equal(passed, true, 'unset secret keeps the existing integration working')

  process.env.WMS_WEBHOOK_SECRET = 's3cret-value'
  passed = false
  const denied = fakeRes()
  requireWmsSecret({ headers: { 'x-wms-secret': 'wrong' } }, denied, next)
  assert.equal(denied.statusCode, 401)
  assert.equal(passed, false)

  requireWmsSecret({ headers: { 'x-wms-secret': 's3cret-value' } }, fakeRes(), next)
  assert.equal(passed, true)
})
