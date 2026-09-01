import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Payout from '../models/Payout.js'
import User from '../models/User.js'
import BusinessProfile from '../models/BusinessProfile.js'

/**
 * Build admin payout rows: one pending row per supplier with unpaid order earnings,
 * plus historical processed payouts.
 */
export const listAdminPayouts = async (_req, res) => {
  try {
    const pendingAgg = await Order.aggregate([
      {
        $match: {
          payoutStatus: 'pending',
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$supplier',
          amount: { $sum: { $subtract: ['$total', '$commission'] } },
          commissionTotal: { $sum: '$commission' },
          orderCount: { $sum: 1 },
          orderIds: { $push: '$_id' },
        },
      },
    ])

    const supplierIds = pendingAgg.map((row) => row._id)
    const suppliers = await User.find({ _id: { $in: supplierIds } }).select('fullName email')
    const supplierMap = Object.fromEntries(suppliers.map((s) => [s._id.toString(), s]))

    const profiles = await BusinessProfile.find({ user: { $in: supplierIds } }).select(
      'user accNumber businessName',
    )
    const profileMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p]))

    const pendingRows = pendingAgg.map((row) => {
      const id = row._id.toString()
      const supplier = supplierMap[id]
      const profile = profileMap[id]
      const amount = Number(row.amount.toFixed(2))
      const commissionPct =
        amount + row.commissionTotal > 0
          ? Number(((row.commissionTotal / (amount + row.commissionTotal)) * 100).toFixed(1))
          : 0

      return {
        id: `pending-${id}`,
        supplierId: id,
        supplier: supplier?.fullName || '—',
        email: supplier?.email || '',
        payout: amount.toFixed(2),
        amount,
        held: '0.00',
        bankDetails: profile?.accNumber ? `****${String(profile.accNumber).slice(-4)}` : 'Not Set',
        commission: commissionPct,
        cardDate: `${commissionPct}%`,
        status: 'Pending',
        statusRaw: 'pending',
        orderCount: row.orderCount,
        orderIds: row.orderIds.map((oid) => oid.toString()),
      }
    })

    const processed = await Payout.find({ status: 'processed' })
      .populate('supplier', 'fullName email')
      .sort({ processedAt: -1, createdAt: -1 })

    const processedRows = processed.map((item) => item.toSafeObject())

    const pendingAmount = pendingRows.reduce((sum, row) => sum + row.amount, 0)
    const processedTotal = processedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

    return res.json({
      data: [...pendingRows, ...processedRows],
      summary: {
        pendingCount: pendingRows.length,
        pendingAmount,
        processedTotal,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load payouts.' })
  }
}

export const processSupplierPayout = async (req, res) => {
  try {
    const supplierId = req.params.supplierId || req.body.supplierId
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: 'Valid supplier id is required.' })
    }

    const supplier = await User.findById(supplierId)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier not found.' })
    }

    const orders = await Order.find({
      supplier: supplierId,
      payoutStatus: 'pending',
      status: { $ne: 'cancelled' },
    })

    if (orders.length === 0) {
      return res.status(400).json({ message: 'No pending payout amount for this supplier.' })
    }

    const amount = Number(
      orders.reduce((sum, order) => sum + (order.total - order.commission), 0).toFixed(2),
    )
    const commissionTotal = Number(
      orders.reduce((sum, order) => sum + order.commission, 0).toFixed(2),
    )
    const commissionPct =
      amount + commissionTotal > 0
        ? Number(((commissionTotal / (amount + commissionTotal)) * 100).toFixed(1))
        : 0

    const profile = await BusinessProfile.findOne({ user: supplierId })
    const bankDetails = profile?.accNumber
      ? `****${String(profile.accNumber).slice(-4)}`
      : 'Not Set'

    const payout = await Payout.create({
      supplier: supplierId,
      amount,
      held: 0,
      commission: commissionPct,
      bankDetails,
      status: 'processed',
      orderIds: orders.map((order) => order._id),
      processedAt: new Date(),
    })

    await Order.updateMany(
      { _id: { $in: orders.map((order) => order._id) } },
      { $set: { payoutStatus: 'processed' } },
    )

    await payout.populate('supplier', 'fullName email')

    return res.json({
      message: 'Payout processed.',
      payout: payout.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to process payout.' })
  }
}

export const getSupplierFinance = async (req, res) => {
  try {
    const supplierId = req.user._id

    const pendingOrders = await Order.find({
      supplier: supplierId,
      payoutStatus: 'pending',
      status: { $ne: 'cancelled' },
    })

    const pendingAmount = Number(
      pendingOrders
        .reduce((sum, order) => sum + (order.total - order.commission), 0)
        .toFixed(2),
    )

    const payouts = await Payout.find({ supplier: supplierId })
      .sort({ createdAt: -1 })
      .populate('supplier', 'fullName email')

    const processedTotal = Number(
      payouts
        .filter((item) => item.status === 'processed')
        .reduce((sum, item) => sum + item.amount, 0)
        .toFixed(2),
    )

    const transactions = [
      ...pendingOrders.map((order, index) => ({
        id: order._id.toString(),
        no: index + 1,
        transactionId: order.orderNo,
        status: 'Pending',
        total: Number((order.total - order.commission).toFixed(2)),
        date: order.createdAt
          ? new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
          : '—',
        type: 'order_earning',
      })),
      ...payouts.map((payout, index) => ({
        id: payout._id.toString(),
        no: pendingOrders.length + index + 1,
        transactionId: `PAY-${payout._id.toString().slice(-8).toUpperCase()}`,
        status: payout.status === 'processed' ? 'Processed' : 'Pending',
        total: payout.amount,
        date: (payout.processedAt || payout.createdAt)
          ? new Date(payout.processedAt || payout.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
          : '—',
        type: 'payout',
      })),
    ]

    return res.json({
      summary: {
        pendingPayouts: pendingOrders.length > 0 ? 1 : 0,
        pendingAmount,
        processedTotal,
      },
      data: transactions,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load finance.' })
  }
}
