// Regression tests for the critical security fixes (C1-C7 in the QA report).
// Runs the real controller code with database calls stubbed, so no MongoDB is needed.
// Run: npm test
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { adminRegister, googleAuth } from '../controllers/authController.js'
import { createOrder } from '../controllers/orderController.js'
import { stripSettingSecrets } from '../controllers/walletController.js'
import { submitBusinessDetails } from '../controllers/businessController.js'
import { updateAccount, deleteAccount, createAccount } from '../controllers/adminController.js'
import walletRoutes from '../routes/walletRoutes.js'

process.env.JWT_SECRET ||= 'test-secret'
// Any DB call that is not stubbed fails fast instead of hanging.
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
})

function fakeRes() {
  const res = { statusCode: 200, body: undefined, cookies: {}, req: { secure: false, headers: {} } }
  res.status = (code) => ((res.statusCode = code), res)
  res.json = (body) => ((res.body = body), res)
  res.cookie = (name, value) => ((res.cookies[name] = value), res)
  res.clearCookie = (name) => (delete res.cookies[name], res)
  return res
}

const superAdmin = () =>
  new User({ fullName: 'Root', email: 'root@test.local', password: 'x', role: 'admin', status: 'approved' })
const subAdmin = () =>
  new User({
    fullName: 'Helper',
    email: 'helper@test.local',
    password: 'x',
    role: 'admin',
    status: 'approved',
    adminRoleId: new mongoose.Types.ObjectId(),
  })

const adminBody = { fullName: 'New Admin', email: 'new@test.local', password: 'secret12', confirmPassword: 'secret12' }

// ---------- C1: admin registration ----------
test('C1: anonymous admin registration is refused once an admin exists', async () => {
  stub(User, 'countDocuments', async () => 1)
  stub(User, 'create', mustNotBeCalled('User.create'))
  const res = fakeRes()
  await adminRegister({ body: adminBody }, res)
  assert.equal(res.statusCode, 403)
})

test('C1: the very first admin can still bootstrap the system', async () => {
  stub(User, 'countDocuments', async () => 0)
  stub(User, 'findOne', async () => null)
  stub(User, 'create', async (data) => new User(data))
  const res = fakeRes()
  await adminRegister({ body: adminBody }, res)
  assert.equal(res.statusCode, 201)
  assert.ok(res.cookies.sellvro_auth, 'bootstrap admin is logged in')
})

test('C1: a Super Admin creating an admin keeps their own session', async () => {
  stub(User, 'countDocuments', async () => 1)
  stub(User, 'findOne', async () => null)
  stub(User, 'create', async (data) => new User(data))
  const res = fakeRes()
  await adminRegister({ body: adminBody, user: superAdmin() }, res)
  assert.equal(res.statusCode, 201)
  assert.equal(res.cookies.sellvro_auth, undefined)
})

test('C1: a sub-admin cannot use admin registration', async () => {
  stub(User, 'countDocuments', async () => 1)
  stub(User, 'create', mustNotBeCalled('User.create'))
  const res = fakeRes()
  await adminRegister({ body: adminBody, user: subAdmin() }, res)
  assert.equal(res.statusCode, 403)
})

// ---------- C2: Google sign-in ----------
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  '366677857468-va47f432ro1haif68t6glvdpp895tq36.apps.googleusercontent.com'

const googleSays = (info) => async () => ({ ok: true, json: async () => info })

test('C2: Google login with only an email (no token) is rejected', async () => {
  stub(User, 'findOne', mustNotBeCalled('User.findOne'))
  const res = fakeRes()
  await googleAuth({ body: { email: 'victim@test.local' } }, res)
  assert.equal(res.statusCode, 400)
})

test('C2: a token Google issued to another app is rejected', async () => {
  stub(globalThis, 'fetch', googleSays({ aud: 'other-app', azp: 'other-app', email: 'victim@test.local', email_verified: 'true' }))
  stub(User, 'findOne', mustNotBeCalled('User.findOne'))
  const res = fakeRes()
  await googleAuth({ body: { accessToken: 'tok', email: 'victim@test.local' } }, res)
  assert.equal(res.statusCode, 401)
})

test('C2: an invalid/expired token is rejected', async () => {
  stub(globalThis, 'fetch', async () => ({ ok: false, json: async () => ({}) }))
  stub(User, 'findOne', mustNotBeCalled('User.findOne'))
  const res = fakeRes()
  await googleAuth({ body: { accessToken: 'bad' } }, res)
  assert.equal(res.statusCode, 401)
})

test('C2: a verified token logs in the token owner, ignoring any body email', async () => {
  stub(globalThis, 'fetch', googleSays({ aud: GOOGLE_CLIENT_ID, email: 'owner@test.local', email_verified: 'true', sub: 'g-1' }))
  stub(User, 'findOne', async (query) => {
    assert.equal(query.email, 'owner@test.local')
    return new User({ fullName: 'Owner', email: 'owner@test.local', password: 'x', role: 'user', status: 'approved', googleId: 'g-1' })
  })
  const res = fakeRes()
  await googleAuth({ body: { accessToken: 'tok', email: 'victim@test.local' } }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.user.email, 'owner@test.local')
})

