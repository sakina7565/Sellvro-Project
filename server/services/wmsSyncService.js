/**
 * Supplier login sync with the WMS (Laravel) over its private API — replaces the old direct-MySQL writes.
 *
 * - Same email + same bcrypt hash on both sides, so one password works everywhere.
 *   (bcryptjs verifies Laravel's "$2y$" hashes as-is; WMS normalises our "$2b$" ones.)
 * - Passwords: the newer passwordChangedAt wins; an unknown change time never overwrites a working
 *   password, so already-live accounts keep their current logins.
 * - Google accounts are matched by verified email on each side, so no Google id is exchanged.
 *
 * Env: WMS_BASE_URL (existing, e.g. https://wmsbysellvro.com) and WMS_SYNC_SECRET, sent as the
 * `x-wms-secret` header both ways (= MARKETPLACE_SYNC_SECRET on WMS).
 */
import crypto from 'crypto'
import mongoose from 'mongoose'
import User from '../models/User.js'
import BusinessProfile from '../models/BusinessProfile.js'

const RETRY_EVERY_MS = 5 * 60 * 1000
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

export const wmsSyncEnabled = () => Boolean(process.env.WMS_BASE_URL && process.env.WMS_SYNC_SECRET)

/** Newest change wins. An unknown (null) incoming time never replaces a working password. */
export function shouldAcceptIncomingPassword({ hasLocalPassword, localChangedAt, incomingChangedAt }) {
  if (!hasLocalPassword) return true
  if (!incomingChangedAt) return false
  return !localChangedAt || new Date(incomingChangedAt) > new Date(localChangedAt)
}

/** Called from the User model after a save that changed login details. Never throws. */
export async function queueSupplierSync(userId) {
  if (!wmsSyncEnabled()) return
  try {
    // Marked first so the retry loop picks it up even if the push below fails or the process restarts.
    await User.updateOne({ _id: userId }, { $set: { wmsSyncPending: true } })
    setImmediate(() => {
      pushSupplierToWms(userId).catch((err) => console.warn('[WMS Sync] push error:', err.message))
    })
  } catch (err) {
    console.warn('[WMS Sync] queue error:', err.message)
  }
}

/** Push one supplier's login details to WMS. Resolves true when in sync. */
export async function pushSupplierToWms(userId) {
  const user = await User.findById(userId).select('+password')
  if (!user || user.role !== 'supplier') {
    if (user) await User.updateOne({ _id: user._id }, { $set: { wmsSyncPending: false } })
    return true
  }
  if (!wmsSyncEnabled()) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  let response
  try {
    response = await fetch(`${process.env.WMS_BASE_URL.replace(/\/+$/, '')}/api/integration/suppliers`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-wms-secret': process.env.WMS_SYNC_SECRET,
      },
      body: JSON.stringify({
        marketplace_user_id: user._id.toString(),
        wms_user_id: user.wmsSupplierId || null,
        name: user.fullName,
        email: user.email,
        password_hash: BCRYPT_HASH.test(user.password || '') ? user.password : null,
        password_changed_at: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
        // Used by WMS only when it creates the account (same details the old direct-SQL signup sent).
        business: {
          business_name: user.companyName || user.fullName,
          business_email: user.companyEmail || user.email,
          phone: user.companyPhone || '',
          address: user.companyAddress || '',
          registration_entity: user.registrationEntity || '',
          registration_no: user.registrationNo || '',
          owner_name: user.ownerName || user.fullName,
          owner_email: user.ownerEmail || user.email,
          owner_phone: user.ownerPhone || '',
          owner_address: user.ownerAddress || '',
          id_card_url: user.idCardUrl || '',
        },
      }),
      signal: controller.signal,
    })
  } catch (err) {
    console.warn(`[WMS Sync] push failed for ${user.email}: ${err.message}`)
    return false
  } finally {
    clearTimeout(timer)
  }

  const body = await response.json().catch(() => ({}))

  if (response.ok) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isWmsRegistered: true,
          wmsSupplierId: body.wms_user_id ?? user.wmsSupplierId,
          wmsClientId: body.user_unique_name || user.wmsClientId || '',
          wmsStatus: body.status || user.wmsStatus || '',
          wmsSyncPending: false,
          wmsSyncedAt: new Date(),
          wmsSyncError: '',
        },
      },
    )
    return true
  }

  if (response.status === 409) {
    // Separate WMS account with this email, or a staff account: retrying can never succeed.
    console.error(`[WMS Sync] conflict for ${user.email}: ${body.error || response.status}`)
    await User.updateOne(
      { _id: user._id },
      { $set: { wmsSyncPending: false, wmsSyncError: body.code || 'conflict' } },
    )
    return false
  }

  console.warn(`[WMS Sync] push for ${user.email} got HTTP ${response.status}`)
  return false
}

