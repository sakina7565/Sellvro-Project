import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
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

locationSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    createdAt: this.createdAt,
  }
}

const Location = mongoose.model('Location', locationSchema)

export default Location