// ---------- C3: free wallet credit ----------
test('C3: the quick-credit (free money) route no longer exists', () => {
  const paths = walletRoutes.stack.map((layer) => layer.route?.path).filter(Boolean)
  assert.ok(!paths.includes('/quick-credit'), `routes: ${paths.join(', ')}`)
})

// ---------- C4: guest checkout ----------
const productId = new mongoose.Types.ObjectId().toString()
const fakeProduct = () => ({ _id: productId, status: 'active', quantity: 10, price: 5, commission: 0, save: async () => {} })
const shippingAddress = { fullName: 'Guest', phone: '03000000000', addressLine: 'Street 1', city: 'Lahore' }

test('C4: a guest cannot pay with a wallet (and no account is looked up)', async () => {
  stub(Product, 'findById', async () => fakeProduct())
  stub(User, 'findOne', mustNotBeCalled('User.findOne'))
  const res = fakeRes()
  await createOrder(
    { body: { productId, quantity: 1, paymentMethod: 'wallet', email: 'victim@test.local', shippingAddress } },
    res,
  )
  assert.equal(res.statusCode, 401)
})

test('C4: a guest order is never attached to an existing account', async () => {
  const victim = new User({ fullName: 'Victim', email: 'victim@test.local', password: 'x', role: 'user', status: 'approved', walletBalance: 100 })
  stub(Product, 'findById', async () => fakeProduct())
  stub(User, 'findOne', async () => victim)
  stub(User, 'create', mustNotBeCalled('User.create'))
  const res = fakeRes()
  await createOrder(
    { body: { productId, quantity: 1, paymentMethod: 'cod', email: 'victim@test.local', shippingAddress } },
    res,
  )
  assert.equal(res.statusCode, 409)
  assert.equal(victim.walletBalance, 100)
})

// ---------- C5: settings secrets ----------
test('C5: wallet settings shown to users have provider secrets removed', () => {
  const id = new mongoose.Types.ObjectId()
  const out = stripSettingSecrets({
    _id: id,
    marketplaceFeePercent: 8,
    international: {
      wise: { apiKey: 'live_wise', accountNumber: '123' },
      stripe: { secretKey: 'sk_live', accountId: 'acct_1' },
      payoneer: { clientSecret: 'shh', programId: 'p1' },
    },
    banks: [{ bankName: 'HBL', apiKey: 'nested' }],
  })
  assert.equal(out._id, id)
  assert.equal(out.marketplaceFeePercent, 8)
  assert.deepEqual(out.international, {
    wise: { accountNumber: '123' },
    stripe: { accountId: 'acct_1' },
    payoneer: { programId: 'p1' },
  })
  assert.deepEqual(out.banks, [{ bankName: 'HBL' }])
})

// ---------- C6: business details ----------
test('C6: business details submission no longer crashes on undefined fields', async () => {
  const supplier = new User({ fullName: 'Sup', email: 'sup@test.local', password: 'x', role: 'supplier', status: 'pending_approval' })
  const res = fakeRes()
  await submitBusinessDetails(
    { user: supplier, body: { companyName: 'QA Co', registrationEntity: 'Sole Proprietorship', registrationNo: 'R-1' } },
    res,
  )
  // Without a database the handler may still fail later, but never with a ReferenceError.
  assert.doesNotMatch(String(res.body?.message || ''), /is not defined/)
})

// ---------- C7: sub-admin vs admin accounts ----------
test('C7: a sub-admin cannot change a Super Admin password', async () => {
  const target = superAdmin()
  const originalPassword = target.password
  stub(User, 'findById', () => ({ select: async () => target }))
  const res = fakeRes()
  await updateAccount({ params: { id: String(target._id) }, body: { password: 'hijack123' }, user: subAdmin() }, res)
  assert.equal(res.statusCode, 403)
  assert.equal(target.password, originalPassword)
})

test('C7: a sub-admin cannot delete an admin account', async () => {
  stub(User, 'findById', async () => superAdmin())
  stub(User, 'findByIdAndDelete', mustNotBeCalled('User.findByIdAndDelete'))
  stub(User, 'countDocuments', async () => 5)
  const res = fakeRes()
  await deleteAccount({ params: { id: 'x' }, user: subAdmin() }, res)
  assert.equal(res.statusCode, 403)
})

test('C7: a sub-admin cannot create new admin/staff accounts', async () => {
  stub(User, 'findOne', async () => null)
  stub(User, 'create', mustNotBeCalled('User.create'))
  const res = fakeRes()
  await createAccount(
    { body: { ...adminBody, role: 'staff', adminRoleId: String(new mongoose.Types.ObjectId()) }, user: subAdmin() },
    res,
  )
  assert.equal(res.statusCode, 403)
})
