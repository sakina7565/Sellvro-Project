import 'dotenv/config'
import connectDB from './config/db.js'
import User from './models/User.js'
import Product from './models/Product.js'
import Order from './models/Order.js'
import Dispute from './models/Dispute.js'
import WalletRequest from './models/WalletRequest.js'
import Payout from './models/Payout.js'
import Counter from './models/Counter.js'

async function runMigration() {
  try {
    await connectDB()
    console.log('[Migration] Connected to MongoDB. Starting series-wise ID correction...')

    const currentYear = new Date().getFullYear().toString().slice(-2)

    // ── 1. Products SKU: SVRO-0001 ──
    console.log('[Migration] 1. Processing Products SKU (Pattern: SVRO-0001)...')
    const products = await Product.find({}).sort({ createdAt: 1, _id: 1 })
    // Pass 1: temporary SKU to prevent unique index collision
    for (let i = 0; i < products.length; i++) {
      await Product.findByIdAndUpdate(products[i]._id, { sku: `TEMP_SKU_${i + 1}` })
    }
    // Pass 2: assign clean series
    for (let i = 0; i < products.length; i++) {
      const serialSku = `SVRO-${String(i + 1).padStart(4, '0')}`
      await Product.findByIdAndUpdate(products[i]._id, { sku: serialSku })
      console.log(`  Product ${i + 1}/${products.length}: ${products[i].name?.slice(0, 25)} -> ${serialSku}`)
    }
    await Counter.findOneAndUpdate(
      { key: 'sku' },
      { $set: { seq: products.length } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] Sku counter set to: ${products.length}`)

    // ── 2. Suppliers: SPAK-1001 ──
    console.log('[Migration] 2. Processing Suppliers (Pattern: SPAK-1001)...')
    const suppliers = await User.find({ role: 'supplier' }).sort({ createdAt: 1, _id: 1 })
    for (let i = 0; i < suppliers.length; i++) {
      const supplierId = `SPAK-${1001 + i}`
      await User.findByIdAndUpdate(suppliers[i]._id, {
        displayId: supplierId,
        clientId: supplierId,
      })
      console.log(`  Supplier ${i + 1}/${suppliers.length}: ${suppliers[i].fullName} -> ${supplierId}`)
    }
    const maxSupplierSeq = 1000 + suppliers.length
    await Counter.findOneAndUpdate(
      { key: 'supplier' },
      { $set: { seq: maxSupplierSeq } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] Supplier counter set to: ${maxSupplierSeq}`)

    // ── 3. Users: US-1001 ──
    console.log('[Migration] 3. Processing Users (Pattern: US-1001)...')
    const users = await User.find({ role: { $in: ['user', 'buyer'] } }).sort({ createdAt: 1, _id: 1 })
    for (let i = 0; i < users.length; i++) {
      const userId = `US-${1001 + i}`
      await User.findByIdAndUpdate(users[i]._id, {
        displayId: userId,
        clientId: userId,
      })
      console.log(`  User ${i + 1}/${users.length}: ${users[i].fullName} -> ${userId}`)
    }
    const maxUserSeq = 1000 + users.length
    await Counter.findOneAndUpdate(
      { key: 'user' },
      { $set: { seq: maxUserSeq } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] User counter set to: ${maxUserSeq}`)

    // ── 4. Orders: 26-SV-00001 (Year- SV- Order Number) ──
    console.log('[Migration] 4. Processing Orders (Pattern: 26-SV-00001)...')
    const orders = await Order.find({}).sort({ createdAt: 1, _id: 1 })
    // Pass 1: temporary orderNo
    for (let i = 0; i < orders.length; i++) {
      await Order.findByIdAndUpdate(orders[i]._id, { orderNo: `TEMP_ORD_${i + 1}` })
    }
    // Pass 2: assign clean series
    for (let i = 0; i < orders.length; i++) {
      const yy = orders[i].createdAt
        ? new Date(orders[i].createdAt).getFullYear().toString().slice(-2)
        : currentYear
      const orderNo = `${yy}-SV-${String(i + 1).padStart(5, '0')}`
      await Order.findByIdAndUpdate(orders[i]._id, { orderNo })
      console.log(`  Order ${i + 1}/${orders.length}: -> ${orderNo}`)
    }
    await Counter.findOneAndUpdate(
      { key: `order_${currentYear}` },
      { $set: { seq: orders.length } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] Order counter order_${currentYear} set to: ${orders.length}`)

    // ── 5. Disputes: 26-D-0001 ──
    console.log('[Migration] 5. Processing Disputes (Pattern: 26-D-0001)...')
    const disputes = await Dispute.find({}).sort({ createdAt: 1, _id: 1 })
    for (let i = 0; i < disputes.length; i++) {
      const yy = disputes[i].createdAt
        ? new Date(disputes[i].createdAt).getFullYear().toString().slice(-2)
        : currentYear
      const disputeNo = `${yy}-D-${String(i + 1).padStart(4, '0')}`
      await Dispute.findByIdAndUpdate(disputes[i]._id, { disputeNo })
      console.log(`  Dispute ${i + 1}/${disputes.length}: -> ${disputeNo}`)
    }
    await Counter.findOneAndUpdate(
      { key: `dispute_${currentYear}` },
      { $set: { seq: disputes.length } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] Dispute counter dispute_${currentYear} set to: ${disputes.length}`)

    // ── 6. Wallet Transactions: 26-W-00001 ──
    console.log('[Migration] 6. Processing Wallet Requests (Pattern: 26-W-00001)...')
    const walletRequests = await WalletRequest.find({}).sort({ createdAt: 1, _id: 1 })
    for (let i = 0; i < walletRequests.length; i++) {
      const yy = walletRequests[i].createdAt
        ? new Date(walletRequests[i].createdAt).getFullYear().toString().slice(-2)
        : currentYear
      const transactionId = `${yy}-W-${String(i + 1).padStart(5, '0')}`
      await WalletRequest.findByIdAndUpdate(walletRequests[i]._id, { transactionId })
      console.log(`  WalletRequest ${i + 1}/${walletRequests.length}: -> ${transactionId}`)
    }
    await Counter.findOneAndUpdate(
      { key: `wallet_${currentYear}` },
      { $set: { seq: walletRequests.length } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] Wallet counter wallet_${currentYear} set to: ${walletRequests.length}`)

    // ── 7. Payouts: 26-P-00001 ──
    console.log('[Migration] 7. Processing Payouts (Pattern: 26-P-00001)...')
    const payouts = await Payout.find({}).sort({ createdAt: 1, _id: 1 })
    for (let i = 0; i < payouts.length; i++) {
      const yy = payouts[i].createdAt
        ? new Date(payouts[i].createdAt).getFullYear().toString().slice(-2)
        : currentYear
      const payoutNo = `${yy}-P-${String(i + 1).padStart(5, '0')}`
      await Payout.findByIdAndUpdate(payouts[i]._id, { payoutNo })
      console.log(`  Payout ${i + 1}/${payouts.length}: -> ${payoutNo}`)
    }
    await Counter.findOneAndUpdate(
      { key: `payout_${currentYear}` },
      { $set: { seq: payouts.length } },
      { upsert: true, new: true }
    )
    console.log(`[Migration] Payout counter payout_${currentYear} set to: ${payouts.length}`)

    console.log('\n========================================')
    console.log('✅ ALL IDS SUCCESSFULLY CORRECTED SERIES-WISE!')
    console.log('========================================')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

runMigration()
