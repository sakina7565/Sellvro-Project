import mongoose from 'mongoose'
import Dispute, { CHAT_WINDOW_MS, getUnreadCountForUser } from '../models/Dispute.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'

async function populateDispute(query) {
  return query
    .populate('raisedBy', 'fullName email role')
    .populate('againstUser', 'fullName email role')
    .populate('order', 'orderNo')
    .populate('product', 'name sku')
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
    const dispute = await Dispute.create({
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
    const disputes = await populateDispute(Dispute.find().sort({ updatedAt: -1 }))
    return res.json({ data: disputes.map((item) => item.toSafeObject({ viewerId: req.user._id })) })
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

    dispute.status = 'resolved'
    if (req.body.resolutionNote) {
      dispute.resolutionNote = String(req.body.resolutionNote).trim()
    }
    await dispute.save()

    return res.json({
      message: 'Dispute marked as resolved.',
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

    dispute.status = 'rejected'
    if (req.body.resolutionNote || req.body.reason) {
      dispute.resolutionNote = String(req.body.resolutionNote || req.body.reason).trim()
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
