import mongoose from 'mongoose'

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

roleSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description || '',
    permissions: this.permissions || [],
    createdBy: this.createdBy?.toString?.() || this.createdBy || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

const Role = mongoose.model('Role', roleSchema)

export default Role
