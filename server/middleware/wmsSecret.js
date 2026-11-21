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

  const given = Buffer.from(String(req.headers['x-wms-secret'] || ''))
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ message: 'Invalid or missing WMS secret.' })
  }
  return next()
}
