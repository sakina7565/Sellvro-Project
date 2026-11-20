import crypto from 'crypto'

let warnedUnset = false

// Protects the WMS webhook endpoints with a shared secret sent in the `x-wms-secret` header.
// shortcut: enforced only once WMS_WEBHOOK_SECRET is set, so the live WMS keeps working until it sends
// the header; set the same value on Sellvro and the WMS to close these endpoints to the public.
export function requireWmsSecret(req, res, next) {
  const expected = process.env.WMS_WEBHOOK_SECRET
  if (!expected) {
    if (!warnedUnset) {
      warnedUnset = true
      console.warn('[Security] WMS_WEBHOOK_SECRET is not set: WMS webhook endpoints are open to anyone.')
    }
    return next()
  }

  return secretMatches(req, expected) ? next() : res.status(401).json({ message: 'Invalid or missing WMS secret.' })
}

// Login sync (accounts + passwords): its own secret, and fails CLOSED when unset. Kept separate from
// WMS_WEBHOOK_SECRET so turning sync on never changes how the existing order webhooks behave.
export function requireWmsSecretStrict(req, res, next) {
  const expected = process.env.WMS_SYNC_SECRET
  if (!expected) {
    return res.status(503).json({ message: 'WMS sync is not configured (WMS_SYNC_SECRET).' })
  }
  return secretMatches(req, expected) ? next() : res.status(401).json({ message: 'Invalid or missing WMS secret.' })
}

function secretMatches(req, expected) {
  const given = Buffer.from(String(req.headers['x-wms-secret'] || ''))
  const wanted = Buffer.from(expected)
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted)
}
