import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewerName: {
      type: String,
      trim: true,
      default: 'Verified Buyer',
    },
    // Product Quality Rating (1-5 stars)
    productRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Supplier Delivery Speed & Punctuality Rating (1-5 stars)
    deliveryRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    deliveredOnTime: {
      type: Boolean,
      default: true,
    },
    // Customer Feedback & Experience Review Text
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

reviewSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    orderId: this.order?.toString?.() || '',
    productId: this.product?.toString?.() || '',
    supplierId: this.supplier?.toString?.() || '',
    userId: this.user?._id?.toString?.() || this.user?.toString?.() || '',
    reviewerName: this.reviewerName || 'Verified Buyer',
    productRating: Number(this.productRating || 5),
    deliveryRating: Number(this.deliveryRating || 5),
    deliveredOnTime: Boolean(this.deliveredOnTime),
    comment: this.comment || '',
    createdAt: this.createdAt,
  }
}

const Review = mongoose.model('Review', reviewSchema)

export default Review
