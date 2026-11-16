import mongoose from 'mongoose'

const payoutSchema = new mongoose.Schema(
  {
    payoutNo: {
      type: String,
      trim: true,
      default: '',
    },
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
    tid: {
      type: String,
      trim: true,
      default: '',
    },
    month: {
      type: String,
      trim: true,
      default: '',
    },
    week: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'Bank Transfer (IBFT)',
    },
    receiptUrl: {
      type: String,
      trim: true,
      default: '',
    },
    matureAmount: {
      type: Number,
      default: 0,
    },
    immatureAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

payoutSchema.pre('save', async function setPayoutNo(next) {
  if (!this.payoutNo) {
    try {
      const { getNextPayoutNo } = await import('../services/sequenceService.js')
      this.payoutNo = await getNextPayoutNo()
    } catch (err) {
      const yy = new Date().getFullYear().toString().slice(-2)
      const num = 10001 + (parseInt(this._id ? this._id.toString().slice(-4) : '10001', 16) % 89999)
      this.payoutNo = `${yy}-P-${String(num).slice(-5)}`
    }
  }
  next()
})

payoutSchema.methods.toSafeObject = function toSafeObject() {
  const supplierDoc = this.supplier
  const supplierName =
    supplierDoc && typeof supplierDoc === 'object' && supplierDoc.fullName
      ? supplierDoc.fullName
      : '—'
  const supplierEmail =
    supplierDoc && typeof supplierDoc === 'object' && supplierDoc.email
      ? supplierDoc.email
      : ''
  const rawSupplierId = supplierDoc?._id?.toString?.() || supplierDoc?.toString?.() || ''
  const supplierDisplayId =
    supplierDoc?.displayId ||
    (supplierDoc?.clientId && /^SPAK-\d+$/i.test(supplierDoc.clientId) ? supplierDoc.clientId : '') ||
    (rawSupplierId ? `SPAK-${1001 + (parseInt(rawSupplierId.slice(-4), 16) % 8999)}` : 'SPAK-1001')

  const yy = this.createdAt
    ? new Date(this.createdAt).getFullYear().toString().slice(-2)
    : new Date().getFullYear().toString().slice(-2)
  const hex = this._id ? this._id.toString() : ''
  const fallbackNum = String(10001 + (parseInt(hex.slice(-4) || '10001', 16) % 89999)).slice(-5)
  const payoutNo = this.payoutNo || `${yy}-P-${fallbackNum}`

  return {
    id: this._id.toString(),
    payoutNo,
    payoutDisplayId: payoutNo,
    supplierId: rawSupplierId,
    supplierDisplayId,
    supplier: supplierName,
    email: supplierEmail,
    payout: Number(this.amount).toFixed(2),
    amount: this.amount,
    held: Number(this.held).toFixed(2),
    commission: this.commission,
    cardDate: `${Number(this.commission).toFixed(1)}%`,
    status: this.status === 'processed' ? 'Processed' : 'Pending',
    statusRaw: this.status,
    tid: this.tid || '',
    month: this.month || '',
    week: this.week || '',
    paymentMethod: this.paymentMethod || 'Bank Transfer (IBFT)',
    receiptUrl: this.receiptUrl || '',
    matureAmount: this.matureAmount || 0,
    immatureAmount: this.immatureAmount || 0,
    notes: this.notes || '',
    date: this.processedAt || this.createdAt,
    createdAt: this.createdAt,
  }
}

const Payout = mongoose.model('Payout', payoutSchema)

export default Payout
