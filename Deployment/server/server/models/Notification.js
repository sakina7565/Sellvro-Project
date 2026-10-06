import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // if null, can be targetRole broadcast
    },
    targetRole: {
      type: String,
      enum: ['admin', 'supplier', 'user', 'all'],
      default: 'user',
    },
    type: {
      type: String,
      enum: ['order', 'dispute', 'payout', 'security', 'system', 'account'],
      default: 'system',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
)

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
