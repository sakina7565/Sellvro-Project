import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { createNotification } from '../utils/notifications.js'

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
    .populate('user', 'fullName email role clientId')
    .populate('supplier', 'fullName email role clientId')
    .populate('product', 'name sku image inWarehouse fulfillBy')
}

function normalizeShippingAddress(raw = {}) {
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      data = {}
    }
  }
  return {
    fullName: String(data?.fullName || '').trim(),
    phone: String(data?.phone || '').trim(),
    addressLine: String(data?.addressLine || '').trim(),
    city: String(data?.city || '').trim(),
    state: String(data?.state || '').trim(),
    postalCode: String(data?.postalCode || '').trim(),
    country: String(data?.country || '').trim(),
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
  let debitedBuyer = false
  let decrementedStock = false
  let buyerTotal = 0
  let targetProductId = null
  let orderQuantity = 0

  try {
    const productId = req.body.productId || req.body.product
    const quantity = Number(req.body.quantity || 1)
    const shippingAddress = normalizeShippingAddress(
      req.body.shippingAddress || req.body.shipping || req.body,
    )

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'A valid product ID is required.' })
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be a positive integer.' })
    }

    const shippingError = validateShippingAddress(shippingAddress)
    if (shippingError) {
      return res.status(400).json({ message: shippingError })
    }

    // Shipping & Packaging Label validation
    const orderLabelRef = String(req.body.orderLabelRef || req.body.brandLabel || '').trim()
    if (!orderLabelRef) {
      return res.status(400).json({
        message: 'Shipping & Packaging Label reference or brand label is required to place the order.',
      })
    }
    const labelNotes = String(req.body.labelNotes || '').trim()

    // File upload or fallback URL
    let shippingLabelUrl = ''
    if (req.file) {
      shippingLabelUrl = `/uploads/${req.file.filename}`
    } else if (req.body.shippingLabelUrl) {
      shippingLabelUrl = String(req.body.shippingLabelUrl).trim()
    }

    if (!shippingLabelUrl) {
      return res.status(400).json({
        message: 'Shipping label file (PDF or Image) is required for WMS order dispatch.',
      })
    }
    const brandLabel = String(req.body.brandLabel || orderLabelRef).trim()

    const product = await Product.findById(productId)
    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Product is not available for purchase.' })
    }
    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock for this product.' })
    }

    const unitPrice = Number(product.price)
    const total = Number((unitPrice * quantity).toFixed(2))
    const commissionPercent = Number(product.commission || 0)
    const commission = Number(((total * commissionPercent) / 100).toFixed(2))

    buyerTotal = total
    targetProductId = product._id
    orderQuantity = quantity

    // 1. Atomic debit of buyer's wallet balance
    const updatedBuyer = await User.findOneAndUpdate(
      { _id: req.user._id, walletBalance: { $gte: total } },
      { $inc: { walletBalance: -total } },
      { new: true },
    )

    if (!updatedBuyer) {
      const buyerCheck = await User.findById(req.user._id)
      if (!buyerCheck) {
        return res.status(401).json({ message: 'User not found.' })
      }
      return res.status(400).json({
        message: `Insufficient wallet balance. Need $${total.toFixed(2)}, have $${Number(buyerCheck.walletBalance || 0).toFixed(2)}.`,
      })
    }
    debitedBuyer = true

    // 2. Atomic decrement of product inventory
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, quantity: { $gte: quantity }, status: 'active' },
      { $inc: { quantity: -quantity } },
      { new: true },
    )

    if (!updatedProduct) {
      // Revert buyer wallet balance
      await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: total } })
      debitedBuyer = false
      return res.status(409).json({ message: 'Insufficient stock or product unavailable.' })
    }
    decrementedStock = true

    const orderNo = await uniqueOrderNo()

    // Determine initial warehouse custody location (WMS Central Hub vs Supplier Warehouse)
    const isAtWms = updatedProduct.inWarehouse === true || updatedProduct.fulfillBy === 'warehouse'
    const initialWarehouseLocation = isAtWms ? 'wms_hub' : 'supplier_warehouse'
    const initialWarehouseLabel = isAtWms ? 'At WMS Central Hub' : 'At Supplier Warehouse'

    const order = await Order.create({
      orderNo,
      user: updatedBuyer._id,
      supplier: updatedProduct.supplier,
      product: updatedProduct._id,
      productName: updatedProduct.name,
      quantity,
      unitPrice,
      total,
      commission,
      commissionPercent,
      status: 'placed',
      warehouseLocation: initialWarehouseLocation,
      warehouseLocationLabel: initialWarehouseLabel,
      trackingNumber: `SLV-${orderNo.replace('ORD-', '')}`,
      carrier: 'Sellvro Express',
      trackingStatus: 'placed',
      estimatedDelivery: '3 - 5 Business Days',
      trackingTimeline: [
        {
          status: 'placed',
          title: 'Order Placed & Label Attached',
          location: initialWarehouseLabel,
          timestamp: new Date(),
          note: `Order confirmed with complete shipping label. Custody location: ${initialWarehouseLabel}.`,
        },
      ],
      brandLabel,
      orderLabelRef,
      labelNotes,
      shippingLabelUrl,
      payoutStatus: 'pending',
      shippingAddress,
    })

    // Dispatch notifications to buyer, supplier and admin
    createNotification({
      recipient: updatedBuyer._id,
      targetRole: 'user',
      type: 'order',
      title: `Order ${orderNo} Placed`,
      message: `Your order for ${quantity}x ${updatedProduct.name} ($${total.toFixed(2)}) has been placed.`,
      link: '/user/orders',
    })

    createNotification({
      recipient: updatedProduct.supplier,
      targetRole: 'supplier',
      type: 'order',
      title: `New Order Received (${orderNo})`,
      message: `A new order has been placed for ${quantity}x ${updatedProduct.name} ($${total.toFixed(2)}).`,
      link: '/supplier/orders',
    })

    createNotification({
      targetRole: 'admin',
      type: 'order',
      title: `Order Placed (#${orderNo})`,
      message: `${updatedBuyer.fullName || 'User'} placed an order for ${updatedProduct.name} totaling $${total.toFixed(2)}.`,
      link: '/admin/orders',
    })

    const populated = await populateOrder(Order.findById(order._id))
    return res.status(201).json({
      message: 'Order placed. Wallet debited.',
      order: populated.toSafeObject(),
      walletBalance: updatedBuyer.walletBalance,
    })
  } catch (error) {
    console.error('Create order error:', error)
    if (decrementedStock && targetProductId) {
      await Product.findByIdAndUpdate(targetProductId, { $inc: { quantity: orderQuantity } }).catch(() => {})
    }
    if (debitedBuyer && buyerTotal > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: buyerTotal } }).catch(() => {})
    }
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
    const allowed = ['placed', 'pending', 'cancelled', 'in_process', 'delivered', 'returned']
    if (!allowed.includes(next)) {
      return res.status(400).json({ message: 'Invalid order status.' })
    }

    // Terminal states cannot transition to other statuses
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot modify an order that has already been cancelled.' })
    }
    if (order.status === 'delivered' && next !== 'returned') {
      return res.status(400).json({ message: 'Delivered orders cannot be moved back or cancelled (only returned).' })
    }

    const isAdmin = req.user.role === 'admin'
    const isSupplier = req.user.role === 'supplier' && order.supplier._id.equals(req.user._id)

    if (!isAdmin && !isSupplier) {
      return res.status(403).json({ message: 'Not allowed to update this order.' })
    }

    // Handle cancellation: refund buyer wallet & restore inventory stock
    if (next === 'cancelled') {
      if (!order.isRefunded) {
        const buyerId = order.user?._id || order.user
        const productId = order.product?._id || order.product

        if (buyerId && order.total > 0) {
          await User.findByIdAndUpdate(buyerId, { $inc: { walletBalance: Number(order.total.toFixed(2)) } })
        }
        if (productId && order.quantity > 0) {
          await Product.findByIdAndUpdate(productId, { $inc: { quantity: order.quantity } })
        }

        order.isRefunded = true
        order.refundedAt = new Date()
        order.payoutStatus = 'cancelled'

        if (!Array.isArray(order.trackingTimeline)) {
          order.trackingTimeline = []
        }
        order.trackingTimeline.push({
          status: 'cancelled',
          title: 'Order Cancelled & Refunded',
          location: 'System',
          timestamp: new Date(),
          note: `Order cancelled by ${isAdmin ? 'Admin' : 'Supplier'}. $${Number(order.total).toFixed(2)} refunded to buyer wallet, and stock restored.`,
        })

        createNotification({
          recipient: buyerId,
          targetRole: 'user',
          type: 'order',
          title: `Order ${order.orderNo} Cancelled`,
          message: `Your order ${order.orderNo} has been cancelled. $${Number(order.total).toFixed(2)} has been refunded to your wallet.`,
          link: '/user/orders',
        })
      }
      order.trackingStatus = 'cancelled'
    }

    order.status = next
    await order.save()

    return res.json({
      message: next === 'cancelled' ? 'Order cancelled. Buyer refunded and stock restored.' : 'Order status updated.',
      order: order.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update order.' })
  }
}