/** Retry everything still pending. Resolves { synced, failed }. */
export async function retryPendingWmsSync(limit = 50) {
  const pending = await User.find({ role: 'supplier', wmsSyncPending: true }).select('_id').limit(limit).lean()
  let synced = 0
  let failed = 0
  for (const { _id } of pending) {
    ;(await pushSupplierToWms(_id)) ? synced++ : failed++
  }
  return { synced, failed }
}

export function startWmsSyncRetryLoop() {
  if (!wmsSyncEnabled()) {
    console.log('[WMS Sync] off (set WMS_BASE_URL and WMS_SYNC_SECRET to enable)')
    return
  }
  const run = () => {
    if (mongoose.connection.readyState !== 1) return
    retryPendingWmsSync().catch((err) => console.warn('[WMS Sync] retry loop error:', err.message))
  }
  setInterval(run, RETRY_EVERY_MS).unref()
  setTimeout(run, 30 * 1000).unref()
}

/**
 * Create or link a supplier sent by WMS. Resolves { status, body }.
 * Writes use updateOne so no model hook fires and nothing is echoed back to WMS.
 */
export async function applyIncomingFromWms(data) {
  const email = String(data.email).toLowerCase().trim()

  // Only an account already linked to this WMS supplier may be updated.
  const user = await User.findOne({ wmsSupplierId: Number(data.wms_user_id) }).select('+password')

  // Neither app verifies email ownership, so an existing unlinked account with this email is never
  // taken over by email alone (that would let anyone reset someone else's password).
  if (!user && (await User.exists({ email }))) {
    console.warn(`[WMS Sync] not linking existing marketplace account ${email} to WMS #${data.wms_user_id}: needs manual review`)
    return {
      status: 409,
      body: { code: 'not_linked', error: 'A marketplace account with this email already exists and is not linked to this WMS account.' },
    }
  }

  // Never let WMS touch admin or buyer accounts.
  if (user && user.role !== 'supplier') {
    return { status: 409, body: { code: 'not_supplier', error: 'This marketplace account is not a supplier.' } }
  }

  const wmsFields = {
    isWmsRegistered: true,
    wmsSupplierId: Number(data.wms_user_id),
    wmsClientId: data.user_unique_name || '',
    wmsStatus: data.status || '',
    wmsSyncedAt: new Date(),
  }
  const incomingChangedAt = data.password_changed_at ? new Date(data.password_changed_at) : null

  if (!user) {
    // Created with a random password (runs the normal displayId/hash hooks), then the WMS hash is set
    // directly. Google-only WMS accounts keep the random one: they use Google or "Forgot password".
    const created = new User({
      fullName: data.name,
      email,
      password: crypto.randomBytes(24).toString('hex'),
      role: 'supplier',
      status: data.status === 'approved' ? 'approved' : 'pending_details',
      ...wmsFields,
    })
    created.$locals.skipWmsSync = true // came from WMS: must not be pushed straight back
    await created.save()

    const set = { passwordChangedAt: incomingChangedAt || new Date() }
    if (data.password_hash) set.password = data.password_hash
    await User.updateOne({ _id: created._id }, { $set: set })

    await BusinessProfile.findOneAndUpdate(
      { user: created._id },
      {
        user: created._id,
        profileType: 'supplier',
        businessName: `${data.name}'s Store`,
        status: data.status === 'approved' ? 'approved' : 'pending',
      },
      { upsert: true, new: true },
    ).catch((err) => console.warn('[WMS Sync] BusinessProfile notice:', err.message))

    return { status: 201, body: { created: true, marketplace_user_id: created._id.toString() } }
  }

  const set = { ...wmsFields }
  if (
    data.password_hash &&
    shouldAcceptIncomingPassword({
      hasLocalPassword: Boolean(user.password),
      localChangedAt: user.passwordChangedAt,
      incomingChangedAt,
    })
  ) {
    set.password = data.password_hash
    if (incomingChangedAt) set.passwordChangedAt = incomingChangedAt
  }
  await User.updateOne({ _id: user._id }, { $set: set })

  return { status: 200, body: { created: false, marketplace_user_id: user._id.toString() } }
}

export { BCRYPT_HASH }
