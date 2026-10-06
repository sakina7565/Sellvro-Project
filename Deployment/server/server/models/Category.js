import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

categorySchema.methods.toSafeObject = function toSafeObject(productCount = 0) {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    products: productCount,
    createdAt: this.createdAt,
  }
}

const Category = mongoose.model('Category', categorySchema)

export default Category
