import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'supplier', 'user'],
      required: true,
    },
    /**
     * admin            → approved immediately
     * supplier / user  → pending_details after register
     *                  → pending_approval after business submit
     *                  → approved after admin verification
     */
    status: {
      type: String,
      enum: ['pending_details', 'pending_approval', 'approved', 'suspended', 'rejected'],
      default: 'pending_details',
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Custom admin role (sub-admin). Null = super admin with all permissions. */
    adminRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    resetPasswordCode: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
    displayId: {
      type: String,
      trim: true,
      default: '',
    },
    clientId: {
      type: String,
      trim: true,
      default: '',
    },
    // WMS Supplier Integration Fields
    isWmsRegistered: {
      type: Boolean,
      default: false,
    },
    wmsToken: {
      type: String,
      default: '',
    },
    wmsClientId: {
      type: String,
      default: '',
    },
    wmsSupplierId: {
      type: Number,
      default: null,
    },
    wmsStatus: {
      type: String,
      default: '',
    },
    // Supplier Business & Owner Registration Details
    companyName: { type: String, trim: true, default: '' },
    companyEmail: { type: String, trim: true, lowercase: true, default: '' },
    companyPhone: { type: String, trim: true, default: '' },
    companyAddress: { type: String, trim: true, default: '' },
    businessCategory: { type: String, trim: true, default: '' },
    registrationEntity: { type: String, trim: true, default: '' },
    registrationNo: { type: String, trim: true, default: '' },
    ownerName: { type: String, trim: true, default: '' },
    ownerEmail: { type: String, trim: true, lowercase: true, default: '' },
    ownerPhone: { type: String, trim: true, default: '' },
    ownerAddress: { type: String, trim: true, default: '' },
    idCardUrl: { type: String, trim: true, default: '' },
    idCardNumber: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    accountHolderName: { type: String, trim: true, default: '' },
    accountNumberOrIban: { type: String, trim: true, default: '' },
    // Supplier Performance Warnings & Suspension Tracking
    warningsCount: {
      type: Number,
      default: 0,
    },
    warnings: [
      {
        warningNumber: { type: Number, default: 1 },
        reason: { type: String, default: '' },
        details: { type: String, default: '' },
        averageRating: { type: Number, default: 0 },
        onTimeDeliveryPercent: { type: Number, default: 100 },
        warnedAt: { type: Date, default: Date.now },
        warnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    penalties: [
      {
        penaltyNumber: { type: Number, default: 1 },
        amount: { type: Number, default: 0 },
        reason: { type: String, default: '' },
        details: { type: String, default: '' },
        penalizedAt: { type: Date, default: Date.now },
        penalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    suspensionReason: {
      type: String,
      default: '',
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

userSchema.pre('save', async function setDisplayIdAndHash(next) {
  if (!this.displayId) {
    try {
      const { getNextSupplierId, getNextUserId } = await import('../services/sequenceService.js')
      if (this.role === 'supplier') {
        this.displayId = await getNextSupplierId()
      } else if (this.role === 'user' || this.role === 'buyer') {
        this.displayId = await getNextUserId()
      }
    } catch (err) {
      const num = 1001 + (parseInt(this._id ? this._id.toString().slice(-4) : '1001', 16) % 8999)
      this.displayId = this.role === 'supplier' ? `SPAK-${num}` : `US-${num}`
    }
  }
  if (this.displayId && !this.clientId) {
    this.clientId = this.displayId
  }

  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  return next()
})

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

userSchema.methods.toSafeObject = function toSafeObject(options = {}) {
  const hex = this._id ? this._id.toString() : ''
  const fallbackNum = 1001 + (parseInt(hex.slice(-4) || '1001', 16) % 8999)
  const displayId =
    this.displayId ||
    (this.role === 'supplier'
      ? `SPAK-${fallbackNum}`
      : `US-${fallbackNum}`)

  const base = {
    id: this._id.toString(),
    displayId,
    clientId: this.clientId || displayId,
    supplierDisplayId: displayId,
    userDisplayId: displayId,
    fullName: this.fullName,
    email: this.email,
    avatar: this.avatar || '',
    role: this.role,
    status: this.status,
    walletBalance: this.walletBalance ?? 0,
    adminRoleId: this.adminRoleId?.toString?.() || this.adminRoleId || null,
    isWmsRegistered: Boolean(this.isWmsRegistered),
    wmsClientId: this.wmsClientId || '',
    wmsStatus: this.wmsStatus || '',
    companyName: this.companyName || '',
    companyEmail: this.companyEmail || '',
    companyPhone: this.companyPhone || '',
    companyAddress: this.companyAddress || '',
    businessCategory: this.businessCategory || '',
    registrationEntity: this.registrationEntity || '',
    registrationNo: this.registrationNo || '',
    ownerName: this.ownerName || '',
    ownerEmail: this.ownerEmail || '',
    ownerPhone: this.ownerPhone || '',
    ownerAddress: this.ownerAddress || '',
    idCardUrl: this.idCardUrl || '',
    idCardNumber: this.idCardNumber || '',
    bankName: this.bankName || '',
    accountHolderName: this.accountHolderName || '',
    accountNumberOrIban: this.accountNumberOrIban || '',
    warningsCount: this.warningsCount ?? (this.warnings?.length || 0),
    warnings: this.warnings || [],
    penalties: this.penalties || [],
    suspensionReason: this.suspensionReason || '',
    suspendedAt: this.suspendedAt || null,
    createdAt: this.createdAt,
  }

  if (options.permissions !== undefined) {
    base.permissions = options.permissions
  }

  if (options.adminRoleName) {
    base.adminRoleName = options.adminRoleName
  }

  return base
}

const User = mongoose.model('User', userSchema)

export default User
