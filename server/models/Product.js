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
    isWmsVerified: { type: Boolean, default: false },
    wmsVerifiedAt: { type: Date, default: null },
    wmsProductId: { type: Number, default: null },
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
     * draft            → saved by supplier, not submitted to admin
     * pending_approval → waiting for admin review
     * approved / active → approved by admin; live on marketplace
     * inactive / deactivated → temporarily deactivated by supplier/admin
     * rejected         → admin rejected
     */
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'active', 'rejected', 'inactive', 'deactivated', 'out_of_stock'],
      default: 'pending_approval',
    },
    condition: { type: String, trim: true, default: '' },
    subcategory: { type: String, trim: true, default: '' },
    handlingTime: { type: String, trim: true, default: '1 business day' },
    deliveryTime: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    material: { type: String, trim: true, default: '' },
    mpn: { type: String, trim: true, default: '' },
    itemType: { type: String, trim: true, default: '' },
    numItemsInSet: { type: String, trim: true, default: '1' },
    itemSpecifics: { type: mongoose.Schema.Types.Mixed, default: {} },
    variations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewsCount: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    deliveryRatingAverage: { type: Number, default: 0, min: 0, max: 5 },
    onTimeDeliveryPercent: { type: Number, default: 100, min: 0, max: 100 },
    customizationAvailable: { type: Boolean, default: false },
    customizationInstructions: { type: String, trim: true, default: '' },
    stockAlert: { type: Number, default: 10, min: 0 },
    stockExpiry: { type: String, trim: true, default: '' },
    videoUrl: { type: String, trim: true, default: '' },
    // Sister SKUs: separate listings belonging to the same product group (e.g. different colors/sizes)
    sisterSkus: { type: [String], default: [] },
    sisterVariationType: { type: String, trim: true, default: 'Color' },
    // Product Research & Market Evaluation Fields (Admin Product Evaluation & Ranking)
    globalSearchVolume: { type: Number, default: 0, min: 0 },
    globalMonthlySales: { type: Number, default: 0, min: 0 },
    productKeywords: { type: [String], default: [] },
    usMarketAverageSales: { type: Number, default: 0, min: 0 },
    rankingPriority: {
      type: String,
      enum: ['high', 'medium', 'low', 'standard'],
      default: 'standard',
    },
    rankingScore: { type: Number, default: 0 },
    adminEvaluationNotes: { type: String, trim: true, default: '' },
    evaluatedAt: { type: Date, default: null },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

productSchema.pre('save', async function setSerialSku(next) {
  if (!this.sku || !/^SVRO-\d+$/i.test(this.sku)) {
    try {
      const { getNextSku } = await import('../services/sequenceService.js')
      this.sku = await getNextSku()
    } catch (err) {
      console.warn('[Product] Failed to get next SKU from sequenceService:', err?.message)
    }
  }
  next()
})

productSchema.methods.toSafeObject = function toSafeObject() {
  const supplierDoc = this.supplier
  const isSupplierObj =
    supplierDoc &&
    typeof supplierDoc === 'object' &&
    !(supplierDoc instanceof mongoose.Types.ObjectId)
  const supplierName = isSupplierObj && supplierDoc.fullName ? supplierDoc.fullName : undefined
  const supplierEmail = isSupplierObj && supplierDoc.email ? supplierDoc.email : undefined
  const supplierPhone = isSupplierObj && supplierDoc.phone ? supplierDoc.phone : undefined
  const supplierBusinessName = isSupplierObj && supplierDoc.businessName ? supplierDoc.businessName : undefined
  const bestVendorName = supplierBusinessName || supplierName || '—'

  return {
    id: this._id.toString(),
    productId: this.sku,
    displayId: this.sku,
    name: this.name,
    sku: this.sku,
    category: this.category,
    subcategory: this.subcategory || '',
    handlingTime: this.handlingTime || '1 business day',
    deliveryTime:
      this.fulfillBy === 'warehouse' || this.inWarehouse
        ? '1 Day (WMS Express Delivery)'
        : this.deliveryTime || '2-3 Days',
    color: this.color || '',
    material: this.material || '',
    mpn: this.mpn || '',
    itemType: this.itemType || '',
    numItemsInSet: this.numItemsInSet || '1',
    itemSpecifics: this.itemSpecifics || {},
    variations: Array.isArray(this.variations) ? this.variations : [],
    brand: this.brand,
    description: this.description,
    price: this.price,
    quantity: this.quantity,
    fulfillBy: this.fulfillBy,
    inWarehouse: Boolean(this.inWarehouse || this.fulfillBy === 'warehouse'),
    isWmsVerified: Boolean(this.isWmsVerified || this.inWarehouse || this.fulfillBy === 'warehouse'),
    wmsVerifiedAt: this.wmsVerifiedAt || (this.inWarehouse ? this.createdAt : null),
    wmsProductId: this.wmsProductId || null,
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
    supplierClientId: isSupplierObj && (supplierDoc.clientId || supplierDoc.supplierCode) ? (supplierDoc.clientId || supplierDoc.supplierCode) : '',
    supplier: supplierName || bestVendorName,
    vendorName: bestVendorName,
    supplierEmail: supplierEmail || '',
    supplierPhone: supplierPhone || '',
    supplierBusinessName: supplierBusinessName || '',
    status: this.status,
    condition:
      this.condition ||
      (this.isWmsVerified || this.inWarehouse
        ? 'WMS Verified Authentic (Inspected)'
        : 'Brand New'),
    watchersCount: Array.isArray(this.watchers) ? this.watchers.length : 0,
    viewsCount: this.viewsCount || 0,
    watchers: Array.isArray(this.watchers) ? this.watchers.map((w) => w.toString()) : [],
    averageRating: Number(this.averageRating || 0),
    reviewsCount: Number(this.reviewsCount || 0),
    deliveryRatingAverage: Number(this.deliveryRatingAverage || 0),
    onTimeDeliveryPercent: Number(this.onTimeDeliveryPercent ?? 100),
    customizationAvailable: Boolean(this.customizationAvailable),
    customizationInstructions: this.customizationInstructions || '',
    stockAlert: Number(this.stockAlert ?? 10),
    stockExpiry: this.stockExpiry || '',
    videoUrl: this.videoUrl || '',
    sisterSkus: Array.isArray(this.sisterSkus) ? this.sisterSkus : [],
    sisterVariationType: this.sisterVariationType || 'Color',
    globalSearchVolume: Number(this.globalSearchVolume || 0),
    globalMonthlySales: Number(this.globalMonthlySales || 0),
    productKeywords: Array.isArray(this.productKeywords) ? this.productKeywords : [],
    usMarketAverageSales: Number(this.usMarketAverageSales || 0),
    rankingPriority: this.rankingPriority || 'standard',
    rankingScore: Number(this.rankingScore || 0),
    adminEvaluationNotes: this.adminEvaluationNotes || '',
    evaluatedAt: this.evaluatedAt || null,
    evaluatedBy: this.evaluatedBy ? this.evaluatedBy.toString() : null,
    createdAt: this.createdAt,
  }
}

const Product = mongoose.model('Product', productSchema)

export default Product
