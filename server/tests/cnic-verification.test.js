import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import User from '../models/User.js'
import BusinessProfile from '../models/BusinessProfile.js'
import { register } from '../controllers/authController.js'
import { submitBusinessDetails, verifyCnicNumber } from '../controllers/businessController.js'

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

test('CNIC: verifyCnicNumber returns available: false if CNIC exists in User or BusinessProfile', async () => {
  stub(User, 'findOne', async () => ({ _id: new mongoose.Types.ObjectId(), fullName: 'Existing User' }))
  stub(BusinessProfile, 'findOne', async () => null)

  const req = { body: { idCardNumber: '42101-1234567-1' } }
  const res = fakeRes()

  await verifyCnicNumber(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.available, false)
  assert.match(res.body.message, /pehle se ek doosre account k sath registered hai/i)
})

test('CNIC: verifyCnicNumber returns available: true if CNIC is unique and valid', async () => {
  stub(User, 'findOne', async () => null)
  stub(BusinessProfile, 'findOne', async () => null)

  const req = { body: { idCardNumber: '42101-9876543-1' } }
  const res = fakeRes()

  await verifyCnicNumber(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.available, true)
  assert.equal(res.body.formattedCnic, '42101-9876543-1')
})

test('CNIC: verifyCnicNumber rejects invalid province code (e.g. starting with 8 or 9)', async () => {
  const req = { body: { idCardNumber: '82101-1234567-1' } }
  const res = fakeRes()

  await verifyCnicNumber(req, res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /Pakistani CNIC must begin with province code 1 through 7/i)
})

test('CNIC: register in authController rejects duplicate CNIC', async () => {
  stub(User, 'findOne', async () => ({ _id: new mongoose.Types.ObjectId(), idCardNumber: '42101-1234567-1' }))
  stub(BusinessProfile, 'findOne', async () => null)

  const req = {
    body: {
      role: 'supplier',
      ownerName: 'Test Supplier',
      email: 'newsupplier@test.local',
      password: 'password123',
      confirmPassword: 'password123',
      companyName: 'Test Co',
      companyEmail: 'info@testco.local',
      companyPhone: '+923001234567',
      companyAddress: 'Karachi, Pakistan',
      ownerPhone: '+923001234567',
      ownerAddress: 'Karachi, Pakistan',
      bankName: 'Meezan Bank',
      accountHolderName: 'Test Supplier',
      accountNumberOrIban: 'PK36MEZN0001234567890123',
      idCardNumber: '42101-1234567-1',
      idCardUrl: '/uploads/idcard-test.png',
    },
  }
  const res = fakeRes()

  await register(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.isDuplicateCnic, true)
  assert.match(res.body.message, /pehle se ek doosre account k sath registered hai/i)
})

test('CNIC: submitBusinessDetails rejects duplicate CNIC from another user', async () => {
  const myUserId = new mongoose.Types.ObjectId()
  const otherUserId = new mongoose.Types.ObjectId()

  stub(User, 'findOne', async () => ({ _id: otherUserId, idCardNumber: '42101-1234567-1' }))
  stub(BusinessProfile, 'findOne', async () => null)

  const req = {
    user: { _id: myUserId, fullName: 'Current User', role: 'supplier', status: 'pending_details' },
    body: {
      bankName: 'Habib Bank Limited (HBL)',
      accountHolderName: 'Current User',
      accountNumberOrIban: 'T' + '1'.repeat(33),
      idCardNumber: '42101-1234567-1',
      idCardUrl: '/uploads/sample-id.jpg',
    },
  }
  const res = fakeRes()

  await submitBusinessDetails(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.isDuplicateCnic, true)
  assert.match(res.body.message, /pehle se ek doosre account k sath registered hai/i)
})
