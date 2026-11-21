import mongoose from 'mongoose'

const businessCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

businessCategorySchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

const BusinessCategory = mongoose.model('BusinessCategory', businessCategorySchema)

export default BusinessCategory

