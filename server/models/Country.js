import mongoose from 'mongoose'

const countrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Country name is required'],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
)

countrySchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    createdAt: this.createdAt,
  }
}

const Country = mongoose.model('Country', countrySchema)

export default Country
