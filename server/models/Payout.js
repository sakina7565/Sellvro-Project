import mongoose from 'mongoose'

const payoutSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    held: {
      type: Number,
      default: 0,
      min: 0,
    },
    commission: {
      type: Number,
      default: 0,
      min: 0,
    },
    bankDetails: {
      type: String,
      trim: true,
      default: 'Not Set',
    },
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

payoutSchema.methods.toSafeObject = function toSafeObject() {
  const supplierDoc = this.supplier
  const supplierName =
    supplierDoc && typeof supplierDoc === 'object' && supplierDoc.fullName
      ? supplierDoc.fullName
      : '—'

  return {
    id: this._id.toString(),
    supplierId: supplierDoc?._id?.toString?.() || supplierDoc?.toString?.() || '',
    supplier: supplierName,
    email: supplierDoc?.email || '',
    payout: Number(this.amount).toFixed(2),
    amount: this.amount,
    held: Number(this.held).toFixed(2),
    bankDetails: this.bankDetails || 'Not Set',
    commission: this.commission,
    cardDate: `${Number(this.commission).toFixed(1)}%`,
    status: this.status === 'processed' ? 'Processed' : 'Pending',
    statusRaw: this.status,
    date: this.processedAt || this.createdAt,
    createdAt: this.createdAt,
  }
}

const Payout = mongoose.model('Payout', payoutSchema)

export default Payout
