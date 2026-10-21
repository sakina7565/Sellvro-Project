import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Payout from '../models/Payout.js'
import User from '../models/User.js'
import BusinessProfile from '../models/BusinessProfile.js'
import { createNotification } from '../utils/notifications.js'

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

function formatMonthKey(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthLabel(date) {
  const d = new Date(date)
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const getSuppliersFinancialOverview = async (_req, res) => {
  try {
    const suppliers = await User.find({ role: 'supplier' }).sort({ createdAt: -1 })
    const supplierIds = suppliers.map((s) => s._id)

    const profiles = await BusinessProfile.find({ user: { $in: supplierIds } })
    const profileMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p]))

    const allOrders = await Order.find({
      supplier: { $in: supplierIds },
    })

    const allPayouts = await Payout.find({
      supplier: { $in: supplierIds },
      status: 'processed',
    })

    const now = Date.now()

    const data = suppliers.map((sup) => {
      const sId = sup._id.toString()
      const supOrders = allOrders.filter((o) => o.supplier && o.supplier.toString() === sId)
      const supPayouts = allPayouts.filter((p) => p.supplier && p.supplier.toString() === sId)
      const profile = profileMap[sId]

      const totalOrders = supOrders.length
      const deliveredCount = supOrders.filter((o) => o.status === 'delivered' || o.trackingStatus === 'delivered').length
      const pendingCount = supOrders.filter((o) => o.status === 'placed' || o.status === 'in_process').length
      const cancelledCount = supOrders.filter((o) => o.status === 'cancelled').length

      let grossSales = 0
      let commissionTotal = 0
      let matureAmount = 0
      let immatureAmount = 0

      supOrders.forEach((o) => {
        if (o.status === 'cancelled') return
        const orderTotal = Number(o.total || 0)
        const orderComm = Number(o.commission || 0)
        const netOrder = orderTotal - orderComm

        grossSales += orderTotal
        commissionTotal += orderComm

        if (o.payoutStatus !== 'processed') {
          const ageMs = now - new Date(o.createdAt).getTime()
          if (ageMs >= THIRTY_DAYS_MS) {
            matureAmount += netOrder
          } else {
            immatureAmount += netOrder
          }
        }
      })

      const paidTotal = supPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const netEarnings = grossSales - commissionTotal

      const supplierDisplayId =
        sup.clientId || `SUP-${sId.slice(-6).toUpperCase()}`

      return {
        id: sId,
        supplierId: sId,
        supplierDisplayId,
        fullName: sup.fullName,
        email: sup.email,
        businessName: profile?.businessName || sup.fullName,
        businessPhone: profile?.businessPhone || '',
        bankDetails: {
          provider: profile?.paymentProvider || 'Not Set',
          accNumber: profile?.accNumber || 'Not Set',
          cardDate: profile?.cardDate || '',
          city: profile?.city || '',
          country: profile?.country || '',
        },
        totalOrders,
        deliveredCount,
        pendingCount,
        cancelledCount,
        grossSales: Number(grossSales.toFixed(2)),
        commissionTotal: Number(commissionTotal.toFixed(2)),
        netEarnings: Number(netEarnings.toFixed(2)),
        matureAmount: Number(matureAmount.toFixed(2)),
        immatureAmount: Number(immatureAmount.toFixed(2)),
        paidTotal: Number(paidTotal.toFixed(2)),
        hasMaturePayout: matureAmount > 0,
      }
    })

    const summary = {
      totalSuppliers: suppliers.length,
      totalMaturePayable: Number(data.reduce((sum, s) => sum + s.matureAmount, 0).toFixed(2)),
      totalImmatureHolding: Number(data.reduce((sum, s) => sum + s.immatureAmount, 0).toFixed(2)),
      totalPaidOut: Number(data.reduce((sum, s) => sum + s.paidTotal, 0).toFixed(2)),
    }

    return res.json({ data, summary })
  } catch (error) {
    console.error('getSuppliersFinancialOverview error:', error)
    return res.status(500).json({ message: error.message || 'Failed to load supplier finance overview.' })
  }
}

