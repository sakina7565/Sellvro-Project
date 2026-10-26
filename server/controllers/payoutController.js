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

    const grossTotal = Number(
      pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2),
    )
    const commissionTotal = Number(
      pendingOrders.reduce((sum, order) => sum + Number(order.commission || 0), 0).toFixed(2),
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
        grossTotal: Number(order.total || 0),
        commission: Number(order.commission || 0),
        commissionPercent: order.commissionPercent || 0,
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
        grossTotal: payout.amount,
        commission: 0,
        commissionPercent: 0,
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
        grossTotal,
        commissionTotal,
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

export function isOrderMature(order) {
  if (!order) return false
  const status = String(order.status || '').toLowerCase()
  const tracking = String(order.trackingStatus || '').toLowerCase()
  return status === 'delivered' || tracking === 'delivered'
}

export function getWeekOfMonthInfo(date) {
  const d = new Date(date)
  const day = d.getDate()
  const year = d.getFullYear()
  const month = d.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthShort = d.toLocaleString('en-US', { month: 'short' })
  const lastDay = new Date(year, month + 1, 0).getDate()

  let weekNumber = 1
  let startDay = 1
  let endDay = 7

  if (day <= 7) {
    weekNumber = 1
    startDay = 1
    endDay = 7
  } else if (day <= 14) {
    weekNumber = 2
    startDay = 8
    endDay = 14
  } else if (day <= 21) {
    weekNumber = 3
    startDay = 15
    endDay = 21
  } else if (day <= 28) {
    weekNumber = 4
    startDay = 22
    endDay = 28
  } else {
    weekNumber = 5
    startDay = 29
    endDay = lastDay
  }

  // Saturday release cycle (the Saturday closing or following this weekly bracket)
  const bracketEndDate = new Date(year, month, endDay)
  const dayOfWeek = bracketEndDate.getDay() // 0 = Sun, 6 = Sat
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7
  const saturdayDate = new Date(year, month, endDay + daysUntilSaturday)
  const saturdayRelease = saturdayDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const weekKey = `${monthKey}-W${weekNumber}`
  const weekLabel = `Week ${weekNumber} (${monthShort} ${startDay} - ${endDay})`

  return {
    weekNumber,
    weekKey,
    weekLabel,
    periodLabel: weekLabel,
    monthKey,
    startDay,
    endDay,
    saturdayRelease,
    saturdayLabel: saturdayRelease,
  }
}

export const getPendingWeeklyPayouts = async (_req, res) => {
  try {
    const suppliers = await User.find({ role: 'supplier' }).sort({ createdAt: -1 })
    const supplierIds = suppliers.map((s) => s._id)

    const profiles = await BusinessProfile.find({ user: { $in: supplierIds } })
    const profileMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p]))

    const allOrders = await Order.find({
      supplier: { $in: supplierIds },
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 })

    const supplierMap = Object.fromEntries(suppliers.map((s) => [s._id.toString(), s]))
    const weekGroups = {}

    allOrders.forEach((o) => {
      const sId = o.supplier?.toString()
      if (!sId || !supplierMap[sId]) return

      const d = o.createdAt || new Date()
      const wInfo = getWeekOfMonthInfo(d)
      const groupKey = `${sId}_${wInfo.weekKey}`

      if (!weekGroups[groupKey]) {
        const sup = supplierMap[sId]
        const prof = profileMap[sId]
        const sDisplayId = sup.clientId || `SUP-${sId.slice(-6).toUpperCase()}`

        weekGroups[groupKey] = {
          id: groupKey,
          supplierId: sId,
          supplierDisplayId: sDisplayId,
          supplierName: sup.fullName,
          supplierEmail: sup.email,
          businessName: prof?.businessName || sup.fullName,
          bankDetails: {
            provider: prof?.paymentProvider || 'Not Set',
            accNumber: prof?.accNumber || 'Not Set',
            cardDate: prof?.cardDate || '',
            city: prof?.city || '',
            country: prof?.country || '',
          },
          monthKey: wInfo.monthKey,
          weekKey: wInfo.weekKey,
          weekNumber: wInfo.weekNumber,
          weekLabel: wInfo.weekLabel,
          periodLabel: wInfo.periodLabel,
          saturdayRelease: wInfo.saturdayRelease,
          saturdayLabel: wInfo.saturdayLabel,
          totalOrders: 0,
          deliveredCount: 0,
          pendingDeliveryCount: 0,
          grossSales: 0,
          commission: 0,
          netEarnings: 0,
          matureAmount: 0,
          immatureAmount: 0,
          paidAmount: 0,
          payoutStatus: 'Pending',
          matureOrderIds: [],
          allOrderIds: [],
        }
      }

      const wg = weekGroups[groupKey]
      wg.totalOrders += 1
      wg.allOrderIds.push(o._id.toString())

      const isDeliv = isOrderMature(o)
      const oTotal = Number(o.total || 0)
      const oComm = Number(o.commission || 0)
      const net = oTotal - oComm

      wg.grossSales += oTotal
      wg.commission += oComm
      wg.netEarnings += net

      if (o.payoutStatus === 'processed') {
        wg.paidAmount += net
      } else if (isDeliv) {
        wg.deliveredCount += 1
        wg.matureAmount += net
        wg.matureOrderIds.push(o._id.toString())
      } else {
        wg.pendingDeliveryCount += 1
        wg.immatureAmount += net
      }
    })

    const pendingWeeks = Object.values(weekGroups)
      .map((wg) => {
        const mAmount = Number(wg.matureAmount.toFixed(2))
        const imAmount = Number(wg.immatureAmount.toFixed(2))
        const pAmount = Number(wg.paidAmount.toFixed(2))

        let status = 'Settled'
        if (mAmount > 0 && pAmount > 0) {
          status = 'Partially Paid (More Mature Ready)'
        } else if (mAmount > 0) {
          status = 'Ready for Saturday Release'
        } else if (imAmount > 0 && pAmount > 0) {
          status = 'Partially Paid (Awaiting Delivery)'
        } else if (imAmount > 0) {
          status = 'Pending Delivery'
        } else if (pAmount > 0) {
          status = 'Fully Paid'
        }

        return {
          ...wg,
          grossSales: Number(wg.grossSales.toFixed(2)),
          commission: Number(wg.commission.toFixed(2)),
          netEarnings: Number(wg.netEarnings.toFixed(2)),
          matureAmount: mAmount,
          immatureAmount: imAmount,
          paidAmount: pAmount,
          payoutStatus: status,
          isActionable: mAmount > 0,
        }
      })
      .filter((wg) => wg.isActionable || (wg.totalOrders > 0 && wg.immatureAmount > 0))
      .sort((a, b) => {
        if (a.isActionable && !b.isActionable) return -1
        if (!a.isActionable && b.isActionable) return 1
        return b.matureAmount - a.matureAmount
      })

    const summary = {
      totalActionableAmount: Number(
        pendingWeeks.reduce((sum, w) => sum + (w.isActionable ? w.matureAmount : 0), 0).toFixed(2),
      ),
      actionableWeeksCount: pendingWeeks.filter((w) => w.isActionable).length,
      distinctSuppliersCount: new Set(
        pendingWeeks.filter((w) => w.isActionable).map((w) => w.supplierId),
      ).size,
      totalMatureOrdersCount: pendingWeeks.reduce((sum, w) => sum + w.matureOrderIds.length, 0),
    }

    return res.json({ data: pendingWeeks, summary })
  } catch (error) {
    console.error('getPendingWeeklyPayouts error:', error)
    return res.status(500).json({ message: error.message || 'Failed to load pending weekly payouts.' })
  }
}

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

    const data = suppliers.map((sup) => {
      const sId = sup._id.toString()
      const supOrders = allOrders.filter((o) => o.supplier && o.supplier.toString() === sId)
      const supPayouts = allPayouts.filter((p) => p.supplier && p.supplier.toString() === sId)
      const profile = profileMap[sId]

      const totalOrders = supOrders.length
      const deliveredCount = supOrders.filter((o) => isOrderMature(o)).length
      const pendingCount = supOrders.filter((o) => !isOrderMature(o) && o.status !== 'cancelled').length
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
          // Delivered orders are considered MATURE for Saturday weekly payouts
          if (isOrderMature(o)) {
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
      const isDelivered = isOrderMature(o)
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
        } else if (isDelivered) {
          g.matureAmount += net
        } else {
          g.immatureAmount += net
        }
      }
    })

    // Process payouts per month and build weekly cycles
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
        payoutStatus = 'Mature (Ready for Saturday Release)'
      } else if (g.immatureAmount > 0) {
        payoutStatus = 'Awaiting Delivery'
      }

      // Group orders of this month into Weekly cycles (ending Saturday)
      const weekMap = {}
      for (let w = 1; w <= 5; w++) {
        const dummyDay = Math.min((w - 1) * 7 + 1, 28)
        const sampleDate = new Date(`${g.monthKey}-${String(dummyDay).padStart(2, '0')}T12:00:00Z`)
        const wInfo = getWeekOfMonthInfo(sampleDate)
        weekMap[w] = {
          weekNumber: w,
          weekKey: `${g.monthKey}-W${w}`,
          weekLabel: wInfo.weekLabel,
          periodLabel: wInfo.periodLabel || wInfo.weekLabel,
          saturdayRelease: wInfo.saturdayRelease,
          saturdayLabel: wInfo.saturdayLabel || wInfo.saturdayRelease,
          startDay: wInfo.startDay,
          endDay: wInfo.endDay,
          totalOrders: 0,
          deliveredCount: 0,
          pendingCount: 0,
          grossSales: 0,
          commission: 0,
          netEarnings: 0,
          matureAmount: 0,
          immatureAmount: 0,
          paidAmount: 0,
          payoutStatus: 'Settled',
          orderIds: [],
          deliveredOrderIds: [],
        }
      }

      g.orders.forEach((o) => {
        const od = o.createdAt || new Date()
        const wInfo = getWeekOfMonthInfo(od)
        const w = weekMap[wInfo.weekNumber]
        if (!w) return

        w.totalOrders += 1
        w.orderIds.push(o._id.toString())

        const isDeliv = isOrderMature(o)
        if (isDeliv) {
          w.deliveredCount += 1
          if (o.payoutStatus !== 'processed') {
            w.deliveredOrderIds.push(o._id.toString())
          }
        } else {
          w.pendingCount += 1
        }

        if (o.status !== 'cancelled') {
          const oTot = Number(o.total || 0)
          const oComm = Number(o.commission || 0)
          const net = oTot - oComm
          w.grossSales += oTot
          w.commission += oComm
          w.netEarnings += net

          if (o.payoutStatus === 'processed') {
            w.paidAmount += net
          } else if (isDeliv) {
            w.matureAmount += net
          } else {
            w.immatureAmount += net
          }
        }
      })

      const weeks = Object.values(weekMap)
        .filter((w) => w.totalOrders > 0 || w.weekNumber <= 4)
        .map((w) => {
          const mAmount = Number(w.matureAmount.toFixed(2))
          const imAmount = Number(w.immatureAmount.toFixed(2))
          const pAmount = Number(w.paidAmount.toFixed(2))

          let wStatus = 'Settled'
          if (mAmount > 0) {
            wStatus = 'Mature (Ready for Saturday Release)'
          } else if (imAmount > 0) {
            wStatus = 'Awaiting Delivery'
          } else if (pAmount > 0) {
            wStatus = 'Paid'
          }

          return {
            ...w,
            grossSales: Number(w.grossSales.toFixed(2)),
            commission: Number(w.commission.toFixed(2)),
            netEarnings: Number(w.netEarnings.toFixed(2)),
            matureAmount: mAmount,
            immatureAmount: imAmount,
            paidAmount: pAmount,
            payoutStatus: wStatus,
          }
        })

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
        weeks,
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
    const targetWeekKey = req.query.weekKey || req.query.week || ''

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

    // Filter orders matching monthKey (and optionally weekKey)
    const monthOrders = orders.filter((o) => {
      const d = o.createdAt || new Date()
      const mMatches = formatMonthKey(d) === monthKey
      if (!mMatches) return false
      if (targetWeekKey) {
        const wInfo = getWeekOfMonthInfo(d)
        return wInfo.weekKey === targetWeekKey || `W${wInfo.weekNumber}` === targetWeekKey
      }
      return true
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

      const isMature = isOrderMature(o)
      const wInfo = getWeekOfMonthInfo(o.createdAt || new Date())

      if (o.payoutStatus !== 'processed' && o.status !== 'cancelled') {
        if (isMature) matureTotal += net
        else immatureTotal += net
      }

      return {
        ...o.toSafeObject(),
        isMature,
        matureStatusLabel: isMature ? 'Delivered (Mature)' : 'In Transit / Holding',
        weekInfo: wInfo,
        netAmount: net,
        supplierNet: net,
      }
    })

    const supplierDisplayId =
      supplier.clientId || `SUP-${supplier._id.toString().slice(-6).toUpperCase()}`

    return res.json({
      monthKey,
      weekKey: targetWeekKey || null,
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
    const { monthKey, weekKey, amount, tid, paymentMethod, notes, orderIds } = req.body

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

    // Screenshot file upload handling or URL fallback
    let receiptUrl = ''
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`
    } else if (req.body.receiptUrl) {
      receiptUrl = String(req.body.receiptUrl).trim()
    }

    // Determine orders to be paid
    let targetOrders = []
    let parsedOrderIds = []
    if (orderIds) {
      try {
        parsedOrderIds = typeof orderIds === 'string' ? JSON.parse(orderIds) : orderIds
      } catch {
        parsedOrderIds = Array.isArray(orderIds) ? orderIds : [orderIds]
      }
    }

    if (Array.isArray(parsedOrderIds) && parsedOrderIds.length > 0) {
      targetOrders = await Order.find({
        _id: { $in: parsedOrderIds },
        supplier: supplierId,
        payoutStatus: { $ne: 'processed' },
      })
    } else if (monthKey) {
      const allSupOrders = await Order.find({
        supplier: supplierId,
        payoutStatus: { $ne: 'processed' },
        status: { $ne: 'cancelled' },
      })
      targetOrders = allSupOrders.filter((o) => {
        const matchesMonth = formatMonthKey(o.createdAt) === monthKey
        if (!matchesMonth) return false
        if (weekKey) {
          const wInfo = getWeekOfMonthInfo(o.createdAt)
          const matchesWeek = wInfo.weekKey === weekKey || `W${wInfo.weekNumber}` === weekKey
          if (!matchesWeek) return false
        }
        return isOrderMature(o)
      })
    } else {
      const allSupOrders = await Order.find({
        supplier: supplierId,
        payoutStatus: { $ne: 'processed' },
        status: { $ne: 'cancelled' },
      })
      targetOrders = allSupOrders.filter((o) => isOrderMature(o))
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
      week: weekKey || '',
      paymentMethod: paymentMethod || 'Bank Transfer (IBFT)',
      receiptUrl,
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
      title: `Payout Released ($${payoutAmount.toFixed(2)})`,
      message: `Your weekly payout for ${weekKey || monthKey || 'mature orders'} of $${payoutAmount.toFixed(2)} has been released via ${paymentMethod || 'Bank Transfer'} with TID: ${tid}.`,
      link: '/supplier/finance/index',
    })

    return res.status(201).json({
      message: 'Supplier weekly payout successfully released and recorded.',
      payout: payout.toSafeObject(),
    })
  } catch (error) {
    console.error('executeSupplierPayout error:', error)
    return res.status(500).json({ message: error.message || 'Failed to process supplier payout.' })
  }
}
