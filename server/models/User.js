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
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  return next()
})

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
  }
}

const User = mongoose.model('User', userSchema)

export default User
