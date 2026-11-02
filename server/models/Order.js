import mongoose from 'mongoose'

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    addressLine: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

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
    orderLabelRef: { type: String, trim: true, default: '' },
    shippingLabelUrl: { type: String, trim: true, default: '' },
    labelNotes: { type: String, trim: true, default: '' },
    warehouseLocation: {
      type: String,
      enum: ['supplier_warehouse', 'wms_hub', 'in_transit', 'delivered'],
      default: 'supplier_warehouse',
    },
    warehouseLocationLabel: {
      type: String,
      trim: true,
      default: 'At Supplier Warehouse',
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'cod'],
      default: 'wallet',
    },
    payoutStatus: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
    },
    payoutTid: {
      type: String,
      trim: true,
      default: '',
    },
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payout',
      default: null,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({}),
    },
    // Live Parcel Tracking Fields
    trackingNumber: {
      type: String,
      trim: true,
      default: '',
    },
    carrier: {
      type: String,
      trim: true,
      default: 'Sellvro Express',
    },
    trackingStatus: {
      type: String,
      enum: ['placed', 'processing', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },
    estimatedDelivery: {
      type: String,
      trim: true,
      default: '',
    },
    trackingTimeline: [
      {
        status: { type: String, trim: true },
        title: { type: String, trim: true },
        location: { type: String, trim: true, default: '' },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: '' },
      },
    ],
    // WMS Warehouse Fulfillment Integration Fields
    isWmsOrder: {
      type: Boolean,
      default: false,
    },
    wmsBatchNumber: {
      type: String,
      trim: true,
      default: '',
    },
    wmsRequestNumber: {
      type: String,
      trim: true,
      default: '',
    },
    wmsStatus: {
      type: String,
      default: 'not_applicable',
    },
    wmsFulfillmentId: {
      type: String,
      trim: true,
      default: '',
    },
    wmsTrackingStatus: {
      type: String,
      trim: true,
      default: '',
    },
    wmsTrackingStatusDetail: {
      type: String,
      trim: true,
      default: '',
    },
    wmsDispatchProofUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isDispatched: {
      type: Boolean,
      default: false,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    wmsPushedAt: {
      type: Date,
      default: null,
    },
    wmsResponse: {
      type: Object,
      default: {},
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
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

  const shipping = this.shippingAddress || {}

  const rawUserId = userDoc?._id?.toString?.() || userDoc?.toString?.() || ''
  const userDisplayId = userDoc?.clientId || (rawUserId ? `USR-${rawUserId.slice(-6).toUpperCase()}` : '')
  const rawSupplierId = supplierDoc?._id?.toString?.() || supplierDoc?.toString?.() || ''
  const supplierDisplayId = supplierDoc?.clientId || (rawSupplierId ? `SUP-${rawSupplierId.slice(-6).toUpperCase()}` : '')

  return {
    id: this._id.toString(),
    orderNo: this.orderNo,
    userId: rawUserId,
    userDisplayId,
    user: userName || '—',
    userEmail: userDoc?.email || '',
    supplierId: rawSupplierId,
    supplierDisplayId,
    supplier: supplierName || '—',
    supplierEmail: supplierDoc?.email || '',
    productId: productDoc?._id?.toString?.() || productDoc?.toString?.() || '',
    product: productName,
    productSku:
      productDoc && typeof productDoc === 'object' && productDoc.sku ? productDoc.sku : '',
    productImage:
      productDoc && typeof productDoc === 'object' && productDoc.image ? productDoc.image : '',
    items: this.quantity,
    quantity: this.quantity,
    unitPrice: this.unitPrice,
    total: this.total,
    commission: this.commission,
    commissionPercent: this.commissionPercent,
    status: this.status,
    statusLabel: formatStatus(this.status),
    brandLabel: this.brandLabel,
    orderLabelRef: this.orderLabelRef || this.orderNo || '',
    shippingLabelUrl: this.shippingLabelUrl || '',
    labelNotes: this.labelNotes || '',
    warehouseLocation: this.warehouseLocation || 'supplier_warehouse',
    warehouseLocationLabel:
      this.warehouseLocationLabel ||
      (this.warehouseLocation === 'wms_hub'
        ? 'At WMS Central Hub'
        : this.warehouseLocation === 'in_transit'
          ? 'In Courier Transit'
          : this.warehouseLocation === 'delivered'
            ? 'Delivered to Customer'
            : 'At Supplier Warehouse'),
    paymentMethod: this.paymentMethod || 'wallet',
    payoutStatus: this.payoutStatus,
    payoutTid: this.payoutTid || '',
    payoutId: this.payoutId?.toString?.() || '',
    shippingAddress: {
      fullName: shipping.fullName || '',
      phone: shipping.phone || '',
      addressLine: shipping.addressLine || '',
      city: shipping.city || '',
      state: shipping.state || '',
      postalCode: shipping.postalCode || '',
      country: shipping.country || '',
    },
    // Tracking details
    trackingNumber: this.trackingNumber || `SLV-${this.orderNo?.replace('ORD-', '') || this._id.toString().slice(-8).toUpperCase()}`,
    carrier: this.carrier || 'Sellvro Express',
    trackingStatus: this.trackingStatus || (this.status === 'in_process' ? 'processing' : this.status === 'cancelled' ? 'cancelled' : 'placed'),
    estimatedDelivery: this.estimatedDelivery || '',
    trackingTimeline: Array.isArray(this.trackingTimeline) && this.trackingTimeline.length > 0
      ? this.trackingTimeline
      : [
          {
            status: 'placed',
            title: 'Order Placed',
            location: 'System Online',
            timestamp: this.createdAt || new Date(),
            note: 'Order successfully created & verified.',
          },
        ],
    // WMS fulfillment details
    isWmsOrder: Boolean(this.isWmsOrder || this.warehouseLocation === 'wms_hub'),
    wmsBatchNumber: this.wmsBatchNumber || '',
    wmsRequestNumber: this.wmsRequestNumber || '',
    wmsStatus: this.wmsStatus || (this.warehouseLocation === 'wms_hub' ? 'pushed' : 'not_applicable'),
    wmsFulfillmentId: this.wmsFulfillmentId || this.wmsRequestNumber || '',
    wmsTrackingStatus: this.wmsTrackingStatus || '',
    wmsTrackingStatusDetail: this.wmsTrackingStatusDetail || '',
    wmsDispatchProofUrl: this.wmsDispatchProofUrl || '',
    isDispatched: Boolean(this.isDispatched),
    dispatchedAt: this.dispatchedAt || null,
    wmsPushedAt: this.wmsPushedAt || null,
    isReviewed: Boolean(this.isReviewed),
    reviewId: this.review?.toString?.() || '',
    date: this.createdAt
      ? new Date(this.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
      : '—',
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
