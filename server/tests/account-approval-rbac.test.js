import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import User from '../models/User.js'
import BusinessProfile from '../models/BusinessProfile.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import { register } from '../controllers/authController.js'
import { createOrder, reviewSupplierOrder } from '../controllers/orderController.js'
import { getBalance, createWalletRequest } from '../controllers/walletController.js'
import { createProduct, updateMyProduct } from '../controllers/productController.js'
import { approveAccount, rejectAccount } from '../controllers/adminController.js'
import { requireApproved } from '../middleware/auth.js'

process.env.JWT_SECRET ||= 'test-secret'
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
  const res = { statusCode: 200, body: undefined, cookies: {}, req: { secure: false, headers: {} } }
  res.status = (code) => ((res.statusCode = code), res)
  res.json = (body) => ((res.body = body), res)
  res.cookie = (name, value) => ((res.cookies[name] = value), res)
  res.clearCookie = (name) => (delete res.cookies[name], res)
  return res
}

// ── Test 1: New User registration starts with status 'pending_approval' ──
test('RBAC: New User registration sets status to pending_approval', async () => {
  stub(User, 'findOne', async () => null)
  stub(BusinessProfile, 'findOne', async () => null)

  let createdUserDoc = null
  stub(User, 'create', async (data) => {
    createdUserDoc = {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      toSafeObject: () => ({ ...data, id: 'user_123' }),
    }
    return createdUserDoc
  })
  stub(BusinessProfile, 'findOneAndUpdate', async () => ({}))

  const req = {
    body: {
      role: 'user',
      ownerName: 'Buyer Test',
      email: 'buyer@test.local',
      password: 'password123',
      confirmPassword: 'password123',
      companyName: 'Buyer Trading Co',
      companyEmail: 'info@buyertrading.local',
      companyPhone: '+923001112233',
      companyAddress: 'Lahore, Pakistan',
      ownerPhone: '+923001112233',
      ownerAddress: 'Lahore, Pakistan',
      bankName: 'Meezan Bank',
      accountHolderName: 'Buyer Test',
      accountNumberOrIban: 'T' + '1'.repeat(33),
      idCardNumber: '35201-1234567-1',
      idCardUrl: '/uploads/idcard-test.png',
    },
  }
  const res = fakeRes()

  await register(req, res)
  assert.equal(res.statusCode, 201)
  assert.equal(createdUserDoc.status, 'pending_approval')
})

// ── Test 2: Unapproved User cannot place orders ──
test('RBAC: Unapproved User is blocked from placing orders (403 Forbidden)', async () => {
  const pendingUser = {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'Pending Buyer',
    email: 'pendingbuyer@test.local',
    role: 'user',
    status: 'pending_approval',
    walletBalance: 500,
  }

  stub(User, 'findById', async () => pendingUser)
  stub(Product, 'findById', async () => ({
    _id: new mongoose.Types.ObjectId(),
    name: 'Sample Product',
    price: 100,
    quantity: 10,
    status: 'active',
  }))

  const req = {
    user: pendingUser,
    body: {
      productId: new mongoose.Types.ObjectId().toString(),
      quantity: 1,
      paymentMethod: 'wallet',
      shippingAddress: {
        fullName: 'Pending Buyer',
        phone: '+923001234567',
        addressLine: '123 Main St',
        city: 'Karachi',
        country: 'Pakistan',
      },
    },
  }
  const res = fakeRes()

  await createOrder(req, res)
  assert.equal(res.statusCode, 403)
  assert.match(res.body.message, /pending admin approval/i)
})

// ── Test 3: Unapproved User cannot access wallet balance or submit requests ──
test('RBAC: Unapproved User cannot access wallet balance or submit requests (403)', async () => {
  const pendingUser = {
    _id: new mongoose.Types.ObjectId(),
    role: 'user',
    status: 'pending_approval',
  }

  const req = { user: pendingUser, body: {} }
  const resBalance = fakeRes()
  await getBalance(req, resBalance)
  assert.equal(resBalance.statusCode, 403)
  assert.match(resBalance.body.message, /pending admin approval/i)

  const resRequest = fakeRes()
  await createWalletRequest(req, resRequest)
  assert.equal(resRequest.statusCode, 403)
  assert.match(resRequest.body.message, /pending admin approval/i)
})

// ── Test 4: Unapproved Supplier cannot create or edit products ──
test('RBAC: Unapproved Supplier cannot create or edit products (403)', async () => {
  const pendingSupplier = {
    _id: new mongoose.Types.ObjectId(),
    role: 'supplier',
    status: 'pending_approval',
  }

  const reqCreate = { user: pendingSupplier, body: {}, files: [] }
  const resCreate = fakeRes()
  await createProduct(reqCreate, resCreate)
  assert.equal(resCreate.statusCode, 403)
  assert.match(resCreate.body.message, /pending admin approval/i)

  const reqEdit = { user: pendingSupplier, params: { id: new mongoose.Types.ObjectId().toString() }, body: {}, files: [] }
  const resEdit = fakeRes()
  await updateMyProduct(reqEdit, resEdit)
  assert.equal(resEdit.statusCode, 403)
  assert.match(resEdit.body.message, /pending admin approval/i)
})

// ── Test 5: Unapproved Supplier cannot review orders ──
test('RBAC: requireApproved blocks unapproved supplier or user from restricted actions', () => {
  const pendingUser = { role: 'supplier', status: 'pending_approval' }
  const req = { user: pendingUser }
  const res = fakeRes()
  let nextCalled = false

  requireApproved(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
  assert.match(res.body.message, /pending admin approval/i)
})

// ── Test 6: Admin approves account, activating status to 'approved' ──
test('RBAC: Admin approves account, updating status to approved and enabling access', async () => {
  const targetId = new mongoose.Types.ObjectId()
  const mockUser = {
    _id: targetId,
    fullName: 'Test Candidate',
    email: 'candidate@test.local',
    role: 'user',
    status: 'pending_approval',
    save: async function () { return this },
    toSafeObject: function () { return { id: this._id, status: this.status, role: this.role } },
  }

  stub(User, 'findById', async () => mockUser)
  stub(BusinessProfile, 'findOneAndUpdate', async () => ({}))

  const req = {
    params: { id: targetId.toString() },
    user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
    ip: '127.0.0.1',
  }
  const res = fakeRes()

  await approveAccount(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(mockUser.status, 'approved')
  assert.match(res.body.message, /approved successfully/i)
})

// ── Test 7: Admin rejects account, updating status to 'rejected' ──
test('RBAC: Admin rejects account, updating status to rejected', async () => {
  const targetId = new mongoose.Types.ObjectId()
  const mockUser = {
    _id: targetId,
    fullName: 'Rejected Candidate',
    email: 'rejected@test.local',
    role: 'supplier',
    status: 'pending_approval',
    save: async function () { return this },
    toSafeObject: function () { return { id: this._id, status: this.status, role: this.role } },
  }

  stub(User, 'findById', async () => mockUser)
  stub(BusinessProfile, 'findOneAndUpdate', async () => ({}))

  const req = {
    params: { id: targetId.toString() },
    user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
    ip: '127.0.0.1',
  }
  const res = fakeRes()

  await rejectAccount(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(mockUser.status, 'rejected')
  assert.match(res.body.message, /Account rejected/i)
})
