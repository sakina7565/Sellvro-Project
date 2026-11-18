import mongoose from 'mongoose'
import Dispute, { CHAT_WINDOW_MS, getUnreadCountForUser } from '../models/Dispute.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import WalletRequest from '../models/WalletRequest.js'
import { getNextDisputeNo, getNextWalletTxId } from '../services/sequenceService.js'
import { createNotification } from '../utils/notifications.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { cancelWmsOrder } from '../services/wmsSqlService.js'

async function populateDispute(query) {
  return query
    .populate('raisedBy', 'fullName email role displayId clientId phone')
    .populate('againstUser', 'fullName email role displayId clientId phone storeName')
    .populate({
      path: 'order',
      populate: [
        { path: 'user', select: 'fullName email phone displayId clientId walletBalance' },
        { path: 'supplier', select: 'fullName email phone displayId clientId storeName' },
        { path: 'product', select: 'name sku image images' },
      ],
    })
    .populate('product', 'name sku image images')
    .populate('messages.sender', 'fullName email role')
}

async function findOrderByRef(ref) {
  const value = String(ref || '').trim()
  if (!value) return null
  if (mongoose.Types.ObjectId.isValid(value)) {
    return Order.findById(value)
  }
  return Order.findOne({ orderNo: value.toUpperCase() })
}

function userIdString(value) {
  return value?._id?.toString?.() || value?.toString?.() || ''
}

function canAccessOrder(order, user) {
  if (user.role === 'admin') return true
  const uid = user._id.toString()
  if (user.role === 'user') return userIdString(order.user) === uid
  if (user.role === 'supplier') return userIdString(order.supplier) === uid
  return false
}

function resolveAgainstUser({ againstRole, order, product, explicitAgainstUser, raiserRole }) {
  if (againstRole === 'admin' || againstRole === 'platform') {
    return null
  }

  if (explicitAgainstUser) {
    return explicitAgainstUser
  }

  if (order) {
    if (raiserRole === 'user' && againstRole === 'supplier') {
      return order.supplier
    }
    if (raiserRole === 'supplier' && againstRole === 'user') {
      return order.user
    }
  }

  if (product && raiserRole === 'user' && againstRole === 'supplier') {
    return product.supplier
  }

  return null
}
function canAccessDispute(dispute, user) {
  if (user.role === 'admin') return true
  const uid = user._id.toString()
  if (userIdString(dispute.raisedBy) === uid) return true
  if (userIdString(dispute.againstUser) === uid) return true
  return false
}

function extendChatWindow() {
  return new Date(Date.now() + CHAT_WINDOW_MS)
}

