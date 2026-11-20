// WMS login sync: password rule, integration key, and incoming payload validation (no DB needed).
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { shouldAcceptIncomingPassword, BCRYPT_HASH } from '../services/wmsSyncService.js'
import { requireWmsSecretStrict } from '../middleware/wmsSecret.js'
import integrationRoutes from '../routes/integrationRoutes.js'

const KEY = 'test-sync-secret'
const ORIGINAL = process.env.WMS_SYNC_SECRET

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.WMS_SYNC_SECRET
  else process.env.WMS_SYNC_SECRET = ORIGINAL
})

async function call(body, headers = {}) {
  const app = express()
  app.use(express.json())
  app.use('/api/integration', integrationRoutes)
  const server = app.listen(0)
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/integration/wms/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: await res.json() }
  } finally {
    server.close()
  }
}

test('newest password change wins; unknown time never overwrites a working password', () => {
  const now = new Date()
  const earlier = new Date(now.getTime() - 60_000)
  assert.equal(shouldAcceptIncomingPassword({ hasLocalPassword: true, localChangedAt: null, incomingChangedAt: null }), false)
  assert.equal(shouldAcceptIncomingPassword({ hasLocalPassword: true, localChangedAt: now, incomingChangedAt: earlier }), false)
  assert.equal(shouldAcceptIncomingPassword({ hasLocalPassword: true, localChangedAt: earlier, incomingChangedAt: now }), true)
  assert.equal(shouldAcceptIncomingPassword({ hasLocalPassword: true, localChangedAt: null, incomingChangedAt: now }), true)
  assert.equal(shouldAcceptIncomingPassword({ hasLocalPassword: false, localChangedAt: null, incomingChangedAt: null }), true)
})

test('bcrypt pattern accepts Laravel and bcryptjs hashes only', () => {
  const body = 'a'.repeat(53)
  assert.ok(BCRYPT_HASH.test(`$2y$12$${body}`))
  assert.ok(BCRYPT_HASH.test(`$2b$10$${body}`))
  assert.ok(!BCRYPT_HASH.test('plain-password'))
  assert.ok(!BCRYPT_HASH.test(`$argon2id$v=19$${body}`))
})

test('incoming WMS calls need the shared key (fails closed when unset)', async () => {
  delete process.env.WMS_SYNC_SECRET
  assert.equal((await call({})).status, 503)

  process.env.WMS_SYNC_SECRET = KEY
  assert.equal((await call({})).status, 401)
  assert.equal((await call({}, { 'x-wms-secret': 'wrong' })).status, 401)
})

test('incoming WMS payload is validated before touching the database', async () => {
  process.env.WMS_SYNC_SECRET = KEY
  const h = { 'x-wms-secret': KEY }
  const ok = { wms_user_id: 5, name: 'S', email: 's@example.com', password_hash: null }

  assert.equal((await call({ ...ok, wms_user_id: 'x' }, h)).status, 422)
  assert.equal((await call({ ...ok, email: 'not-an-email' }, h)).status, 422)
  assert.equal((await call({ ...ok, password_hash: 'plain-password' }, h)).status, 422)
  assert.equal((await call({ ...ok, password_changed_at: 'not-a-date' }, h)).status, 422)
})

test('middleware passes a correct key through', () => {
  process.env.WMS_SYNC_SECRET = KEY
  let passed = false
  requireWmsSecretStrict({ headers: { 'x-wms-secret': KEY } }, {}, () => { passed = true })
  assert.equal(passed, true)
})
