import mongoose from 'mongoose'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { createNotification } from '../utils/notifications.js'

/**
 * Submit rating & review for a delivered order
 * POST /api/orders/:id/review
 */
export const submitOrderReview = async (req, res) => {
  try {
    const { id } = req.params
    const { productRating, deliveryRating, deliveredOnTime, comment } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Order not found.' })
    }

    const order = await Order.findById(id).populate('product').populate('supplier')
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' })
    }

    // Authorization: User must be the buyer or an admin
    const isOwner = order.user.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only review your own orders.' })
    }

    // Must be delivered to review
    const isDelivered =
      order.trackingStatus === 'delivered' ||
      order.status === 'delivered' ||
      order.warehouseLocation === 'delivered'

    if (!isDelivered) {
      return res.status(400).json({
        message: 'You can only rate and review an order after it has been delivered.',
      })
    }

    if (order.isReviewed) {
      return res.status(400).json({ message: 'This order has already been reviewed.' })
    }

    const pRating = Math.min(5, Math.max(1, Number(productRating) || 5))
    const dRating = Math.min(5, Math.max(1, Number(deliveryRating) || 5))
    const onTime = deliveredOnTime !== undefined ? Boolean(deliveredOnTime) : true
    const reviewerName = req.user.fullName || 'Verified Buyer'

    // Create Review
    const review = await Review.create({
      order: order._id,
      product: order.product?._id || order.product,
      supplier: order.supplier?._id || order.supplier,
      user: req.user._id,
      reviewerName,
      productRating: pRating,
      deliveryRating: dRating,
      deliveredOnTime: onTime,
      comment: (comment || '').trim(),
    })

    // Mark order as reviewed
    order.isReviewed = true
    order.review = review._id
    await order.save()

    // Recalculate Product statistics
    const productId = order.product?._id || order.product
    if (productId) {
      const allReviews = await Review.find({ product: productId })
      const count = allReviews.length
      const sumProduct = allReviews.reduce((acc, r) => acc + (r.productRating || 0), 0)
      const sumDelivery = allReviews.reduce((acc, r) => acc + (r.deliveryRating || 0), 0)
      const onTimeCount = allReviews.filter((r) => r.deliveredOnTime).length

      const avgRating = count > 0 ? Number((sumProduct / count).toFixed(1)) : 0
      const avgDelivery = count > 0 ? Number((sumDelivery / count).toFixed(1)) : 0
      const onTimePct = count > 0 ? Math.round((onTimeCount / count) * 100) : 100

      await Product.findByIdAndUpdate(productId, {
        averageRating: avgRating,
        reviewsCount: count,
        deliveryRatingAverage: avgDelivery,
        onTimeDeliveryPercent: onTimePct,
      })
    }

    // Notify Supplier
    try {
      const supplierId = order.supplier?._id || order.supplier
      if (supplierId) {
        await createNotification({
          userId: supplierId,
          title: 'New Customer Review',
          message: `Buyer left a ${pRating}★ rating & feedback for order #${order.orderNo}.`,
          type: 'order',
        })
      }
    } catch {}

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      review: review.toSafeObject(),
    })
  } catch (error) {
    console.error('Submit review error:', error)
    return res.status(500).json({ message: error.message || 'Failed to submit review.' })
  }
}

/**
 * Get all reviews & statistics for a specific product
 * GET /api/products/:id/reviews
 */
export const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const reviews = await Review.find({ product: id }).sort({ createdAt: -1 })
    const count = reviews.length

    let sumProduct = 0
    let sumDelivery = 0
    let onTimeCount = 0
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

    reviews.forEach((r) => {
      const p = Math.min(5, Math.max(1, Math.round(r.productRating || 5)))
      distribution[p] = (distribution[p] || 0) + 1
      sumProduct += r.productRating || 0
      sumDelivery += r.deliveryRating || 0
      if (r.deliveredOnTime) onTimeCount += 1
    })

    const avgProduct = count > 0 ? Number((sumProduct / count).toFixed(1)) : 0
    const avgDelivery = count > 0 ? Number((sumDelivery / count).toFixed(1)) : 0
    const onTimePct = count > 0 ? Math.round((onTimeCount / count) * 100) : 100

    return res.json({
      success: true,
      count,
      stats: {
        averageRating: avgProduct,
        reviewsCount: count,
        deliveryRatingAverage: avgDelivery,
        onTimeDeliveryPercent: onTimePct,
        distribution,
      },
      data: reviews.map((r) => r.toSafeObject()),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch reviews.' })
  }
}

/**
 * Get delivered orders for logged-in user that haven't been reviewed yet
 * GET /api/orders/pending-review
 */
export const getPendingReviewOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      $or: [
        { trackingStatus: 'delivered' },
        { status: 'delivered' },
        { warehouseLocation: 'delivered' },
      ],
      $and: [
        { $or: [{ isReviewed: false }, { isReviewed: { $exists: false } }] },
      ],
    })
      .populate('product', 'name sku image averageRating')
      .populate('supplier', 'fullName email')
      .sort({ updatedAt: -1 })

    return res.json({
      data: orders.map((o) => o.toSafeObject()),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to check pending reviews.' })
  }
}
