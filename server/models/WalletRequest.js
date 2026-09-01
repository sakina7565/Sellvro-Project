import mongoose from 'mongoose'

const walletRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0.01,
    },
    bankTid: {
      type: String,
      required: [true, 'Bank TID is required'],
      trim: true,
    },
    receiptImage: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

walletRequestSchema.methods.toSafeObject = function toSafeObject(businessName = 'No Business') {
  const userDoc = this.user
  const userName =
    userDoc && typeof userDoc === 'object' && userDoc.fullName ? userDoc.fullName : '—'
  const email = userDoc && typeof userDoc === 'object' ? userDoc.email || '' : ''

  return {
    id: this._id.toString(),
    userId: userDoc?._id?.toString?.() || userDoc?.toString?.() || '',
    user: userName,
    business: businessName || 'No Business',
    email,
    amount: this.amount,
    bankTid: this.bankTid,
    receiptImage: this.receiptImage,
    status: this.status,
    statusLabel:
      this.status === 'pending'
        ? 'New Request'
        : this.status.charAt(0).toUpperCase() + this.status.slice(1),
    adminNote: this.adminNote,
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

const WalletRequest = mongoose.model('WalletRequest', walletRequestSchema)

export default WalletRequest
