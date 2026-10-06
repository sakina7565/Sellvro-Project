import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'

function generateOrderNo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 10; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `ORD-${suffix}`
}

async function uniqueOrderNo() {
  for (let i = 0; i < 8; i += 1) {
    const orderNo = generateOrderNo()
    const exists = await Order.findOne({ orderNo })
    if (!exists) return orderNo
  }
  throw new Error('Could not generate a unique order number.')
}

async function populateOrder(query) {
  return query
    .populate('user', 'fullName email role')
    .populate('supplier', 'fullName email role')
    .populate('product', 'name sku image')
}

function normalizeShippingAddress(raw = {}) {
  return {
    fullName: String(raw.fullName || '').trim(),
    phone: String(raw.phone || '').trim(),
    addressLine: String(raw.addressLine || '').trim(),
    city: String(raw.city || '').trim(),
    state: String(raw.state || '').trim(),
    postalCode: String(raw.postalCode || '').trim(),
    country: String(raw.country || '').trim(),
  }
}

function validateShippingAddress(shipping) {
  const labels = {
    fullName: 'full name',
    phone: 'phone',
    addressLine: 'address',
    city: 'city',
    state: 'state / province',
    postalCode: 'postal code',
    country: 'country',
  }
  for (const [key, label] of Object.entries(labels)) {
    if (!shipping[key]) {
      return `Shipping ${label} is required.`
    }
  }
  return null
}

export const createOrder = async (req, res) => {
  try {
    const productId = req.body.productId || req.body.product
    const quantity = Number(req.body.quantity || 1)
    const shippingAddress = normalizeShippingAddress(
      req.body.shippingAddress || req.body.shipping || req.body,
    )

    if (!productId) {
      return res.status(400).json({ message: 'Product is required.' })
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' })
    }

    const shippingError = validateShippingAddress(shippingAddress)
    if (shippingError) {
      return res.status(400).json({ message: shippingError })
    }

    const product = await Product.findById(productId)
    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Product is not available for purchase.' })
    }
    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock for this product.' })
    }

    const unitPrice = Number(product.price)
    const total = unitPrice * quantity
    const commissionPercent = Number(product.commission || 0)
    const commission = Number(((total * commissionPercent) / 100).toFixed(2))

    const buyer = await User.findById(req.user._id)
    if (!buyer) {
      return res.status(401).json({ message: 'User not found.' })
    }

    if ((buyer.walletBalance || 0) < total) {
      return res.status(400).json({
        message: `Insufficient wallet balance. Need $${total.toFixed(2)}, have $${Number(buyer.walletBalance || 0).toFixed(2)}.`,
      })
    }

    buyer.walletBalance = Number((buyer.walletBalance - total).toFixed(2))
    product.quantity -= quantity
    const orderNo = await uniqueOrderNo()

    const order = await Order.create({
      orderNo,
      user: buyer._id,
      supplier: product.supplier,
      product: product._id,
      productName: product.name,
      quantity,
      unitPrice,
      total,
      commission,
      commissionPercent,
      status: 'placed',
      brandLabel: String(req.body.brandLabel || '').trim(),
      payoutStatus: 'pending',
      shippingAddress,
    })

    await buyer.save()
    await product.save()

    const populated = await populateOrder(Order.findById(order._id))
    return res.status(201).json({
      message: 'Order placed. Wallet debited.',
      order: populated.toSafeObject(),
      walletBalance: buyer.walletBalance,
    })
  } catch (error) {
    console.error('Create order error:', error)
    return res.status(500).json({ message: error.message || 'Failed to create order.' })
  }
}

export const listMyOrders = async (req, res) => {
  try {
    const orders = await populateOrder(Order.find({ user: req.user._id }).sort({ createdAt: -1 }))
    return res.json({ data: orders.map((item) => item.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load orders.' })
  }
}

export const listSupplierOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ supplier: req.user._id }).sort({ createdAt: -1 }),
    )
    return res.json({ data: orders.map((item) => item.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load orders.' })
  }
}

export const listAllOrders = async (_req, res) => {
  try {
    const orders = await populateOrder(Order.find().sort({ createdAt: -1 }))
    return res.json({ data: orders.map((item) => item.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load orders.' })
  }
}

export const lookupOrder = async (req, res) => {
  try {
    const ref = String(req.query.ref || '').trim()
    if (!ref) {
      return res.status(400).json({ message: 'Order ID or order number is required.' })
    }

    let order
    if (mongoose.Types.ObjectId.isValid(ref)) {
      order = await populateOrder(Order.findById(ref))
    } else {
      order = await populateOrder(Order.findOne({ orderNo: ref.toUpperCase() }))
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' })
    }

    const uid = req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    const isBuyer = order.user?._id?.toString?.() === uid || order.user?.toString?.() === uid
    const isSupplier =
      order.supplier?._id?.toString?.() === uid || order.supplier?.toString?.() === uid

    if (!isAdmin && !isBuyer && !isSupplier) {
      return res.status(403).json({ message: 'You do not have access to this order.' })
    }

    return res.json({ order: order.toSafeObject() })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to lookup order.' })
  }
}

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id))
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' })
    }

    const next = String(req.body.status || '').trim().toLowerCase()
    const allowed = ['placed', 'pending', 'cancelled', 'in_process']
    if (!allowed.includes(next)) {
      return res.status(400).json({ message: 'Invalid order status.' })
    }

    const isAdmin = req.user.role === 'admin'
    const isSupplier = req.user.role === 'supplier' && order.supplier._id.equals(req.user._id)

    if (!isAdmin && !isSupplier) {
      return res.status(403).json({ message: 'Not allowed to update this order.' })
    }

    order.status = next
    await order.save()

    return res.json({
      message: 'Order status updated.',
      order: order.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update order.' })
  }
}
