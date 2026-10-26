import mongoose from 'mongoose'

const walletRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The net amount in USD that is credited to user wallet
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0.01,
    },
    // The currency selected by user for deposit (e.g., 'USD', 'PKR', 'AED', 'EUR')
    depositCurrency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    // The original amount in the selected deposit currency
    depositAmount: {
      type: Number,
      default: null,
      min: 0.01,
    },
    // Exchange rate to USD (how many units of depositCurrency equal 1 USD)
    exchangeRate: {
      type: Number,
      default: 1,
    },
    // Gross amount in USD before conversion fee deduction
    grossAmount: {
      type: Number,
      default: null,
    },
    // Conversion fee percentage applied (e.g., 2.5 for 2.5%)
    conversionFeeRate: {
      type: Number,
      default: 0,
    },
    // Conversion fee amount in USD deducted from gross amount
    conversionFee: {
      type: Number,
      default: 0,
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
    // Shipping Courier Option selected by client (USPS, UPS, FedEx)
    courier: {
      type: String,
      enum: ['USPS', 'UPS', 'FedEx', 'None'],
      default: 'None',
    },
    courierService: {
      type: String,
      trim: true,
      default: '',
    },
    // Payment Method & Client Account Details for International Real Transfer
    paymentMethod: {
      type: String,
      trim: true,
      default: 'bank_wire', // 'wise', 'payoneer', 'stripe', 'bank_wire', 'usdt', 'pkr_ibft'
    },
    clientAccountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    clientIban: {
      type: String,
      trim: true,
      default: '',
    },
    clientBankName: {
      type: String,
      trim: true,
      default: '',
    },
    // Real Payment Transfer Execution Status & Tracking Reference
    realTransferStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    realTransferRef: {
      type: String,
      trim: true,
      default: '',
    },
    realTransferProvider: {
      type: String,
      trim: true,
      default: '',
    },
    realTransferDate: {
      type: Date,
      default: null,
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

walletRequestSchema.methods.toSafeObject = function toSafeObject(businessName = 'No Business', profile = null) {
  const userDoc = this.user
  const userName =
    userDoc && typeof userDoc === 'object' && userDoc.fullName ? userDoc.fullName : '—'
  const email = userDoc && typeof userDoc === 'object' ? userDoc.email || '' : ''
  const role = userDoc && typeof userDoc === 'object' ? userDoc.role || 'user' : 'user'
  const walletBalance = userDoc && typeof userDoc === 'object' ? userDoc.walletBalance ?? 0 : 0
  const userStatus = userDoc && typeof userDoc === 'object' ? userDoc.status || 'approved' : 'approved'

  return {
    id: this._id.toString(),
    userId: userDoc?._id?.toString?.() || userDoc?.toString?.() || '',
    user: userName,
    business: businessName || 'No Business',
    email,
    role,
    walletBalance,
    userStatus,
    phone: profile?.businessPhone || '—',
    businessAddress: profile?.businessAddress || '',
    city: profile?.city || '',
    country: profile?.country || 'Pakistan',
    amount: this.amount, // Net USD amount credited to wallet
    depositCurrency: this.depositCurrency || 'USD',
    depositAmount: this.depositAmount != null ? this.depositAmount : this.amount,
    exchangeRate: this.exchangeRate || 1,
    grossAmount: this.grossAmount != null ? this.grossAmount : this.amount,
    conversionFeeRate: this.conversionFeeRate || 0,
    conversionFee: this.conversionFee || 0,
    bankTid: this.bankTid,
    receiptImage: this.receiptImage,
    courier: this.courier || 'None',
    courierService: this.courierService || '',
    paymentMethod: this.paymentMethod || 'bank_wire',
    clientAccountNumber: this.clientAccountNumber || '',
    clientIban: this.clientIban || '',
    clientBankName: this.clientBankName || '',
    realTransferStatus: this.realTransferStatus || 'pending',
    realTransferRef: this.realTransferRef || '',
    realTransferProvider: this.realTransferProvider || '',
    realTransferDate: this.realTransferDate,
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
    updatedAt: this.updatedAt,
  }
}

const WalletRequest = mongoose.model('WalletRequest', walletRequestSchema)

export default WalletRequest