export const getSupplierMonthlyHistory = async (req, res) => {
  try {
    const { supplierId } = req.params
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: 'Valid supplier id is required.' })
    }

    const supplier = await User.findById(supplierId)
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' })
    }

    const profile = await BusinessProfile.findOne({ user: supplierId })
    const orders = await Order.find({ supplier: supplierId }).sort({ createdAt: -1 })
    const payouts = await Payout.find({ supplier: supplierId }).sort({ processedAt: -1, createdAt: -1 })

    const now = Date.now()

    // Group orders by month key (YYYY-MM)
    const monthGroups = {}

    orders.forEach((o) => {
      const d = o.createdAt || new Date()
      const key = formatMonthKey(d)
      if (!monthGroups[key]) {
        monthGroups[key] = {
          monthKey: key,
          monthLabel: formatMonthLabel(d),
          orders: [],
          totalOrders: 0,
          deliveredCount: 0,
          pendingCount: 0,
          cancelledCount: 0,
          grossSales: 0,
          commission: 0,
          netEarnings: 0,
          matureAmount: 0,
          immatureAmount: 0,
          paidOrdersCount: 0,
        }
      }

      const g = monthGroups[key]
      g.orders.push(o)
      g.totalOrders += 1

      const isDelivered = o.status === 'delivered' || o.trackingStatus === 'delivered'
      const isCancelled = o.status === 'cancelled'
      const isPending = o.status === 'placed' || o.status === 'in_process'

      if (isDelivered) g.deliveredCount += 1
      if (isPending) g.pendingCount += 1
      if (isCancelled) g.cancelledCount += 1

      if (!isCancelled) {
        const oTot = Number(o.total || 0)
        const oComm = Number(o.commission || 0)
        const net = oTot - oComm
        g.grossSales += oTot
        g.commission += oComm
        g.netEarnings += net

        if (o.payoutStatus === 'processed') {
          g.paidOrdersCount += 1
        } else {
          const ageMs = now - new Date(o.createdAt).getTime()
          if (ageMs >= THIRTY_DAYS_MS) {
            g.matureAmount += net
          } else {
            g.immatureAmount += net
          }
        }
      }
    })

    // Process payouts per month
    const months = Object.values(monthGroups).map((g) => {
      const monthPayouts = payouts.filter(
        (p) => p.month === g.monthKey || formatMonthKey(p.processedAt || p.createdAt) === g.monthKey,
      )
      const paidAmount = monthPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      let payoutStatus = 'Immature (Holding)'
      if (g.totalOrders === 0 || g.netEarnings === 0) {
        payoutStatus = 'Settled'
      } else if (g.matureAmount === 0 && g.immatureAmount === 0) {
        payoutStatus = 'Paid'
      } else if (g.matureAmount > 0) {
        payoutStatus = 'Mature (Ready for Payout)'
      } else if (g.immatureAmount > 0) {
        payoutStatus = 'Immature (Pending 30 Days)'
      }

      return {
        monthKey: g.monthKey,
        monthLabel: g.monthLabel,
        totalOrders: g.totalOrders,
        deliveredCount: g.deliveredCount,
        pendingCount: g.pendingCount,
        cancelledCount: g.cancelledCount,
        grossSales: Number(g.grossSales.toFixed(2)),
        commission: Number(g.commission.toFixed(2)),
        netEarnings: Number(g.netEarnings.toFixed(2)),
        matureAmount: Number(g.matureAmount.toFixed(2)),
        immatureAmount: Number(g.immatureAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        payoutStatus,
        payouts: monthPayouts.map((p) => p.toSafeObject()),
      }
    })

    // Sort months descending
    months.sort((a, b) => b.monthKey.localeCompare(a.monthKey))

    const supplierDisplayId =
      supplier.clientId || `SUP-${supplier._id.toString().slice(-6).toUpperCase()}`

    return res.json({
      supplier: {
        id: supplier._id.toString(),
        supplierDisplayId,
        fullName: supplier.fullName,
        email: supplier.email,
        businessName: profile?.businessName || supplier.fullName,
        businessPhone: profile?.businessPhone || '',
      },
      bankDetails: {
        provider: profile?.paymentProvider || 'Not Set',
        accNumber: profile?.accNumber || 'Not Set',
        cardDate: profile?.cardDate || '',
        city: profile?.city || '',
        country: profile?.country || '',
      },
      months,
    })
  } catch (error) {
    console.error('getSupplierMonthlyHistory error:', error)
    return res.status(500).json({ message: error.message || 'Failed to load supplier monthly history.' })
  }
}

