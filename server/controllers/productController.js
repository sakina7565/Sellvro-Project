import mongoose from 'mongoose'
import Product from '../models/Product.js'
import BusinessProfile from '../models/BusinessProfile.js'
import { resolveCategoryName } from './categoryController.js'
import { createNotification } from '../utils/notifications.js'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'

function generateSku() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SVRO-${suffix}`
}

async function uniqueSku(preferred, excludeId = null) {
  const candidate = preferred?.trim().toUpperCase()
  if (candidate) {
    const exists = await Product.findOne({
      sku: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    if (exists) {
      const error = new Error('This SKU is already in use. Generate a new one.')
      error.status = 400
      throw error
    }
    return candidate
  }

  for (let i = 0; i < 8; i += 1) {
    const sku = generateSku()
    const exists = await Product.findOne({ sku })
    if (!exists) return sku
  }

  throw new Error('Could not generate a unique SKU. Please try again.')
}

function readProductFields(body) {
  const fulfillBy =
    body.fulfillBy === 'warehouse' ? 'warehouse' : body.fulfillBy === 'self' ? 'self' : ''
  const inWarehouse =
    fulfillBy === 'warehouse' ||
    (fulfillBy === '' &&
      (body.inWarehouse === true || body.inWarehouse === 'true' || body.inWarehouse === '1'))

  return {
    name: String(body.name || '').trim(),
    sku: body.sku,
    category: String(body.category || '').trim(),
    brand: String(body.brand || '').trim(),
    description: String(body.description || '').trim(),
    price: Number(body.price),
    quantity: Number(body.quantity || 0),
    fulfillBy,
    inWarehouse,
    location: String(body.location || '').trim(),
    country: String(body.country || '').trim(),
    barcode: String(body.barcode || '').trim(),
    commission: Number(body.commission || 0),
    weight: String(body.weight || '').trim(),
    weightUnit: body.weightUnit || 'gm',
    length: String(body.length || '').trim(),
    width: String(body.width || '').trim(),
    height: String(body.height || '').trim(),
    dimensionUnit: body.dimensionUnit || 'cm',
    image: String(body.image || '').trim(),
  }
}

export const createProduct = async (req, res) => {
  try {
    const fields = readProductFields(req.body)
    const asDraft = req.body.status === 'draft'

    if (!fields.name || !fields.category) {
      return res.status(400).json({ message: 'Product name and category are required.' })
    }

    if (!asDraft && (!fields.fulfillBy || !['warehouse', 'self'].includes(fields.fulfillBy))) {
      return res.status(400).json({
        message: 'Please specify where the product is kept: Sellvro Inventory (WMS) or with Supplier (Self).',
      })
    }

    const categoryName = await resolveCategoryName(fields.category)
    if (!categoryName) {
      return res.status(400).json({
        message: 'Invalid category. Choose a category from the admin category list.',
      })
    }
    fields.category = categoryName

    if (Number.isNaN(fields.price) || fields.price <= 0) {
      return res.status(400).json({ message: 'A valid positive price greater than 0 is required.' })
    }
    if (fields.quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative.' })
    }
    if (fields.commission < 0) {
      return res.status(400).json({ message: 'Commission cannot be negative.' })
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []
    const images = uploaded.length > 0 ? uploaded : fields.image ? [fields.image] : []

    // Supplier restriction: Must upload at least 2 images
    if (images.length < 2) {
      return res.status(400).json({
        message:
          images.length === 0
            ? 'Please upload at least 2 images for the product. Multiple images are required.'
            : 'Please upload at least 2 images. Products cannot be submitted with only 1 image.',
      })
    }

    const isVideoPath = (p) => /\.(mp4|webm|mov|ogg|mkv)$/i.test(p)
    const firstPhoto = images.find((item) => !isVideoPath(item))
    const image = firstPhoto || images[0] || PLACEHOLDER_IMAGE

    const sku = await uniqueSku(fields.sku)
    const status = asDraft ? 'draft' : 'pending_approval'

    const product = await Product.create({
      ...fields,
      sku,
      image,
      images,
      supplier: req.user._id,
      status,
    })

    if (!asDraft) {
      createNotification({
        targetRole: 'admin',
        type: 'product',
        title: 'New Product Submitted',
        message: `${req.user.fullName || 'A supplier'} submitted product "${product.name}" for review.`,
        link: '/admin/products',
      })
    }

    return res.status(201).json({
      message: asDraft
        ? 'Draft saved. Submit later for admin approval.'
        : 'Product submitted. Waiting for admin approval.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message })
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This SKU is already in use. Generate a new one.' })
    }
    console.error('Create product error:', error)
    return res.status(500).json({ message: error.message || 'Failed to create product.' })
  }
}

export const updateMyProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }
    if (!product.supplier.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only update your own products.' })
    }

    const fields = readProductFields({ ...product.toObject(), ...req.body })

    if (req.body.category !== undefined) {
      const categoryName = await resolveCategoryName(fields.category)
      if (!categoryName) {
        return res.status(400).json({ message: 'Invalid category.' })
      }
      fields.category = categoryName
    }

    if (req.body.sku !== undefined) {
      fields.sku = await uniqueSku(req.body.sku, product._id)
    } else {
      fields.sku = product.sku
    }

    if (fields.price !== undefined && (Number.isNaN(fields.price) || fields.price <= 0)) {
      return res.status(400).json({ message: 'A valid positive price greater than 0 is required.' })
    }
    if (fields.quantity !== undefined && fields.quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative.' })
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []
    if (uploaded.length > 0) {
      fields.images = [...(product.images || []), ...uploaded]
      fields.image = uploaded[0]
    }

    const currentImages = fields.images || product.images || []
    if (currentImages.length < 2) {
      return res.status(400).json({
        message: 'Product must have at least 2 images. Multiple images are required.',
      })
    }

    const resubmit = req.body.status === 'pending_approval' || req.body.resubmit === 'true'
    Object.assign(product, fields)
    if (resubmit || product.status === 'rejected') {
      product.status = 'pending_approval'
    }

    await product.save()
    await product.populate('supplier', 'fullName email')

    return res.json({
      message: 'Product updated.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message })
    }
    return res.status(500).json({ message: error.message || 'Failed to update product.' })
  }
}

export const listMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ supplier: req.user._id })
      .populate('supplier', 'fullName email')
      .sort({ createdAt: -1 })

    return res.json({ data: products.map((item) => item.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products.' })
  }
}

export const listApprovedProducts = async (_req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .populate('supplier', 'fullName email')
      .sort({ createdAt: -1 })

    return res.json({ data: products.map((item) => item.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products.' })
  }
}

export const listAllProducts = async (_req, res) => {
  try {
    const products = await Product.find()
      .populate('supplier', 'fullName email')
      .sort({ createdAt: -1 })

    return res.json({ data: products.map((item) => item.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products.' })
  }
}

const APPROVABLE_STATUSES = ['draft', 'pending_approval', 'rejected']
/** Approved products, or pending/draft when admin chooses Activate / Approve & Activate. */
const ACTIVATABLE_STATUSES = ['approved', 'pending_approval', 'draft', 'rejected']
const DEACTIVATABLE_STATUSES = ['active']
const REJECTABLE_STATUSES = ['draft', 'pending_approval', 'approved', 'active']

export const getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Product not found.' })
    }
    const product = await Product.findById(req.params.id).populate(
      'supplier',
      'fullName email phone businessName address',
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const safeObj = product.toSafeObject()

    // Enrich with supplier business profile if available
    const supplierId = product.supplier?._id || product.supplier
    if (supplierId) {
      try {
        const profile = await BusinessProfile.findOne({ user: supplierId })
        if (profile) {
          safeObj.supplierBusinessName = profile.businessName || safeObj.supplierBusinessName
          safeObj.supplierCity = profile.city || ''
          safeObj.supplierCountry = profile.country || ''
          safeObj.supplierAddress = profile.businessAddress || ''
        }
      } catch {
        // ignore profile lookup errors
      }
    }

    return res.json({ product: safeObj })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load product.' })
  }
}

export const updateProductCommission = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'supplier',
      'fullName email phone businessName address',
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const commission = Number(req.body.commission)
    if (Number.isNaN(commission) || commission <= 0) {
      return res.status(400).json({ message: 'Commission must be a valid number greater than 0.' })
    }

    product.commission = commission
    await product.save()

    return res.json({
      message: 'Product commission updated successfully.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update commission.' })
  }
}

export const approveProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'supplier',
      'fullName email phone businessName address',
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (!APPROVABLE_STATUSES.includes(product.status)) {
      return res.status(400).json({
        message: `Cannot approve a product with status "${product.status}".`,
      })
    }

    let effectiveCommission = product.commission
    if (req.body.commission !== undefined && req.body.commission !== '') {
      const commission = Number(req.body.commission)
      if (Number.isNaN(commission) || commission <= 0) {
        return res.status(400).json({ message: 'Commission must be a valid number greater than 0.' })
      }
      product.commission = commission
      effectiveCommission = commission
    }

    if (!effectiveCommission || Number(effectiveCommission) <= 0) {
      return res.status(400).json({
        message: 'Commission is required. You must set a commission greater than 0 before approving or activating this product.',
      })
    }

    const alsoActivate =
      req.body.activate === true ||
      req.body.activate === 'true' ||
      req.body.activate === '1'

    product.status = alsoActivate ? 'active' : 'approved'
    await product.save()

    createNotification({
      recipient: product.supplier?._id || product.supplier,
      targetRole: 'supplier',
      type: 'product',
      title: 'Product Approved',
      message: `Your product "${product.name}" was approved${alsoActivate ? ' and activated on the marketplace' : ''}.`,
      link: '/supplier/products',
    })

    return res.json({
      message: alsoActivate
        ? 'Product approved and activated. Users can now buy it on the marketplace.'
        : 'Product approved. Click Activate to make it visible on the marketplace.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to approve product.' })
  }
}

export const activateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'supplier',
      'fullName email phone businessName address',
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (!ACTIVATABLE_STATUSES.includes(product.status)) {
      return res.status(400).json({
        message: `Cannot activate a product with status "${product.status}".`,
      })
    }

    if (!product.commission || Number(product.commission) <= 0) {
      return res.status(400).json({
        message: 'Commission is required. You must set a commission greater than 0 before activating this product.',
      })
    }

    product.status = 'active'
    await product.save()

    return res.json({
      message: 'Product activated. Users can now buy it on the marketplace.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to activate product.' })
  }
}

export const deactivateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier', 'fullName email')
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (!DEACTIVATABLE_STATUSES.includes(product.status)) {
      return res.status(400).json({
        message: `Only active products can be deactivated. Current status: "${product.status}".`,
      })
    }

    product.status = 'approved'
    await product.save()

    return res.json({
      message: 'Product deactivated. It is no longer visible to buyers.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to deactivate product.' })
  }
}

export const rejectProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier', 'fullName email')
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (!REJECTABLE_STATUSES.includes(product.status)) {
      return res.status(400).json({
        message: `Cannot reject a product with status "${product.status}".`,
      })
    }

    product.status = 'rejected'
    await product.save()

    return res.json({
      message: 'Product rejected.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reject product.' })
  }
}

export const createAdminProduct = async (req, res) => {
  try {
    const fields = readProductFields(req.body)
    const supplierId = req.body.supplier || req.body.supplierAssign

    if (!fields.name || !fields.category) {
      return res.status(400).json({ message: 'Product name and category are required.' })
    }
    if (!supplierId) {
      return res.status(400).json({ message: 'Supplier is required.' })
    }

    const categoryName = await resolveCategoryName(fields.category)
    if (!categoryName) {
      return res.status(400).json({
        message: 'Invalid category. Choose a category from the admin category list.',
      })
    }
    fields.category = categoryName

    if (Number.isNaN(fields.price) || fields.price <= 0) {
      return res.status(400).json({ message: 'A valid positive price greater than 0 is required.' })
    }
    if (fields.quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative.' })
    }
    if (fields.commission < 0) {
      return res.status(400).json({ message: 'Commission cannot be negative.' })
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []
    const isVideoPath = (p) => /\.(mp4|webm|mov|ogg|mkv)$/i.test(p)
    const firstPhoto = images.find((item) => !isVideoPath(item))
    const image = firstPhoto || images[0] || PLACEHOLDER_IMAGE

    const sku = await uniqueSku(fields.sku)

    // Admin-created products default to active so they appear on the marketplace
    // immediately. Opt out with publishActive=false or an explicit non-active status.
    const publishActive =
      req.body.publishActive === true ||
      req.body.publishActive === 'true' ||
      req.body.publishActive === '1'
    const publishOptOut =
      req.body.publishActive === false ||
      req.body.publishActive === 'false' ||
      req.body.publishActive === '0'

    let status = 'active'
    if (req.body.status === 'draft') {
      status = 'draft'
    } else if (req.body.status === 'approved') {
      status = 'approved'
    } else if (publishActive || req.body.status === 'active') {
      status = 'active'
    } else if (publishOptOut || req.body.status === 'pending_approval') {
      status = 'pending_approval'
    }

    const product = await Product.create({
      ...fields,
      sku,
      image,
      images,
      supplier: supplierId,
      status,
    })

    await product.populate('supplier', 'fullName email')

    const statusMessages = {
      active: 'Product created and activated on the marketplace.',
      approved: 'Product created and approved.',
      draft: 'Product saved as draft.',
      pending_approval: 'Product created and pending approval.',
    }

    return res.status(201).json({
      message: statusMessages[status] || 'Product created.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message })
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This SKU is already in use. Generate a new one.' })
    }
    console.error('Create admin product error:', error)
    return res.status(500).json({ message: error.message || 'Failed to create product.' })
  }
}
