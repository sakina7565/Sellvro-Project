import mongoose from 'mongoose'

const businessProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profileType: {
      type: String,
      enum: ['supplier', 'user'],
      required: true,
    },
    businessName: { type: String, trim: true },
    businessDescription: { type: String, trim: true },
    businessCategory: { type: String, trim: true },
    businessEmail: { type: String, trim: true },
    businessPhone: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    // registrationEntity: { type: String, trim: true },
    // registrationNo: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    ownerEmail: { type: String, trim: true },
    ownerPhone: { type: String, trim: true },
    ownerAddress: { type: String, trim: true },
    idCardUrl: { type: String, trim: true },
    idCardNumber: { type: String, trim: true },
    bankName: { type: String, trim: true, default: '' },
    accountHolderName: { type: String, trim: true, default: '' },
    accountNumberOrIban: { type: String, trim: true, default: '' },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    orderType: { type: String, trim: true },
    paymentProvider: { type: String, trim: true },
    accNumber: { type: String, trim: true },
    cardDate: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
)

const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema)

export default BusinessProfile
