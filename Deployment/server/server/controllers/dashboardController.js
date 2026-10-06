import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import WalletRequest from '../models/WalletRequest.js'
import Dispute from '../models/Dispute.js'

function periodStart(period) {
  const key = String(period || 'all').toLowerCase().replace(/\s+/g, '_')
  const now = new Date()

  if (key === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start
  }

  if (key === 'week' || key === 'this_week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    start.setHours(0, 0, 0, 0)
    return start
  }

  if (key === 'month' || key === 'this_month') {
    const start = new Date(now)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return start
  }

  return null
}

function withCreatedAt(filter, period) {
  const start = periodStart(period)
  if (!start) return filter
  return { ...filter, createdAt: { $gte: start } }
}

function money(value) {
  return Number(Number(value || 0).toFixed(2))
}

function formatMoney(value) {
  return `$${money(value).toLocaleString('en-US', {
    minimumFractionDigits: money(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

async function sumField(Model, match, field) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ])
  return money(rows[0]?.total || 0)
}

export const getAdminDashboardStats = async (req, res) => {
  try {
    const period = req.query.period || 'all'
    const orderBase = withCreatedAt({ status: { $ne: 'cancelled' } }, period)
    const pendingOrderFilter = withCreatedAt(
      { status: { $in: ['pending', 'placed'] } },
      period,
    )
    const walletFilter = withCreatedAt({ status: 'approved' }, period)
    const disputeFilter = { status: 'open' }

    const [
      totalOrders,
      pendingOrders,
      totalRevenue,
      payments,
      openDisputes,
      pendingSuppliers,
      pendingPayoutAgg,
    ] = await Promise.all([
      Order.countDocuments(orderBase),
      Order.countDocuments(pendingOrderFilter),
      sumField(Order, orderBase, 'total'),
      sumField(WalletRequest, walletFilter, 'amount'),
      Dispute.countDocuments(disputeFilter),
      User.countDocuments({ role: 'supplier', status: 'pending_approval' }),
      Order.aggregate([
        {
          $match: {
            payoutStatus: 'pending',
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$total', '$commission'] } },
          },
        },
      ]),
    ])

    const pendingPayout = money(pendingPayoutAgg[0]?.total || 0)

    return res.json({
      period,
      overview: {
        totalOrders,
        pendingOrders,
        totalRevenue,
        totalRevenueLabel: formatMoney(totalRevenue),
        payments,
        paymentsLabel: formatMoney(payments),
      },
      pendingTasks: {
        disputes: openDisputes,
        pendingSuppliers,
        pendingPayout,
        pendingPayoutLabel: formatMoney(pendingPayout),
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load dashboard stats.' })
  }
}

export const getSupplierDashboardStats = async (req, res) => {
  try {
    const period = req.query.period || 'all'
    const supplierId = req.user._id
    const productFilter = { supplier: supplierId }
    const orderBase = withCreatedAt(
      { supplier: supplierId, status: { $ne: 'cancelled' } },
      period,
    )

    const [
      approvedProducts,
      totalProducts,
      totalOrders,
      revenueAgg,
      pendingProducts,
      zeroStock,
      pendingPayoutAgg,
    ] = await Promise.all([
      Product.countDocuments({ ...productFilter, status: 'active' }),
      Product.countDocuments(productFilter),
      Order.countDocuments(orderBase),
      Order.aggregate([
        { $match: orderBase },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$total', '$commission'] } },
          },
        },
      ]),
      Product.countDocuments({ ...productFilter, status: 'pending_approval' }),
      Product.countDocuments({ ...productFilter, quantity: 0 }),
      Order.aggregate([
        {
          $match: {
            supplier: supplierId,
            payoutStatus: 'pending',
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$total', '$commission'] } },
          },
        },
      ]),
    ])

    const totalRevenue = money(revenueAgg[0]?.total || 0)
    const pendingPayout = money(pendingPayoutAgg[0]?.total || 0)

    return res.json({
      period,
      overview: {
        approved: approvedProducts,
        totalProducts,
        totalOrders,
        totalRevenue,
        totalRevenueLabel: formatMoney(totalRevenue),
      },
      pendingTasks: {
        pendingStatus: pendingProducts,
        stockDifference: zeroStock,
        pendingPayout,
        pendingPayoutLabel: formatMoney(pendingPayout),
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load dashboard stats.' })
  }
}

export const getUserDashboardStats = async (req, res) => {
  try {
    const period = req.query.period || 'all'
    const userId = req.user._id
    const orderBase = withCreatedAt({ user: userId, status: { $ne: 'cancelled' } }, period)
    const pendingOrderFilter = withCreatedAt(
      { user: userId, status: { $in: ['pending', 'placed', 'in_process'] } },
      period,
    )

    const [fulfillmentOrders, pendingOrders, billingPaid, openDisputes, pendingWalletAgg] =
      await Promise.all([
        Order.countDocuments(orderBase),
        Order.countDocuments(pendingOrderFilter),
        sumField(Order, orderBase, 'total'),
        Dispute.countDocuments({ raisedBy: userId, status: 'open' }),
        WalletRequest.aggregate([
          { $match: { user: userId, status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ])

    const pendingAmount = money(pendingWalletAgg[0]?.total || 0)

    return res.json({
      period,
      overview: {
        fulfillmentOrders,
        pendingOrders,
        totalInvoices: fulfillmentOrders,
        billingPaid,
        billingPaidLabel: formatMoney(billingPaid),
      },
      pendingTasks: {
        disputes: openDisputes,
        pendingFulfillment: pendingOrders,
        pendingAmount,
        pendingAmountLabel: formatMoney(pendingAmount),
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load dashboard stats.' })
  }
}