export const updateOrderTracking = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id))
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' })
    }

    const { trackingStatus, carrier, trackingNumber, estimatedDelivery, note, location } = req.body

    if (carrier) order.carrier = String(carrier).trim()
    if (trackingNumber) order.trackingNumber = String(trackingNumber).trim()
    if (estimatedDelivery !== undefined) order.estimatedDelivery = String(estimatedDelivery).trim()

    if (req.body.warehouseLocation) {
      const loc = String(req.body.warehouseLocation).trim().toLowerCase()
      const locMap = {
        supplier_warehouse: 'At Supplier Warehouse',
        wms_hub: 'At WMS Central Hub',
        in_transit: 'In Courier Transit',
        delivered: 'Delivered to Customer',
      }
      if (locMap[loc]) {
        order.warehouseLocation = loc
        order.warehouseLocationLabel = req.body.warehouseLocationLabel || locMap[loc]
      }
    }

    if (trackingStatus) {
      const allowedTracking = ['placed', 'processing', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled']
      if (allowedTracking.includes(trackingStatus.toLowerCase())) {
        const nextTracking = trackingStatus.toLowerCase()

        if (nextTracking === 'cancelled') {
          if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled.' })
          }
          if (order.status === 'delivered') {
            return res.status(400).json({ message: 'Cannot cancel an order that is already delivered.' })
          }

          // Refund buyer & restock
          if (!order.isRefunded) {
            const buyerId = order.user?._id || order.user
            const productId = order.product?._id || order.product

            if (buyerId && order.total > 0) {
              await User.findByIdAndUpdate(buyerId, { $inc: { walletBalance: Number(order.total.toFixed(2)) } })
            }
            if (productId && order.quantity > 0) {
              await Product.findByIdAndUpdate(productId, { $inc: { quantity: order.quantity } })
            }

            order.isRefunded = true
            order.refundedAt = new Date()
            order.payoutStatus = 'cancelled'

            createNotification({
              recipient: buyerId,
              targetRole: 'user',
              type: 'order',
              title: `Order ${order.orderNo} Cancelled`,
              message: `Your order ${order.orderNo} has been cancelled. $${Number(order.total).toFixed(2)} has been refunded to your wallet.`,
              link: '/user/orders',
            })
          }
          order.status = 'cancelled'
        } else if (nextTracking === 'processing' || nextTracking === 'in_transit' || nextTracking === 'out_for_delivery') {
          if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot progress tracking for a cancelled order.' })
          }
          order.status = 'in_process'
        } else if (nextTracking === 'delivered') {
          if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot mark a cancelled order as delivered.' })
          }
          order.status = 'delivered'
        }

        order.trackingStatus = nextTracking

        // Auto sync warehouseLocation if tracking status progresses
        if (nextTracking === 'in_transit' || nextTracking === 'out_for_delivery') {
          order.warehouseLocation = 'in_transit'
          order.warehouseLocationLabel = 'In Courier Transit'
        } else if (nextTracking === 'delivered') {
          order.warehouseLocation = 'delivered'
          order.warehouseLocationLabel = 'Delivered to Customer'
        }

        const titles = {
          placed: 'Order Placed & Verified',
          processing: 'Warehouse Processing & Packaging',
          in_transit: 'Dispatched & In Transit',
          out_for_delivery: 'Out for Delivery with Courier',
          delivered: 'Package Delivered to Customer',
          cancelled: 'Order / Shipment Cancelled',
        }

        if (!Array.isArray(order.trackingTimeline)) {
          order.trackingTimeline = []
        }

        order.trackingTimeline.push({
          status: order.trackingStatus,
          title: titles[order.trackingStatus] || order.trackingStatus,
          location: String(location || 'Local Hub').trim(),
          timestamp: new Date(),
          note: String(note || `Status updated to ${order.trackingStatus}`).trim(),
        })
      }
    }

    await order.save()

    return res.json({
      message: 'Parcel tracking updated successfully.',
      order: order.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update parcel tracking.' })
  }
}

