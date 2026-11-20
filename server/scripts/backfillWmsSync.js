/**
 * One-time backfill: copy marketplace suppliers that are not yet linked to WMS.
 *   node server/scripts/backfillWmsSync.js
 * Safe to re-run. Accounts refused by WMS (same email already there, unlinked) are listed for review.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })
dotenv.config()

const { default: connectDB } = await import('../config/db.js')
const { default: User } = await import('../models/User.js')
const { wmsSyncEnabled, pushSupplierToWms } = await import('../services/wmsSyncService.js')

if (!wmsSyncEnabled()) {
  console.error('Set WMS_BASE_URL and WMS_SYNC_SECRET first.')
  process.exit(1)
}

await connectDB()

const unlinked = await User.find({ role: 'supplier', wmsSupplierId: null }).select('_id email').lean()
console.log(`Unlinked suppliers: ${unlinked.length}`)

let synced = 0
const failed = []
for (const { _id, email } of unlinked) {
  if (await pushSupplierToWms(_id)) synced++
  else failed.push(email)
}

console.log(`Synced: ${synced}`)
if (failed.length) {
  console.log(`Not synced (${failed.length}) - see wmsSyncError on each user (not_linked = needs manual review):`)
  failed.forEach((email) => console.log(`  - ${email}`))
}

await mongoose.disconnect()