export const getSupplierMonthOrders = async (req, res) => {
  try {
    const { supplierId, monthKey } = req.params
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: 'Valid supplier id is required.' })
    }

    const supplier = await User.findById(supplierId)
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' })
    }

    const profile = await BusinessProfile.findOne({ user: supplierId })

    const orders = await Order.find({ supplier: supplierId })
      .populate('user', 'fullName email clientId')
      .populate('product', 'name sku image')
      .sort({ createdAt: -1 })

    const now = Date.now()

    // Filter orders matching monthKey
    const monthOrders = orders.filter((o) => {
      const d = o.createdAt || new Date()
      return formatMonthKey(d) === monthKey
    })

    let matureTotal = 0
    let immatureTotal = 0
    let grossTotal = 0
    let commissionTotal = 0
    let netTotal = 0

    const formattedOrders = monthOrders.map((o) => {
      const orderTotal = Number(o.total || 0)
      const comm = Number(o.commission || 0)
      const net = Number((orderTotal - comm).toFixed(2))

      grossTotal += orderTotal
      commissionTotal += comm
      netTotal += net

      const orderAgeMs = now - new Date(o.createdAt).getTime()
      const ageDays = Math.floor(orderAgeMs / (24 * 60 * 60 * 1000))
      const isMature = ageDays >= 30
      const daysToMaturity = isMature ? 0 : 30 - ageDays

      if (o.payoutStatus !== 'processed' && o.status !== 'cancelled') {
        if (isMature) matureTotal += net
        else immatureTotal += net
      }

      return {
        ...o.toSafeObject(),
        ageDays,
        isMature,
        daysToMaturity,
        netAmount: net,
      }
    })

    const supplierDisplayId =
      supplier.clientId || `SUP-${supplier._id.toString().slice(-6).toUpperCase()}`

    return res.json({
      monthKey,
      monthLabel: monthOrders[0] ? formatMonthLabel(monthOrders[0].createdAt) : monthKey,
      supplier: {
        id: supplier._id.toString(),
        supplierDisplayId,
        fullName: supplier.fullName,
        email: supplier.email,
        businessName: profile?.businessName || supplier.fullName,
      },
      bankDetails: {
        provider: profile?.paymentProvider || 'Not Set',
        accNumber: profile?.accNumber || 'Not Set',
        cardDate: profile?.cardDate || '',
        city: profile?.city || '',
        country: profile?.country || '',
      },
      summary: {
        totalOrders: formattedOrders.length,
        grossTotal: Number(grossTotal.toFixed(2)),
        commissionTotal: Number(commissionTotal.toFixed(2)),
        netTotal: Number(netTotal.toFixed(2)),
        matureTotal: Number(matureTotal.toFixed(2)),
        immatureTotal: Number(immatureTotal.toFixed(2)),
      },
      orders: formattedOrders,
    })
  } catch (error) {
    console.error('getSupplierMonthOrders error:', error)
    return res.status(500).json({ message: error.message || 'Failed to load month orders.' })
  }
}

export const executeSupplierPayout = async (req, res) => {
  try {
    const { supplierId } = req.params
    const { monthKey, amount, tid, paymentMethod, receiptUrl, notes, orderIds } = req.body

    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: 'Valid supplier id is required.' })
    }

    // TID is strictly required as requested by user
    if (!tid || !String(tid).trim()) {
      return res.status(400).json({
        message: 'Bank Transaction ID (TID) is strictly required to process payout.',
      })
    }

    const supplier = await User.findById(supplierId)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier not found.' })
    }

    const profile = await BusinessProfile.findOne({ user: supplierId })
    const bankDetailsStr = profile
      ? `${profile.paymentProvider || 'Bank'} - Acc: ${profile.accNumber || 'N/A'} (${profile.cardDate || supplier.fullName})`
      : 'Not Set'

    // Determine orders to be paid
    let targetOrders = []
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      targetOrders = await Order.find({
        _id: { $in: orderIds },
        supplier: supplierId,
        payoutStatus: { $ne: 'processed' },
      })
    } else if (monthKey) {
      const allSupOrders = await Order.find({
        supplier: supplierId,
        payoutStatus: { $ne: 'processed' },
        status: { $ne: 'cancelled' },
      })
      targetOrders = allSupOrders.filter((o) => formatMonthKey(o.createdAt) === monthKey)
    } else {
      targetOrders = await Order.find({
        supplier: supplierId,
        payoutStatus: { $ne: 'processed' },
        status: { $ne: 'cancelled' },
      })
    }

    const calculatedAmount = Number(
      targetOrders.reduce((sum, o) => sum + (o.total - o.commission), 0).toFixed(2),
    )
    const payoutAmount = amount !== undefined && Number(amount) > 0 ? Number(amount) : calculatedAmount

    if (payoutAmount <= 0) {
      return res.status(400).json({ message: 'Payout amount must be greater than zero.' })
    }

    const payout = await Payout.create({
      supplier: supplierId,
      amount: payoutAmount,
      tid: String(tid).trim(),
      month: monthKey || formatMonthKey(new Date()),
      paymentMethod: paymentMethod || 'Bank Transfer (IBFT)',
      receiptUrl: receiptUrl ? String(receiptUrl).trim() : '',
      notes: notes ? String(notes).trim() : '',
      bankDetails: bankDetailsStr,
      status: 'processed',
      orderIds: targetOrders.map((o) => o._id),
      processedAt: new Date(),
      adminUser: req.user._id,
    })

    if (targetOrders.length > 0) {
      await Order.updateMany(
        { _id: { $in: targetOrders.map((o) => o._id) } },
        {
          $set: {
            payoutStatus: 'processed',
            payoutTid: String(tid).trim(),
            payoutId: payout._id,
          },
        },
      )
    }

    createNotification({
      recipient: supplier._id,
      targetRole: 'supplier',
      type: 'payout',
      title: `Payout Processed ($${payoutAmount.toFixed(2)})`,
      message: `Your payment for ${monthKey || 'recent orders'} of $${payoutAmount.toFixed(2)} has been transferred via ${paymentMethod || 'Bank'} with TID: ${tid}.`,
      link: '/supplier/payouts',
    })

    return res.status(201).json({
      message: 'Supplier payout successfully processed and recorded.',
      payout: payout.toSafeObject(),
    })
  } catch (error) {
    console.error('executeSupplierPayout error:', error)
    return res.status(500).json({ message: error.message || 'Failed to process supplier payout.' })
  }
}

