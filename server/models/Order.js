import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    /** Platform commission in currency units (not percent). */
    commission: { type: Number, default: 0, min: 0 },
    commissionPercent: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['placed', 'pending', 'cancelled', 'in_process'],
      default: 'placed',
    },
    brandLabel: { type: String, trim: true, default: '' },
    payoutStatus: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
    },
  },
  { timestamps: true },
)

orderSchema.methods.toSafeObject = function toSafeObject() {
  const userDoc = this.user
  const supplierDoc = this.supplier
  const productDoc = this.product

  const userName =
    userDoc && typeof userDoc === 'object' && userDoc.fullName ? userDoc.fullName : undefined
  const supplierName =
    supplierDoc && typeof supplierDoc === 'object' && supplierDoc.fullName
      ? supplierDoc.fullName
      : undefined
  const productName =
    this.productName ||
    (productDoc && typeof productDoc === 'object' && productDoc.name ? productDoc.name : '—')

  return {
    id: this._id.toString(),
    orderNo: this.orderNo,
    userId: userDoc?._id?.toString?.() || userDoc?.toString?.() || '',
    user: userName || '—',
    userEmail: userDoc?.email || '',
    supplierId: supplierDoc?._id?.toString?.() || supplierDoc?.toString?.() || '',
    supplier: supplierName || '—',
    supplierEmail: supplierDoc?.email || '',
    productId: productDoc?._id?.toString?.() || productDoc?.toString?.() || '',
    product: productName,
    items: this.quantity,
    quantity: this.quantity,
    unitPrice: this.unitPrice,
    total: this.total,
    commission: this.commission,
    commissionPercent: this.commissionPercent,
    status: this.status,
    statusLabel: formatStatus(this.status),
    brandLabel: this.brandLabel,
    payoutStatus: this.payoutStatus,
    date: this.createdAt ? new Date(this.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) : '—',
    createdAt: this.createdAt,
  }
}

function formatStatus(status) {
  if (!status) return '—'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const Order = mongoose.model('Order', orderSchema)

export default Order
