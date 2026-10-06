import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    brand: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    fulfillBy: { type: String, enum: ['self', 'warehouse', ''], default: '' },
    inWarehouse: { type: Boolean, default: false },
    location: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    barcode: { type: String, trim: true, default: '' },
    commission: { type: Number, default: 0, min: 0 },
    weight: { type: String, trim: true, default: '' },
    weightUnit: { type: String, default: 'gm' },
    length: { type: String, trim: true, default: '' },
    width: { type: String, trim: true, default: '' },
    height: { type: String, trim: true, default: '' },
    dimensionUnit: { type: String, default: 'cm' },
    image: { type: String, trim: true, default: '' },
    images: { type: [String], default: [] },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /**
     * draft            → saved, not submitted
     * pending_approval → waiting for admin review
     * approved         → admin approved; supplier can manage, not on marketplace
     * active           → visible to buyers on marketplace
     * rejected         → admin rejected
     */
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'active', 'rejected'],
      default: 'pending_approval',
    },
  },
  { timestamps: true },
)

productSchema.methods.toSafeObject = function toSafeObject() {
  const supplierDoc = this.supplier
  const isSupplierObj = supplierDoc && typeof supplierDoc === 'object'
  const supplierName = isSupplierObj && supplierDoc.fullName ? supplierDoc.fullName : undefined
  const supplierEmail = isSupplierObj && supplierDoc.email ? supplierDoc.email : undefined
  const supplierPhone = isSupplierObj && supplierDoc.phone ? supplierDoc.phone : undefined
  const supplierBusinessName = isSupplierObj && supplierDoc.businessName ? supplierDoc.businessName : undefined

  return {
    id: this._id.toString(),
    name: this.name,
    sku: this.sku,
    category: this.category,
    brand: this.brand,
    description: this.description,
    price: this.price,
    quantity: this.quantity,
    fulfillBy: this.fulfillBy,
    inWarehouse: Boolean(this.inWarehouse || this.fulfillBy === 'warehouse'),
    location: this.location || '—',
    country: this.country,
    barcode: this.barcode,
    commission: this.commission,
    weight: this.weight,
    weightUnit: this.weightUnit,
    length: this.length,
    width: this.width,
    height: this.height,
    dimensionUnit: this.dimensionUnit,
    image: this.image,
    images: this.images || [],
    supplierId: supplierDoc?._id?.toString?.() || supplierDoc?.toString?.() || '',
    supplier: supplierName || '—',
    supplierEmail: supplierEmail || '',
    supplierPhone: supplierPhone || '',
    supplierBusinessName: supplierBusinessName || '',
    status: this.status,
    createdAt: this.createdAt,
  }
}

const Product = mongoose.model('Product', productSchema)

export default Product