export const createDispute = async (req, res) => {
  try {
    const message = String(req.body.message || req.body.requests || '').trim()
    if (!message) {
      return res.status(400).json({ message: 'A dispute message is required.' })
    }

    const againstRole = String(req.body.againstRole || '').trim().toLowerCase()
    const allowedRoles = ['supplier', 'user', 'admin', 'platform']
    if (!allowedRoles.includes(againstRole)) {
      return res.status(400).json({ message: 'againstRole must be supplier, user, admin, or platform.' })
    }

    let type = String(req.body.type || '').trim()
    if (!type) {
      if (req.user.role === 'user') type = 'user_complaint'
      else if (req.user.role === 'supplier') type = 'supplier_dispute'
      else type = 'other'
    }

    let order = null
    const orderRef = req.body.orderId || req.body.order
    if (orderRef) {
      order = await findOrderByRef(orderRef)
      if (!order) {
        return res.status(404).json({ message: 'Related order not found.' })
      }
      if (!canAccessOrder(order, req.user)) {
        return res.status(403).json({ message: 'You do not have access to this order.' })
      }
    }

    // Strict 12-Hour Cancellation Policy Handling for order_cancellation disputes
    if (type === 'order_cancellation') {
      if (!order) {
        return res.status(400).json({ message: 'An Order ID or Order Number is mandatory for order cancellation disputes.' })
      }
      if (order.status === 'cancelled' || order.isRefunded) {
        return res.status(400).json({ message: 'This order has already been cancelled and refunded.' })
      }
      const orderTime = new Date(order.createdAt).getTime()
      const ageHours = Number(((Date.now() - orderTime) / (1000 * 60 * 60)).toFixed(1))
      if (Date.now() - orderTime > 12 * 60 * 60 * 1000) {
        return res.status(400).json({
          message: `Cancellation Policy Expired: This order was placed ${ageHours} hours ago. Cancellation requests can ONLY be submitted within 12 hours of order placement.`,
        })
      }
      if (Boolean(order.isDispatched) || ['in_transit', 'out_for_delivery', 'delivered'].includes(String(order.trackingStatus || '').toLowerCase())) {
        return res.status(400).json({
          message: 'Order cannot be cancelled because it has already been dispatched from warehouse / handed to courier.',
        })
      }
      order.cancellationRequest = {
        isRequested: true,
        requestedBy: req.user.role === 'supplier' ? 'supplier' : 'user',
        requesterUser: req.user._id,
        reason: message,
        requestedAt: new Date(),
        status: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: '',
      }
      order.status = 'cancellation_pending'
      if (!Array.isArray(order.trackingTimeline)) {
        order.trackingTimeline = []
      }
      order.trackingTimeline.push({
        status: 'cancellation_pending',
        title: `Cancellation Dispute Opened by ${req.user.role === 'supplier' ? 'Supplier' : 'Customer'}`,
        location: 'Disputes',
        timestamp: new Date(),
        note: `Reason: "${message}". Placed ${ageHours}h ago. Requires admin approval within 12-hour policy window.`,
      })
      await order.save()

      await createNotification({
        targetRole: 'admin',
        type: 'dispute',
        title: `Cancellation Request: Order #${order.orderNo}`,
        message: `${req.user.role === 'supplier' ? 'Supplier' : 'Customer'} opened a cancellation dispute for Order #${order.orderNo} (${ageHours}h elapsed). Reason: "${message}". Review required within 12 hours.`,
        link: '/admin/supplier/disputes',
        metadata: { orderId: order._id.toString(), orderNo: order.orderNo, requestedBy: req.user.role, reason: message, hoursElapsed: ageHours },
      }).catch((err) => console.warn('[Dispute notification warning]', err.message))
    }

    let product = null
    if (req.body.productId || req.body.product) {
      product = await Product.findById(req.body.productId || req.body.product)
      if (!product) {
        return res.status(404).json({ message: 'Related product not found.' })
      }
    } else if (order?.product) {
      product = await Product.findById(order.product)
    }

    if (order && product && order.product.toString() !== product._id.toString()) {
      return res.status(400).json({ message: 'Product does not match the selected order.' })
    }

    const explicitAgainstUser = req.body.againstUserId || req.body.againstUser || null
    const againstUser = resolveAgainstUser({
      againstRole,
      order,
      product,
      explicitAgainstUser,
      raiserRole: req.user.role,
    })

    if (againstRole === 'supplier' && !againstUser) {
      return res.status(400).json({
        message: 'A supplier must be linked. Provide an order or product tied to the supplier.',
      })
    }

    if (againstRole === 'user' && !againstUser) {
      return res.status(400).json({
        message: 'A user must be linked. Provide an order tied to the buyer.',
      })
    }

    const now = new Date()
    let disputeNo = ''
    try {
      disputeNo = await getNextDisputeNo()
    } catch (err) {
      const yy = now.getFullYear().toString().slice(-2)
      disputeNo = `${yy}-D-${String(Date.now()).slice(-4)}`
    }

    const dispute = await Dispute.create({
      disputeNo,
      raisedBy: req.user._id,
      againstRole,
      againstUser,
      order: order?._id || null,
      product: product?._id || null,      type,
      message,
      status: 'open',
      chatWindowExpiresAt: extendChatWindow(),
      messages: [
        {
          sender: req.user._id,
          text: message,
          role: req.user.role,
          createdAt: now,
        },
      ],
    })

    const populated = await populateDispute(Dispute.findById(dispute._id))
    return res.status(201).json({
      message: 'Dispute submitted.',
      dispute: populated.toSafeObject({ includeMessages: true, viewerId: req.user._id }),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create dispute.' })
  }
}

export const listMyDisputes = async (req, res) => {
  try {
    const uid = req.user._id
    const disputes = await populateDispute(
      Dispute.find({
        $or: [{ raisedBy: uid }, { againstUser: uid }],
      }).sort({ updatedAt: -1 }),
    )
    return res.json({ data: disputes.map((item) => item.toSafeObject({ viewerId: req.user._id })) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load disputes.' })
  }
}

export const getDispute = async (req, res) => {
  try {
    const dispute = await populateDispute(Dispute.findById(req.params.id))
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' })
    }
    if (!canAccessDispute(dispute, req.user)) {
      return res.status(403).json({ message: 'You do not have access to this dispute.' })
    }
    return res.json({ dispute: dispute.toSafeObject({ includeMessages: true, viewerId: req.user._id }) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load dispute.' })
  }
}

export const addDisputeMessage = async (req, res) => {
  try {
    const text = String(req.body.text || req.body.message || '').trim()
    if (!text) {
      return res.status(400).json({ message: 'Message text is required.' })
    }

    const dispute = await populateDispute(Dispute.findById(req.params.id))
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' })
    }
    if (!canAccessDispute(dispute, req.user)) {
      return res.status(403).json({ message: 'You do not have access to this dispute.' })
    }
    if (dispute.status === 'resolved' || dispute.status === 'rejected') {
      return res.status(400).json({ message: 'This dispute is closed. Chat is no longer available.' })
    }

    const isAdmin = req.user.role === 'admin'
    if (!isAdmin) {
      const fallbackExpiry = new Date((dispute.createdAt || new Date()).getTime() + CHAT_WINDOW_MS)
      const expiresAt = dispute.chatWindowExpiresAt
        ? new Date(dispute.chatWindowExpiresAt)
        : fallbackExpiry
      if (Date.now() >= expiresAt.getTime()) {
        return res.status(400).json({ message: 'The 24-hour chat window has expired.' })
      }
    }

    dispute.messages.push({
      sender: req.user._id,
      text,
      role: req.user.role,
      createdAt: new Date(),
    })
    dispute.chatWindowExpiresAt = extendChatWindow()
    await dispute.save()

    const refreshed = await populateDispute(Dispute.findById(dispute._id))
    return res.status(201).json({
      message: 'Message sent.',
      dispute: refreshed.toSafeObject({ includeMessages: true, viewerId: req.user._id }),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send message.' })
  }
}

export const listSupplierDisputes = async (req, res) => {
  try {
    const disputes = await populateDispute(
      Dispute.find({
        $or: [{ type: 'supplier_dispute' }, { againstRole: 'supplier' }],
      }).sort({ updatedAt: -1 }),
    )
    return res.json({ data: disputes.map((item) => item.toSafeObject({ viewerId: req.user._id })) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load disputes.' })
  }
}

export const listUserComplaints = async (req, res) => {
  try {
    const disputes = await populateDispute(
      Dispute.find({
        $or: [{ type: 'user_complaint' }, { againstRole: 'user' }],
      }).sort({ updatedAt: -1 }),
    )
    return res.json({ data: disputes.map((item) => item.toSafeObject({ viewerId: req.user._id })) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load complaints.' })
  }
}
export const listAllDisputes = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(req.query.limit, 10))) : 0
    const filter = {}
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status
    }

    let query = Dispute.find(filter).sort({ updatedAt: -1 })
    if (limit > 0) {
      query = query.skip((page - 1) * limit).limit(limit)
    }

    const [disputes, total] = await Promise.all([
      populateDispute(query),
      Dispute.countDocuments(filter),
    ])

    return res.json({
      data: disputes.map((item) => item.toSafeObject({ viewerId: req.user._id })),
      pagination: {
        total,
        page,
        limit: limit || total,
        pages: limit > 0 ? Math.ceil(total / limit) || 1 : 1,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load disputes.' })
  }
}

export const resolveDispute = async (req, res) => {
  try {
    const dispute = await populateDispute(Dispute.findById(req.params.id))
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' })
    }
    if (dispute.status !== 'open') {
      return res.status(400).json({ message: 'Only open disputes can be resolved.' })
    }

    // Strict 12-Hour Cancellation Policy Check for cancellation disputes
    if (dispute.type === 'order_cancellation' || req.body.outcome === 'cancel_order' || req.body.refundBuyer) {
      if (dispute.order) {
        const order = await Order.findById(dispute.order._id || dispute.order)
        if (order && order.createdAt) {
          const orderAgeMs = Date.now() - new Date(order.createdAt).getTime()
          const ageHours = Number((orderAgeMs / (1000 * 60 * 60)).toFixed(1))
          if (orderAgeMs > 12 * 60 * 60 * 1000) {
            return res.status(400).json({
              message: `Cancellation Blocked by 12-Hour Policy: Order #${order.orderNo} was placed ${ageHours} hours ago. Platform policy strictly forbids cancelling orders after 12 hours.`,
            })
          }
        }
      }
    }

    dispute.status = 'resolved'
    if (req.body.resolutionNote) {
      dispute.resolutionNote = String(req.body.resolutionNote).trim()
    }

    // Financial settlement & cancellation processing
    let refundProcessed = false
    let refundAmount = 0
    if (dispute.order && (dispute.type === 'order_cancellation' || req.body.refundBuyer || req.body.outcome === 'refund' || req.body.outcome === 'cancel_order')) {
      const order = await Order.findById(dispute.order._id || dispute.order)
      if (order && !order.isRefunded && order.status !== 'cancelled') {
        // Cash-on-delivery orders were never paid: cancel them, but credit nothing (same rule as updateOrderStatus).
        const paidUpfront = order.paymentMethod !== 'cod'
        const orderTotal = Number(order.total || 0)
        const requestedRefund = Number(req.body.refundAmount || orderTotal)
        if (paidUpfront && (!Number.isFinite(requestedRefund) || requestedRefund < 0 || requestedRefund > orderTotal + 0.005)) {
          return res.status(400).json({
            message: `Refund amount must be between $0 and the order total ($${orderTotal.toFixed(2)}).`,
          })
        }
        refundAmount = paidUpfront ? requestedRefund : 0
        if (refundAmount > 0 || !paidUpfront) {
          // Claim the order atomically so a parallel approval/resolution cannot refund it twice.
          const claim = await Order.updateOne(
            { _id: order._id, isRefunded: { $ne: true }, status: { $ne: 'cancelled' } },
            { $set: { isRefunded: true } },
          )
          if (!claim.modifiedCount) {
            return res.status(409).json({ message: 'This order is already being cancelled or refunded.' })
          }
          const buyerId = order.user?._id || order.user
          if (buyerId && refundAmount > 0) {
            await User.findByIdAndUpdate(buyerId, { $inc: { walletBalance: Number(refundAmount.toFixed(2)) } })
          }
          order.isRefunded = true
          order.refundedAt = new Date()
          order.refundAmount = refundAmount
          order.status = 'cancelled'
          order.trackingStatus = 'cancelled'
          order.payoutStatus = 'cancelled'

          let refundTxId = ''
          try {
            refundTxId = await getNextWalletTxId()
          } catch (_txErr) {
            refundTxId = `26-W-${Date.now().toString().slice(-5)}`
          }
          order.refundTxId = refundTxId

          order.cancellationRequest = {
            ...(order.cancellationRequest?.toObject?.() || order.cancellationRequest || {}),
            status: 'approved',
            reviewedAt: new Date(),
            reviewedBy: req.user._id,
          }

          if (!Array.isArray(order.trackingTimeline)) {
            order.trackingTimeline = []
          }
          order.trackingTimeline.push({
            status: 'cancelled',
            title: 'Cancellation Approved via Dispute Resolution',
            location: 'Administration',
            timestamp: new Date(),
            note: refundAmount > 0
              ? `Dispute ${dispute.disputeNo} resolved by Admin within 12 hours. Refund of $${refundAmount.toFixed(2)} credited to customer wallet.`
              : `Dispute ${dispute.disputeNo} resolved by Admin within 12 hours. Cash on Delivery order: no payment was collected, so no refund is due.`,
          })

          // Restore product stock
          if (order.product) {
            await Product.findByIdAndUpdate(order.product._id || order.product, { $inc: { quantity: order.quantity } }).catch(() => { })
          }
          await cancelWmsOrder({
            requestNumber: order.wmsRequestNumber || `REQ-${order.orderNo.replace('ORD-', '')}`,
            orderNo: order.orderNo,
            quantity: order.quantity,
          }).catch(() => { })

          await order.save()
          refundProcessed = true

          const totalRefund = Number(refundAmount.toFixed(2))
          const commissionRefunded = Number(Number(order.commission || 0).toFixed(2))
          const supplierAmount = Number((totalRefund - commissionRefunded).toFixed(2))

          if (refundAmount > 0) await WalletRequest.create({
            transactionId: refundTxId,
            user: buyerId,
            amount: totalRefund,
            depositCurrency: 'USD',
            depositAmount: totalRefund,
            exchangeRate: 1,
            grossAmount: totalRefund,
            conversionFeeRate: 0,
            conversionFee: 0,
            bankTid: `REFUND-${order.orderNo}`,
            paymentMethod: 'wallet_refund',
            order: order._id,
            orderNo: order.orderNo,
            refundType: 'order_cancellation',
            supplierAmount,
            commissionRefunded,
            status: 'approved',
            adminNote: `100% refund for cancelled Order #${order.orderNo} via Dispute ${dispute.disputeNo} approval. ($${supplierAmount.toFixed(2)} supplier payable reversed, $${commissionRefunded.toFixed(2)} marketplace commission refunded).`,
          }).catch((err) => console.warn('[Dispute refund log error]', err.message))

          await createNotification({
            recipient: buyerId,
            targetRole: 'user',
            type: 'order',
            title: refundAmount > 0 ? `Order #${order.orderNo} Cancelled & Refunded` : `Order #${order.orderNo} Cancelled`,
            message: refundAmount > 0
              ? `Dispute for Order #${order.orderNo} was resolved. $${refundAmount.toFixed(2)} refunded to your wallet.`
              : `Dispute for Order #${order.orderNo} was resolved and the order cancelled. As a Cash on Delivery order, no payment was taken, so no refund is due.`,
            link: '/user/orders',
          }).catch(() => { })

          if (order.supplier) {
            await createNotification({
              recipient: order.supplier._id || order.supplier,
              targetRole: 'supplier',
              type: 'order',
              title: `Order #${order.orderNo} Cancelled`,
              message: `Cancellation for Order #${order.orderNo} was approved via Dispute resolution within 12h. Do not dispatch.`,
              link: '/supplier/view-orders',
            }).catch(() => { })
          }
        }
      }
    }

    await dispute.save()

    await logAdminAction({
      adminId: req.user?._id,
      action: 'resolve_dispute',
      targetType: 'dispute',
      targetId: dispute._id,
      details: { disputeNo: dispute.disputeNo, orderCancelled: refundProcessed, refundAmount },
      ip: req.ip,
    })

    return res.json({
      message: refundProcessed
        ? refundAmount > 0
          ? `Dispute marked as resolved. $${refundAmount.toFixed(2)} refunded to buyer.`
          : 'Dispute marked as resolved. Order cancelled (Cash on Delivery: no refund due).'
        : 'Dispute marked as resolved.',
      dispute: dispute.toSafeObject({ includeMessages: true, viewerId: req.user._id }),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to resolve dispute.' })
  }
}

export const rejectDispute = async (req, res) => {
  try {
    const dispute = await populateDispute(Dispute.findById(req.params.id))
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' })
    }
    if (dispute.status !== 'open') {
      return res.status(400).json({ message: 'Only open disputes can be rejected.' })
    }

    const rejectionNote = String(req.body.resolutionNote || req.body.reason || 'Dispute rejected by administration.').trim()
    dispute.status = 'rejected'
    dispute.resolutionNote = rejectionNote

    // If this was an order cancellation dispute, revert the order status to awaiting_dispatch
    if (dispute.order && (dispute.type === 'order_cancellation' || dispute.order.status === 'cancellation_pending')) {
      const order = await Order.findById(dispute.order._id || dispute.order)
      if (order && order.status === 'cancellation_pending') {
        const prevStatus = order.isDispatched ? 'in_process' : 'awaiting_dispatch'
        order.status = prevStatus
        order.cancellationRequest = {
          ...(order.cancellationRequest?.toObject?.() || order.cancellationRequest || {}),
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
          rejectionReason: rejectionNote,
        }
        if (!Array.isArray(order.trackingTimeline)) {
          order.trackingTimeline = []
        }
        order.trackingTimeline.push({
          status: prevStatus,
          title: 'Cancellation Dispute Rejected by Admin',
          location: 'Administration',
          timestamp: new Date(),
          note: `Admin rejected cancellation dispute: "${rejectionNote}". Order remains active.`,
        })
        await order.save()

        const requesterId = dispute.raisedBy?._id || dispute.raisedBy
        if (requesterId) {
          await createNotification({
            recipient: requesterId,
            type: 'dispute',
            title: `Cancellation Request Rejected: Order #${order.orderNo}`,
            message: `Your cancellation request for Order #${order.orderNo} was rejected by Admin: "${rejectionNote}". The order will proceed.`,
            link: '/supplier/disputes',
          }).catch(() => { })
        }
      }
    }

    await dispute.save()

    return res.json({
      message: 'Dispute rejected.',
      dispute: dispute.toSafeObject({ includeMessages: true, viewerId: req.user._id }),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reject dispute.' })
  }
}

export const markDisputeRead = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' })
    }
    if (!canAccessDispute(dispute, req.user)) {
      return res.status(403).json({ message: 'You do not have access to this dispute.' })
    }

    dispute.markReadForUser(req.user._id)
    await dispute.save()

    const populated = await populateDispute(Dispute.findById(dispute._id))
    return res.json({
      message: 'Dispute marked as read.',
      dispute: populated.toSafeObject({ includeMessages: true, viewerId: req.user._id }),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to mark dispute as read.' })
  }
}

export const getUnreadDisputeCount = async (req, res) => {
  try {
    const uid = req.user._id
    let disputes

    if (req.user.role === 'admin') {
      disputes = await Dispute.find({ status: 'open' })
    } else {
      disputes = await Dispute.find({
        $or: [{ raisedBy: uid }, { againstUser: uid }],
        status: 'open',
      })
    }

    const count = disputes.reduce((sum, item) => sum + getUnreadCountForUser(item, uid), 0)
    return res.json({ count })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load unread count.' })
  }
}
