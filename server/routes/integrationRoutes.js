import { Router } from 'express'
import { requireWmsSecretStrict } from '../middleware/wmsSecret.js'
import { applyIncomingFromWms, BCRYPT_HASH } from '../services/wmsSyncService.js'

const router = Router()

/** POST /api/integration/wms/suppliers — WMS creates/links a supplier or syncs a password. */
router.post('/wms/suppliers', requireWmsSecretStrict, async (req, res) => {
  const { wms_user_id: wmsUserId, name, email, password_hash: hash, password_changed_at: changedAt } = req.body

  if (!Number.isInteger(Number(wmsUserId)) || Number(wmsUserId) < 1) {
    return res.status(422).json({ error: 'wms_user_id is required.' })
  }
  if (!name || typeof name !== 'string' || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(422).json({ error: 'A valid name and email are required.' })
  }
  // bcrypt only: never accept plain text or any other format.
  if (hash != null && !BCRYPT_HASH.test(String(hash))) {
    return res.status(422).json({ error: 'password_hash must be a bcrypt hash.' })
  }
  if (changedAt != null && Number.isNaN(Date.parse(changedAt))) {
    return res.status(422).json({ error: 'password_changed_at must be a date.' })
  }

  try {
    const { status, body } = await applyIncomingFromWms(req.body)
    return res.status(status).json(body)
  } catch (err) {
    console.error('[WMS Sync] incoming error:', err)
    return res.status(500).json({ error: 'Could not sync supplier.' })
  }
})

export default router
