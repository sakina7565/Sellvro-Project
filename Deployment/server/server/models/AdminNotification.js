import mongoose from 'mongoose'

const adminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['password_change', 'role_change', 'system'],
      default: 'password_change',
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true },
)

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema)

export default AdminNotification
