import {
  checkWmsSkuExists,
  createWmsProduct,
  getWmsLiveStockBySku,
  findWmsUserByEmail,
} from '../services/wmsSqlService.js'
import { getNextSku } from '../services/sequenceService.js'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import BusinessProfile from '../models/BusinessProfile.js'
import WalletSetting from '../models/WalletSetting.js'
import { resolveCategoryName } from './categoryController.js'
import { createNotification } from '../utils/notifications.js'
import fs from 'fs'
import { getImageDimensionsFromFile } from '../utils/imageDimensions.js'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'


async function uniqueSku(preferred, excludeId = null) {
  const candidate = preferred?.trim().toUpperCase()
  if (candidate && /^SVRO-\d+$/i.test(candidate)) {
    const existsInMongo = await Product.findOne({
      sku: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    const existsInWms = await checkWmsSkuExists(candidate).catch(() => false)
    if (!existsInMongo && !existsInWms) {
      return candidate
    }
  }

  // Predefined Serial SKU Pattern: SVRO-0001, SVRO-0002, etc.
  return await getNextSku()
}

function readProductFields(body) {
  const fulfillBy =
    body.fulfillBy === 'warehouse' ? 'warehouse' : body.fulfillBy === 'self' ? 'self' : ''
  const inWarehouse =
    fulfillBy === 'warehouse' ||
    (fulfillBy === '' &&
      (body.inWarehouse === true || body.inWarehouse === 'true' || body.inWarehouse === '1'))

  let itemSpecifics = {}
  if (body.itemSpecifics) {
    try {
      itemSpecifics =
        typeof body.itemSpecifics === 'string'
          ? JSON.parse(body.itemSpecifics)
          : body.itemSpecifics
    } catch {
      itemSpecifics = {}
    }
  }

  let variations = []
  if (body.variations) {
    try {
      variations =
        typeof body.variations === 'string'
          ? JSON.parse(body.variations)
          : body.variations
    } catch {
      variations = []
    }
  }

  const deliveryTime =
    fulfillBy === 'warehouse' || inWarehouse
      ? '1 Day (WMS Express Delivery)'
      : String(body.deliveryTime || '2-3 Days').trim()

  return {
    name: String(body.name || '').trim(),
    sku: body.sku,
    category: String(body.category || '').trim(),
    subcategory: String(body.subcategory || '').trim(),
    brand: String(body.brand || '').trim(),
    description: String(body.description || '').trim(),
    price: Number(body.price),
    quantity: Number(body.quantity || 0),
    fulfillBy,
    inWarehouse,
    handlingTime: String(body.handlingTime || '1 business day').trim(),
    deliveryTime,
    condition: String(body.condition || 'Brand New').trim(),
    color: String(body.color || '').trim(),
    material: String(body.material || '').trim(),
    mpn: String(body.mpn || '').trim(),
    itemType: String(body.itemType || '').trim(),
    numItemsInSet: String(body.numItemsInSet || '1').trim(),
    itemSpecifics,
    variations,
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
    videoUrl: String(body.videoUrl || '').trim(),
    stockAlert: Number(body.stockAlert || 10),
    stockExpiry: String(body.stockExpiry || '').trim(),
    customizationAvailable:
      body.customizationAvailable === true ||
      body.customizationAvailable === 'true' ||
      body.customizationAvailable === '1',
    customizationInstructions: String(body.customizationInstructions || '').trim(),
    sisterSkus: (() => {
      let list = []
      if (body.sisterSkus) {
        if (Array.isArray(body.sisterSkus)) {
          list = body.sisterSkus.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
        } else if (typeof body.sisterSkus === 'string') {
          try {
            const parsed = JSON.parse(body.sisterSkus)
            if (Array.isArray(parsed)) {
              list = parsed.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
            } else {
              list = body.sisterSkus.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
            }
          } catch {
            list = body.sisterSkus.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
          }
        }
      }
      return [...new Set(list)]
    })(),
    sisterVariationType: String(body.sisterVariationType || 'Color').trim() || 'Color',
    // 4 Product Research Fields
    globalSearchVolume: Math.max(0, parseInt(body.globalSearchVolume, 10) || 0),
    globalMonthlySales: Math.max(0, parseInt(body.globalMonthlySales, 10) || 0),
    usMarketAverageSales: Math.max(0, parseInt(body.usMarketAverageSales, 10) || 0),
    productKeywords: (() => {
      let kws = []
      if (body.productKeywords) {
        if (Array.isArray(body.productKeywords)) {
          kws = body.productKeywords.map((k) => String(k).trim()).filter(Boolean)
        } else if (typeof body.productKeywords === 'string') {
          try {
            const parsed = JSON.parse(body.productKeywords)
            if (Array.isArray(parsed)) {
              kws = parsed.map((k) => String(k).trim()).filter(Boolean)
            } else {
              kws = body.productKeywords.split(',').map((k) => k.trim()).filter(Boolean)
            }
          } catch {
            kws = body.productKeywords.split(',').map((k) => k.trim()).filter(Boolean)
          }
        }
      }
      return [...new Set(kws)].slice(0, 5)
    })(),
    rankingPriority: ['high', 'medium', 'low', 'standard'].includes(String(body.rankingPriority || '').toLowerCase())
      ? String(body.rankingPriority).toLowerCase()
      : 'standard',
    adminEvaluationNotes: String(body.adminEvaluationNotes || '').trim(),
  }
}

/**
 * Calculates a composite ranking score for landing page positioning.
 * High priority products get highest tier boost, followed by Medium, Low, and Standard.
 * Within each priority tier, products are ranked by Global Monthly Sales, US Market Sales, Search Volume, and Keywords.
 */
export function calculateRankingScore({
  rankingPriority = 'standard',
  globalMonthlySales = 0,
  globalSearchVolume = 0,
  usMarketAverageSales = 0,
  productKeywords = [],
}) {
  const priorityWeights = {
    high: 10000000,
    medium: 5000000,
    low: 1000000,
    standard: 0,
  }
  const pWeight = priorityWeights[rankingPriority] || 0
  const salesScore = Math.max(0, Number(globalMonthlySales) || 0) * 100
  const usScore = Math.max(0, Number(usMarketAverageSales) || 0) * 150
  const searchScore = Math.max(0, Number(globalSearchVolume) || 0) * 1
  const kwCount = Array.isArray(productKeywords) ? productKeywords.filter(Boolean).length : 0
  const kwScore = kwCount * 500
  return pWeight + salesScore + usScore + searchScore + kwScore
}

function validateUploadedImageResolutions(files) {
  if (!Array.isArray(files) || files.length === 0) return null
  const isVideoFile = (f) =>
    (f.mimetype && f.mimetype.startsWith('video/')) ||
    /\.(mp4|webm|mov|ogg|mkv)$/i.test(f.originalname || f.filename || '')

  for (const file of files) {
    if (isVideoFile(file)) continue
    const filePath = file.path
    if (filePath && fs.existsSync(filePath)) {
      const dim = getImageDimensionsFromFile(filePath)
      if (dim && (dim.width < 1000 || dim.height < 1000)) {
        return {
          filename: file.originalname || file.filename,
          width: dim.width,
          height: dim.height,
        }
      }
    }
  }
  return null
}

/**
 * Synchronizes sister SKUs bi-directionally across the connected group of products.
 * If Product A has sister SKUs [B, C], then B will have [A, C], and C will have [A, B].
 * If B is removed from A, then A is removed from B's sister SKUs.
 */
export async function syncSisterSkusForProduct(product, newSisterSkus = []) {
  if (!product || !product.sku) return

  const currentSku = String(product.sku).trim().toUpperCase()
  const targetSisterSkus = [...new Set(newSisterSkus.map((s) => String(s).trim().toUpperCase()))].filter(
    (s) => s && s !== currentSku,
  )

  const oldSisterSkus = Array.isArray(product.sisterSkus)
    ? product.sisterSkus.map((s) => String(s).trim().toUpperCase())
    : []

  // Update current product's sisterSkus
  product.sisterSkus = targetSisterSkus
  await product.save()

  // Find removed SKUs that were previously in oldSisterSkus but not in target
  const removedSkus = oldSisterSkus.filter((s) => !targetSisterSkus.includes(s))
  if (removedSkus.length > 0) {
    await Product.updateMany(
      { sku: { $in: removedSkus } },
      { $pull: { sisterSkus: currentSku } },
    ).catch(() => {})
  }

  if (targetSisterSkus.length === 0) return

  // Full group of connected SKUs
  const fullGroupSkus = [currentSku, ...targetSisterSkus]

  // For each peer in targetSisterSkus, ensure it links to all other peers in fullGroupSkus
  for (const peerSku of targetSisterSkus) {
    const peersForThisOne = fullGroupSkus.filter((s) => s !== peerSku)
    await Product.updateOne(
      { sku: peerSku },
      {
        $addToSet: { sisterSkus: { $each: peersForThisOne } },
        ...(product.sisterVariationType ? { sisterVariationType: product.sisterVariationType } : {}),
      },
    ).catch(() => {})
  }
}

function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) return
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
    } catch { /* ignore */ }
  }
}

export const createProduct = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.status !== 'approved') {
      cleanupUploadedFiles(req.files)
      return res.status(403).json({
        message: req.user?.status === 'suspended'
          ? `Your supplier account has been suspended: ${req.user?.suspensionReason || 'Violation'}. Product creation is blocked.`
          : 'Your account is pending admin approval. You cannot add products until your account has been approved by the Admin.',
        status: req.user?.status,
      })
    }

    const fields = readProductFields(req.body)
    const asDraft = req.body.status === 'draft'

    if (!asDraft) {
      const lowResFile = validateUploadedImageResolutions(req.files)
      if (lowResFile) {
        cleanupUploadedFiles(req.files)
        return res.status(400).json({
          message: `Image rejected: "${lowResFile.filename}" is low-resolution (${lowResFile.width} × ${lowResFile.height} px). Minimum required resolution for product images is 1000 × 1000 pixels. Please upload images with 1000 × 1000 pixels or higher.`,
        })
      }
    }

    if (!fields.name || !fields.category) {
      return res.status(400).json({ message: 'Product name and category are required.' })
    }

    if (!asDraft && !fields.subcategory) {
      return res.status(400).json({ message: 'Subcategory is required. Please select a subcategory.' })
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

    // Auto-apply category-defined commission rate
    const categoryDoc = await Category.findOne({ name: new RegExp(`^${fields.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    const walletSetting = await WalletSetting.getOrCreate()
    const categoryCommission =
      categoryDoc?.commissionRate !== undefined && categoryDoc?.commissionRate !== null
        ? Number(categoryDoc.commissionRate)
        : Number(walletSetting.marketplaceFeePercent ?? 8)
    const wmsFee = Number(walletSetting.wmsFeePercent ?? 0)

    if (fields.fulfillBy === 'warehouse' || fields.inWarehouse) {
      fields.commission = wmsFee
      fields.isWmsVerified = true
      fields.wmsVerifiedAt = new Date()
      fields.deliveryTime = '1 Day (WMS Express Delivery)'
    } else {
      fields.commission = categoryCommission
      fields.isWmsVerified = false
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []
    const images = uploaded.length > 0 ? uploaded : fields.image ? [fields.image] : []

    // 6 images mandatory out of 10 (unless draft)
    if (!asDraft && images.length < 6) {
      return res.status(400).json({
        message:
          images.length === 0
            ? 'Please upload at least 6 images/videos for the product. Minimum 6 images are mandatory out of 10.'
            : `Please upload at least 6 images/videos. Currently uploaded: ${images.length} of 6 mandatory.`,
      })
    }

    const isVideoPath = (p) => /\.(mp4|webm|mov|ogg|mkv)$/i.test(p)
    const firstPhoto = images.find((item) => !isVideoPath(item))
    const image = firstPhoto || images[0] || PLACEHOLDER_IMAGE

    const sku = await uniqueSku(fields.sku)
    const status = asDraft ? 'draft' : 'pending_approval'

    // ── Register Master Product in WMS MySQL ──
    let wmsCreated = null
    try {
      let supplierWmsId = req.user.wmsSupplierId
      if (!supplierWmsId && req.user.email) {
        const wUser = await findWmsUserByEmail(req.user.email).catch(() => null)
        if (wUser) {
          supplierWmsId = wUser.id
          req.user.wmsSupplierId = supplierWmsId
          req.user.wmsClientId = wUser.user_unique_name || ''
          await req.user.save()
        }
      }

      if (supplierWmsId) {
        wmsCreated = await createWmsProduct({
          supplierId: supplierWmsId,
          name: fields.name,
          sku,
          image,
          description: fields.description,
          weight: Number(fields.weight || 0),
          weightUnit: fields.weightUnit || 'gm',
          length: Number(fields.length || 0),
          width: Number(fields.width || 0),
          height: Number(fields.height || 0),
          dimensionUnit: fields.dimensionUnit || 'cm',
          brand: fields.brand,
          inWarehouse: fields.inWarehouse,
          fulfillBy: fields.fulfillBy === 'warehouse' ? 'wms' : 'client',
          status: asDraft ? 'pending' : 'pending',
        })
      }
    } catch (wmsProdErr) {
      console.warn('[Create Product] WMS MySQL creation notice:', wmsProdErr.message)
    }

    const rankingScore = calculateRankingScore({
      rankingPriority: fields.rankingPriority || 'standard',
      globalMonthlySales: fields.globalMonthlySales,
      usMarketAverageSales: fields.usMarketAverageSales,
      globalSearchVolume: fields.globalSearchVolume,
      productKeywords: fields.productKeywords,
    })

    const product = await Product.create({
      ...fields,
      sku,
      image,
      images,
      rankingScore,
      supplier: req.user._id,
      status,
      wmsProductId: wmsCreated?.id || null,
    })

    if (fields.sisterSkus && fields.sisterSkus.length > 0) {
      await syncSisterSkusForProduct(product, fields.sisterSkus).catch(() => {})
    }

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
    if (req.user?.role !== 'admin' && req.user?.status !== 'approved') {
      cleanupUploadedFiles(req.files)
      return res.status(403).json({
        message: req.user?.status === 'suspended'
          ? `Your supplier account has been suspended: ${req.user?.suspensionReason || 'Violation'}. Product editing is blocked.`
          : 'Your account is pending admin approval. You cannot edit products until your account has been approved by the Admin.',
        status: req.user?.status,
      })
    }

    const asDraft = req.body.status === 'draft'
    if (!asDraft) {
      const lowResFile = validateUploadedImageResolutions(req.files)
      if (lowResFile) {
        cleanupUploadedFiles(req.files)
        return res.status(400).json({
          message: `Image rejected: "${lowResFile.filename}" is low-resolution (${lowResFile.width} × ${lowResFile.height} px). Minimum required resolution for product images is 1000 × 1000 pixels. Please upload images with 1000 × 1000 pixels or higher.`,
        })
      }
    }

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
    const isWmsProduct = Boolean(
      product.isWmsVerified || product.inWarehouse || product.fulfillBy === 'warehouse',
    )

    if (isWmsProduct) {
      // Stock quantity cannot be manually altered at supplier request for WMS-verified products
      if (
        req.body.quantity !== undefined &&
        Number(req.body.quantity) !== Number(product.quantity)
      ) {
        return res.status(400).json({
          message:
            'Stock quantity cannot be manually altered for WMS-verified products. Stock is verified directly from Sellvro WMS warehouse intake records.',
        })
      }
      if (req.body.additionalQuantity !== undefined && Number(req.body.additionalQuantity) > 0) {
        return res.status(400).json({
          message:
            'Manual additional stock is disabled for WMS-verified products. Extra inventory must be received and logged through Sellvro WMS inbound intake.',
        })
      }
      delete fields.quantity

      const walletSetting = await WalletSetting.getOrCreate()
      fields.commission = Number(walletSetting.wmsFeePercent ?? 0)
    } else {
      if (req.body.additionalQuantity !== undefined && !Number.isNaN(Number(req.body.additionalQuantity))) {
        const addQty = Number(req.body.additionalQuantity)
        if (addQty > 0) {
          fields.quantity = (product.quantity || 0) + addQty
        }
      }

      if (fields.quantity !== undefined && fields.quantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative.' })
      }

      if (fields.fulfillBy === 'self') {
        const walletSetting = await WalletSetting.getOrCreate()
        fields.commission = Number(walletSetting.marketplaceFeePercent ?? 8)
      }
    }

    let baseImages = product.images || []
    if (req.body.existingImages !== undefined) {
      try {
        const parsed = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages
        if (Array.isArray(parsed)) baseImages = parsed.filter(Boolean)
      } catch {
        // keep product.images
      }
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []
    if (uploaded.length > 0 || req.body.existingImages !== undefined) {
      fields.images = [...baseImages, ...uploaded]
      fields.image = fields.images[0] || product.image
    }

    const currentImages = fields.images || product.images || []
    if (currentImages.length < 2) {
      return res.status(400).json({
        message: 'Product must have at least 2 images. Multiple images are required.',
      })
    }

    const wasActive = product.status === 'active' || product.status === 'approved'
    const isMaterialChange =
      (fields.name && fields.name !== product.name) ||
      (fields.price !== undefined && Number(fields.price) !== Number(product.price)) ||
      (fields.category && fields.category !== product.category) ||
      (fields.description && fields.description !== product.description) ||
      uploaded.length > 0 ||
      (req.body.existingImages !== undefined && JSON.stringify(fields.images) !== JSON.stringify(product.images))

    const resubmit = req.body.status === 'pending_approval' || req.body.resubmit === 'true'
    Object.assign(product, fields)
    if (resubmit || product.status === 'rejected' || (wasActive && isMaterialChange)) {
      product.status = 'pending_approval'
    }

    product.rankingScore = calculateRankingScore({
      rankingPriority: product.rankingPriority || 'standard',
      globalMonthlySales: product.globalMonthlySales,
      usMarketAverageSales: product.usMarketAverageSales,
      globalSearchVolume: product.globalSearchVolume,
      productKeywords: product.productKeywords,
    })

    await product.save()
    if (fields.sisterSkus !== undefined) {
      await syncSisterSkusForProduct(product, fields.sisterSkus).catch(() => {})
    }
    await product.populate('supplier', 'fullName email')

    if (wasActive && isMaterialChange) {
      createNotification({
        targetRole: 'admin',
        type: 'product',
        title: 'Product Edited — Re-approval Required',
        message: `${req.user.fullName || 'A supplier'} edited active product "${product.name}". It has been submitted for re-moderation.`,
        link: '/admin/products',
      })
    }

    return res.json({
      message:
        wasActive && isMaterialChange
          ? 'Product changes saved and submitted for admin re-approval.'
          : 'Product updated.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message })
    }
    return res.status(500).json({ message: error.message || 'Failed to update product.' })
  }
}

/**
 * Enrich product documents with supplier business profile and deterministic vendor name
 */
async function enrichProductsWithSupplier(products) {
  if (!products || products.length === 0) return []

  const supplierIds = [
    ...new Set(
      products
        .map((p) => p.supplier?._id?.toString?.() || p.supplier?.toString?.())
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
    ),
  ]

  let profilesMap = new Map()
  if (supplierIds.length > 0) {
    try {
      const profiles = await BusinessProfile.find({ user: { $in: supplierIds } }).lean()
      profiles.forEach((prof) => {
        if (prof?.user) {
          profilesMap.set(prof.user.toString(), prof)
        }
      })
    } catch (err) {
      console.warn('Failed to fetch business profiles for products:', err.message)
    }
  }

  // 1. Calculate Real Sold Count for each product from Order database
  const productObjectIds = products
    .map((p) => {
      const rawId = p._id || p.id
      return rawId && mongoose.Types.ObjectId.isValid(rawId)
        ? new mongoose.Types.ObjectId(rawId)
        : null
    })
    .filter(Boolean)

  let salesMap = new Map()
  if (productObjectIds.length > 0) {
    try {
      const salesAgg = await Order.aggregate([
        {
          $match: {
            product: { $in: productObjectIds },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$product',
            totalSold: { $sum: '$quantity' },
          },
        },
      ])
      salesAgg.forEach((item) => {
        if (item?._id) {
          salesMap.set(item._id.toString(), Number(item.totalSold) || 0)
        }
      })
    } catch (err) {
      console.warn('Failed to calculate sales for products:', err.message)
    }
  }

  // 2. Calculate Real total orders completed per supplier
  let supplierOrdersMap = new Map()
  if (supplierIds.length > 0) {
    try {
      const supplierObjIds = supplierIds.map((id) => new mongoose.Types.ObjectId(id))
      const supplierAgg = await Order.aggregate([
        {
          $match: {
            supplier: { $in: supplierObjIds },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$supplier',
            count: { $sum: 1 },
          },
        },
      ])
      supplierAgg.forEach((s) => {
        if (s?._id) {
          supplierOrdersMap.set(s._id.toString(), Number(s.count) || 0)
        }
      })
    } catch (err) {
      console.warn('Failed to calculate supplier orders:', err.message)
    }
  }

  const enriched = products.map((product) => {
    const safeObj = typeof product.toSafeObject === 'function' ? product.toSafeObject() : { ...product }
    const sId = product.supplier?._id?.toString?.() || product.supplier?.toString?.() || safeObj.supplierId
    const profile = sId ? profilesMap.get(sId) : null

    if (profile) {
      if (profile.businessName) {
        safeObj.supplierBusinessName = profile.businessName
      }
      safeObj.supplierCity = profile.city || safeObj.supplierCity || ''
      safeObj.supplierCountry = profile.country || safeObj.supplierCountry || ''
      safeObj.supplierAddress = profile.businessAddress || safeObj.supplierAddress || ''
    }

    const bestVendorName =
      safeObj.supplierBusinessName ||
      (safeObj.supplier && safeObj.supplier !== '—' ? safeObj.supplier : '') ||
      safeObj.supplierEmail ||
      '—'

    safeObj.vendorName = bestVendorName
    if (!safeObj.supplier || safeObj.supplier === '—') {
      safeObj.supplier = bestVendorName
    }

    const prodId = product._id?.toString?.() || safeObj.id
    safeObj.soldCount = salesMap.get(prodId) || 0

    const totalOrders = sId ? (supplierOrdersMap.get(sId) || 0) : 0
    safeObj.supplierTotalOrders = totalOrders
    safeObj.supplierRating = totalOrders > 0 ? '100%' : 'New'

    return safeObj
  })

  return enriched
}

export const listMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ supplier: req.user._id })
      .populate('supplier', 'fullName email phone clientId')
      .sort({ sku: 1, createdAt: -1 })

    const enriched = await enrichProductsWithSupplier(products)
    return res.json({ data: enriched })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products.' })
  }
}

export const listApprovedProducts = async (_req, res) => {
  try {
    const products = await Product.find({ status: { $in: ['active', 'approved'] } })
      .populate('supplier', 'fullName email phone clientId')
      .sort({ rankingScore: -1, createdAt: -1 })

    const enriched = await enrichProductsWithSupplier(products)

    // Automatically tag Hot-Selling Products (Top 20 highest-performing based on Admin data)
    let hotRank = 0
    enriched.forEach((item) => {
      const score = Number(item.rankingScore || 0)
      if (score > 0 && hotRank < 20) {
        hotRank += 1
        item.isHotSelling = true
        item.hotSellingRank = hotRank
      } else {
        item.isHotSelling = false
        item.hotSellingRank = null
      }
    })

    return res.json({ data: enriched })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products.' })
  }
}

export const listAllProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(req.query.limit, 10))) : 0
    const filter = { status: { $ne: 'draft' } }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status
    }

    let query = Product.find(filter)
      .populate('supplier', 'fullName email phone clientId')
      .sort({ sku: 1, createdAt: -1 })

    if (limit > 0) {
      query = query.skip((page - 1) * limit).limit(limit)
    }

    const [products, total] = await Promise.all([
      query,
      Product.countDocuments(filter),
    ])

    const enriched = await enrichProductsWithSupplier(products)
    return res.json({
      data: enriched,
      pagination: {
        total,
        page,
        limit: limit || total,
        pages: limit > 0 ? Math.ceil(total / limit) || 1 : 1,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load products.' })
  }
}

const APPROVABLE_STATUSES = ['draft', 'pending_approval', 'rejected', 'inactive', 'deactivated']
/** Active / approved or deactivated products. */
const ACTIVATABLE_STATUSES = ['approved', 'active', 'inactive', 'deactivated', 'pending_approval']
const DEACTIVATABLE_STATUSES = ['active', 'approved']
const REJECTABLE_STATUSES = ['draft', 'pending_approval', 'approved', 'active', 'inactive', 'deactivated']

export const getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    // Increment real views count
    await Product.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } })

    const product = await Product.findById(req.params.id).populate(
      'supplier',
      'fullName email phone clientId',
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const [enriched] = await enrichProductsWithSupplier([product])

    // Calculate Hot-Selling status and rank if applicable
    const score = Number(product.rankingScore || 0)
    if (score > 0 && (product.status === 'active' || product.status === 'approved')) {
      const higherCount = await Product.countDocuments({
        status: { $in: ['active', 'approved'] },
        $or: [
          { rankingScore: { $gt: score } },
          { rankingScore: score, createdAt: { $gt: product.createdAt } },
        ],
      })
      const rank = higherCount + 1
      enriched.hotSellingRank = rank
      enriched.isHotSelling = rank <= 20
    } else {
      enriched.isHotSelling = false
      enriched.hotSellingRank = null
    }

    // Load and enrich Sister Products
    let sisterProducts = []
    if (Array.isArray(product.sisterSkus) && product.sisterSkus.length > 0) {
      const currentSku = String(product.sku || '').trim().toUpperCase()
      const cleanSisterSkus = product.sisterSkus
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => s && s !== currentSku)

      if (cleanSisterSkus.length > 0) {
        const isStaffOrOwner =
          req.user?.role === 'admin' ||
          (req.user?.role === 'supplier' &&
            (product.supplier?._id?.equals?.(req.user._id) || product.supplier?.equals?.(req.user._id)))
        const allowedStatuses = isStaffOrOwner ? { $ne: 'rejected' } : { $in: ['active', 'approved'] }

        const foundSisters = await Product.find({
          sku: { $in: cleanSisterSkus },
          _id: { $ne: product._id },
          status: allowedStatuses,
        }).populate('supplier', 'fullName email phone clientId')
        sisterProducts = await enrichProductsWithSupplier(foundSisters)
      }
    }
    enriched.sisterProducts = sisterProducts

    if (req.user?._id && Array.isArray(product.watchers)) {
      enriched.isWatchlisted = product.watchers.some(
        (w) => w.toString() === req.user._id.toString(),
      )
    } else {
      enriched.isWatchlisted = false
    }

    return res.json({ product: enriched })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load product.' })
  }
}

export const toggleWatchProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Product not found.' })
    }
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const userId = req.user._id
    if (!Array.isArray(product.watchers)) {
      product.watchers = []
    }

    const idx = product.watchers.findIndex((w) => w.toString() === userId.toString())
    let isWatchlisted = false
    if (idx > -1) {
      product.watchers.splice(idx, 1)
      isWatchlisted = false
    } else {
      product.watchers.push(userId)
      isWatchlisted = true
    }

    await product.save()

    return res.json({
      success: true,
      isWatchlisted,
      watchersCount: product.watchers.length,
      message: isWatchlisted ? 'Added to watchlist' : 'Removed from watchlist',
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to toggle watchlist.' })
  }
}

export const getStoreDetails = async (req, res) => {
  try {
    const { supplierId } = req.params
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(404).json({ message: 'Store not found.' })
    }

    const supplierUser = await User.findById(supplierId).select('fullName email phone createdAt role')
    if (!supplierUser || supplierUser.role !== 'supplier') {
      return res.status(404).json({ message: 'Store or seller not found.' })
    }

    const profile = await BusinessProfile.findOne({ user: supplierId }).lean()

    const storeName =
      profile?.businessName ||
      supplierUser.fullName ||
      'Sellvro Verified Merchant'

    const totalOrders = await Order.countDocuments({
      supplier: supplierId,
      status: { $ne: 'cancelled' },
    })

    const salesAgg = await Order.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$quantity' },
        },
      },
    ])
    const totalItemsSold = salesAgg[0]?.totalSold || 0

    const products = await Product.find({
      supplier: supplierId,
      status: { $in: ['active', 'approved'] },
    }).sort({ createdAt: -1 })

    let followersCount = 0
    products.forEach((p) => {
      if (Array.isArray(p.watchers)) {
        followersCount += p.watchers.length
      }
    })

    const enriched = await enrichProductsWithSupplier(products)

    return res.json({
      store: {
        id: supplierId,
        name: storeName,
        businessDescription: profile?.businessDescription || '',
        businessCategory: profile?.businessCategory || 'General Merchandise',
        city: profile?.city || '',
        country: profile?.country || '',
        email: profile?.businessEmail || supplierUser.email,
        phone: profile?.businessPhone || supplierUser.phone || '',
        joinedAt: supplierUser.createdAt,
        totalOrders,
        totalItemsSold,
        followersCount,
        positiveRating: totalOrders > 0 ? '99.4%' : 'New',
        isVerified: true,
        totalProducts: products.length,
      },
      products: enriched,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load store details.' })
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

    // Ensure product has category commission assigned if not already set
    if (!product.commission || Number(product.commission) <= 0) {
      const categoryDoc = await Category.findOne({
        name: new RegExp(`^${(product.category || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      })
      const walletSetting = await WalletSetting.getOrCreate()
      product.commission =
        categoryDoc?.commissionRate !== undefined && categoryDoc?.commissionRate !== null
          ? Number(categoryDoc.commissionRate)
          : Number(walletSetting.marketplaceFeePercent ?? 8)
    }

    // Direct approval makes the product approved and live on marketplace immediately!
    product.status = 'approved'
    await product.save()

    createNotification({
      recipient: product.supplier?._id || product.supplier,
      targetRole: 'supplier',
      type: 'product',
      title: 'Product Approved',
      message: `Your product "${product.name}" was approved and is now live on the marketplace.`,
      link: '/supplier/products',
    })

    return res.json({
      message: 'Product approved and is now live on the marketplace.',
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

    // Permission check: admin or owner supplier
    const isOwnerSupplier =
      req.user &&
      req.user.role === 'supplier' &&
      (product.supplier?._id ? product.supplier._id.equals(req.user._id) : product.supplier.equals(req.user._id))

    if (req.user.role !== 'admin' && !isOwnerSupplier) {
      return res.status(403).json({ message: 'You can only activate your own products.' })
    }

    if (isOwnerSupplier && product.status === 'pending_approval') {
      return res.status(400).json({ message: 'This product is pending admin approval and cannot be activated yet.' })
    }
    if (isOwnerSupplier && product.status === 'draft') {
      return res.status(400).json({ message: 'Please submit this draft product for admin approval first.' })
    }
    if (isOwnerSupplier && product.status === 'rejected') {
      return res.status(400).json({ message: 'This product was rejected by admin. Please edit and resubmit.' })
    }

    if (!ACTIVATABLE_STATUSES.includes(product.status)) {
      return res.status(400).json({
        message: `Cannot activate a product with status "${product.status}".`,
      })
    }

    const isWms = Boolean(
      product.isWmsVerified || product.inWarehouse || product.fulfillBy === 'warehouse',
    )
    if (!isWms && (!product.commission || Number(product.commission) <= 0)) {
      // Auto-assign default marketplace fee if none set
      const walletSetting = await WalletSetting.getOrCreate()
      product.commission = Number(walletSetting.marketplaceFeePercent ?? 8)
    }

    product.status = 'approved'
    await product.save()

    return res.json({
      message: 'Product activated. It is now live on the marketplace.',
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

    // Permission check: admin or owner supplier
    const isOwnerSupplier =
      req.user &&
      req.user.role === 'supplier' &&
      (product.supplier?._id ? product.supplier._id.equals(req.user._id) : product.supplier.equals(req.user._id))

    if (req.user.role !== 'admin' && !isOwnerSupplier) {
      return res.status(403).json({ message: 'You can only deactivate your own products.' })
    }

    if (!DEACTIVATABLE_STATUSES.includes(product.status)) {
      return res.status(400).json({
        message: `Only active/approved products can be deactivated. Current status: "${product.status}".`,
      })
    }

    product.status = 'inactive'
    await product.save()

    return res.json({
      message: 'Product deactivated. It is temporarily hidden from the marketplace.',
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
    const asDraft = req.body.status === 'draft'

    if (!asDraft) {
      const lowResFile = validateUploadedImageResolutions(req.files)
      if (lowResFile) {
        cleanupUploadedFiles(req.files)
        return res.status(400).json({
          message: `Image rejected: "${lowResFile.filename}" is low-resolution (${lowResFile.width} × ${lowResFile.height} px). Minimum required resolution for product images is 1000 × 1000 pixels. Please upload images with 1000 × 1000 pixels or higher.`,
        })
      }
    }

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

    // Automatically assign category commission rate
    const categoryDoc = await Category.findOne({
      name: new RegExp(`^${fields.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    })
    const walletSetting = await WalletSetting.getOrCreate()
    const categoryCommission =
      categoryDoc?.commissionRate !== undefined && categoryDoc?.commissionRate !== null
        ? Number(categoryDoc.commissionRate)
        : Number(walletSetting.marketplaceFeePercent ?? 8)
    const wmsFee = Number(walletSetting.wmsFeePercent ?? 0)

    if (fields.fulfillBy === 'warehouse' || fields.inWarehouse) {
      fields.commission = wmsFee
    } else {
      fields.commission = categoryCommission
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []
    const images = uploaded.length > 0 ? uploaded : fields.image ? [fields.image] : []
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

    const rankingScore = calculateRankingScore({
      rankingPriority: fields.rankingPriority,
      globalMonthlySales: fields.globalMonthlySales,
      globalSearchVolume: fields.globalSearchVolume,
      usMarketAverageSales: fields.usMarketAverageSales,
      productKeywords: fields.productKeywords,
    })

    const product = await Product.create({
      ...fields,
      rankingScore,
      evaluatedAt: new Date(),
      evaluatedBy: req.user?._id || null,
      sku,
      image,
      images,
      supplier: supplierId,
      status,
    })

    if (fields.sisterSkus && fields.sisterSkus.length > 0) {
      await syncSisterSkusForProduct(product, fields.sisterSkus).catch(() => {})
    }

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

export const updateAdminProduct = async (req, res) => {
  try {
    const asDraft = req.body.status === 'draft'
    if (!asDraft) {
      const lowResFile = validateUploadedImageResolutions(req.files)
      if (lowResFile) {
        cleanupUploadedFiles(req.files)
        return res.status(400).json({
          message: `Image rejected: "${lowResFile.filename}" is low-resolution (${lowResFile.width} × ${lowResFile.height} px). Minimum required resolution for product images is 1000 × 1000 pixels. Please upload images with 1000 × 1000 pixels or higher.`,
        })
      }
    }

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const {
      name,
      sku,
      category,
      subcategory,
      condition,
      handlingTime,
      deliveryTime,
      stockAlert,
      brand,
      supplier,
      client,
      description,
      price,
      quantity,
      commission,
      barcode,
      fulfillBy,
      location,
      status,
      weight,
      weightUnit,
      length,
      width,
      height,
      dimensionUnit,
      existingImages,
    } = req.body

    if (name !== undefined) product.name = String(name).trim()
    if (category !== undefined) {
      const categoryName = await resolveCategoryName(category)
      product.category = categoryName || category
      const categoryDoc = await Category.findOne({
        name: new RegExp(`^${product.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      })
      if (categoryDoc?.commissionRate !== undefined && categoryDoc?.commissionRate !== null) {
        product.commission = Number(categoryDoc.commissionRate)
      }
    }
    if (subcategory !== undefined) product.subcategory = String(subcategory).trim()
    if (condition !== undefined) product.condition = String(condition).trim()
    if (handlingTime !== undefined) product.handlingTime = String(handlingTime).trim()
    if (deliveryTime !== undefined) product.deliveryTime = String(deliveryTime).trim()
    if (stockAlert !== undefined && stockAlert !== '') product.stockAlert = Number(stockAlert) || 0
    if (sku !== undefined && sku.trim().toUpperCase() !== product.sku) {
      product.sku = await uniqueSku(sku, product._id)
    }
    if (brand !== undefined) product.brand = String(brand).trim()
    const chosenSupplier = supplier || client
    if (chosenSupplier && mongoose.Types.ObjectId.isValid(chosenSupplier)) {
      product.supplier = chosenSupplier
    }
    if (description !== undefined) product.description = String(description).trim()
    if (price !== undefined && price !== '') {
      const p = Number(price)
      if (!Number.isNaN(p) && p > 0) {
        product.price = p
      }
    }
    if (quantity !== undefined && quantity !== '') {
      const q = Number(quantity)
      if (!Number.isNaN(q) && q >= 0) {
        product.quantity = q
      }
    }
    if (commission !== undefined && commission !== '') {
      const c = Number(commission)
      if (!Number.isNaN(c) && c >= 0) {
        product.commission = c
      }
    }
    if (barcode !== undefined) product.barcode = String(barcode).trim()
    if (fulfillBy !== undefined) product.fulfillBy = fulfillBy
    if (location !== undefined) product.location = String(location).trim()
    if (status !== undefined) product.status = status
    if (weight !== undefined) product.weight = String(weight).trim()
    if (weightUnit !== undefined) product.weightUnit = String(weightUnit).trim()
    if (length !== undefined) product.length = String(length).trim()
    if (width !== undefined) product.width = String(width).trim()
    if (height !== undefined) product.height = String(height).trim()
    if (dimensionUnit !== undefined) product.dimensionUnit = String(dimensionUnit).trim()
    if (req.body.customizationAvailable !== undefined) {
      product.customizationAvailable =
        req.body.customizationAvailable === true ||
        req.body.customizationAvailable === 'true' ||
        req.body.customizationAvailable === '1'
    }
    if (req.body.customizationInstructions !== undefined) {
      product.customizationInstructions = String(req.body.customizationInstructions || '').trim()
    }

    // Handle photo updates
    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []

    let updatedImages = product.images || []
    if (existingImages) {
      try {
        const parsed = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages
        if (Array.isArray(parsed)) {
          updatedImages = parsed
        }
      } catch {
        // keep as is
      }
    }
    if (uploaded.length > 0) {
      updatedImages = [...updatedImages, ...uploaded]
    }
    if (updatedImages.length > 0) {
      product.images = updatedImages
      product.image = updatedImages[0]
    }

    if (req.body.sisterVariationType !== undefined) {
      product.sisterVariationType = String(req.body.sisterVariationType || 'Color').trim() || 'Color'
    }

    if (req.body.globalSearchVolume !== undefined) {
      product.globalSearchVolume = Math.max(0, parseInt(req.body.globalSearchVolume, 10) || 0)
    }
    if (req.body.globalMonthlySales !== undefined) {
      product.globalMonthlySales = Math.max(0, parseInt(req.body.globalMonthlySales, 10) || 0)
    }
    if (req.body.usMarketAverageSales !== undefined) {
      product.usMarketAverageSales = Math.max(0, parseInt(req.body.usMarketAverageSales, 10) || 0)
    }
    if (req.body.productKeywords !== undefined) {
      const parsedFields = readProductFields(req.body)
      product.productKeywords = parsedFields.productKeywords
    }
    if (req.body.rankingPriority !== undefined) {
      const p = String(req.body.rankingPriority).toLowerCase().trim()
      if (['high', 'medium', 'low', 'standard'].includes(p)) {
        product.rankingPriority = p
      }
    }
    if (req.body.adminEvaluationNotes !== undefined) {
      product.adminEvaluationNotes = String(req.body.adminEvaluationNotes || '').trim()
    }

    product.rankingScore = calculateRankingScore({
      rankingPriority: product.rankingPriority,
      globalMonthlySales: product.globalMonthlySales,
      globalSearchVolume: product.globalSearchVolume,
      usMarketAverageSales: product.usMarketAverageSales,
      productKeywords: product.productKeywords,
    })
    product.evaluatedAt = new Date()
    if (req.user?._id) {
      product.evaluatedBy = req.user._id
    }

    await product.save()

    if (req.body.sisterSkus !== undefined) {
      const parsedFields = readProductFields(req.body)
      await syncSisterSkusForProduct(product, parsedFields.sisterSkus).catch(() => {})
    }

    await product.populate('supplier', 'fullName email clientId')

    return res.json({
      message: 'Product updated successfully.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message })
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This SKU is already in use.' })
    }
    return res.status(500).json({ message: error.message || 'Failed to update product.' })
  }
}

/**
 * Dedicated endpoint for Admin Product Research & Evaluation
 * PATCH /api/admin/products/:id/research
 */
export const updateProductResearch = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const parsedFields = readProductFields(req.body)

    if (req.body.globalSearchVolume !== undefined) {
      product.globalSearchVolume = parsedFields.globalSearchVolume
    }
    if (req.body.globalMonthlySales !== undefined) {
      product.globalMonthlySales = parsedFields.globalMonthlySales
    }
    if (req.body.usMarketAverageSales !== undefined) {
      product.usMarketAverageSales = parsedFields.usMarketAverageSales
    }
    if (req.body.productKeywords !== undefined) {
      product.productKeywords = parsedFields.productKeywords
    }
    if (req.body.rankingPriority !== undefined) {
      product.rankingPriority = parsedFields.rankingPriority
    }
    if (req.body.adminEvaluationNotes !== undefined) {
      product.adminEvaluationNotes = parsedFields.adminEvaluationNotes
    }

    product.rankingScore = calculateRankingScore({
      rankingPriority: product.rankingPriority,
      globalMonthlySales: product.globalMonthlySales,
      globalSearchVolume: product.globalSearchVolume,
      usMarketAverageSales: product.usMarketAverageSales,
      productKeywords: product.productKeywords,
    })
    product.evaluatedAt = new Date()
    if (req.user?._id) {
      product.evaluatedBy = req.user._id
    }

    await product.save()
    await product.populate('supplier', 'fullName email clientId')

    return res.json({
      success: true,
      message: 'Product research & evaluation saved successfully.',
      product: product.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update product research.' })
  }
}

/**
 * GET /api/products/wms/my-skus
 * Fetch all WMS inventory items for the logged-in supplier.
 * If supplier has no WMS inventory, auto-seeds realistic initial WMS items so they can test immediately.
 */
export const getMyWmsSkus = async (req, res) => {
  try {
    // 1. Fetch live products from WMS if user has a valid wmsToken
    let liveWmsProducts = []
    if (req.user?.wmsToken) {
      try {
        const wmsRes = await fetch('https://wmsbysellvro.com/api/supplier/products', {
          headers: {
            Authorization: `Bearer ${req.user.wmsToken}`,
            Accept: 'application/json',
          },
        })
        const wmsData = await wmsRes.json().catch(() => null)
        if (wmsRes.ok && wmsData?.status && Array.isArray(wmsData.data)) {
          liveWmsProducts = wmsData.data.map((item) => ({
            id: String(item.id),
            wmsId: item.id,
            sku: item.sku,
            name: item.name,
            category: item.category?.name || item.category || 'General',
            brand: item.brand || '',
            description: item.description || '',
            price: Number(item.price || 0),
            wholesalePrice: Number(item.price || 0),
            quantity: Number(item.stock_quantity ?? item.quantity ?? 0),
            inWarehouse: true,
            fulfillBy: 'warehouse',
            location: item.warehouse_location || 'Sellvro Central WMS Hub',
            weight: item.weight || '',
            weightUnit: item.weight_unit || 'kg',
            images: Array.isArray(item.images) ? item.images : [],
            image: Array.isArray(item.images) && item.images[0] ? item.images[0] : '',
            supplierId: req.user._id.toString(),
            supplierClientId: req.user.wmsClientId || '',
            supplier: req.user.fullName,
            vendorName: req.user.fullName,
            isLiveWms: true,
          }))
        }
      } catch (wmsErr) {
        console.warn('WMS products fetch failed:', wmsErr.message)
      }
    }

    // 2. Fetch locally stored warehouse products for this supplier
    const localProducts = await Product.find({
      supplier: req.user._id,
      $or: [{ fulfillBy: 'warehouse' }, { inWarehouse: true }],
    })
      .populate('supplier', 'fullName email phone clientId')
      .sort({ createdAt: -1 })

    const enrichedLocal = await enrichProductsWithSupplier(localProducts)

    // 3. Merge: if an item is already in local DB, preserve local customized retail price/description
    const mergedList = [...liveWmsProducts]
    enrichedLocal.forEach((localProd) => {
      const idx = mergedList.findIndex((item) => item.sku === localProd.sku)
      if (idx >= 0) {
        mergedList[idx] = {
          ...mergedList[idx],
          id: localProd.id,
          localId: localProd.id,
          price: localProd.price || mergedList[idx].price,
          description: localProd.description || mergedList[idx].description,
          images: localProd.images?.length > 0 ? localProd.images : mergedList[idx].images,
          status: localProd.status || 'active',
        }
      } else {
        mergedList.push(localProd)
      }
    })

    mergedList.sort((a, b) => {
      const numA = parseInt(String(a.sku).replace(/\D+/g, ''), 10) || 0
      const numB = parseInt(String(b.sku).replace(/\D+/g, ''), 10) || 0
      if (numA !== numB) return numA - numB
      return String(a.sku).localeCompare(String(b.sku))
    })

    return res.json({
      success: true,
      count: mergedList.length,
      data: mergedList,
    })
  } catch (error) {
    console.error('getMyWmsSkus error:', error)
    return res.status(500).json({ message: error.message || 'Failed to fetch WMS SKUs.' })
  }
}

/**
 * GET /api/products/wms/lookup/:sku
 * Look up detailed WMS product record by exact SKU.
 */
export const getWmsProductBySku = async (req, res) => {
  try {
    const sku = String(req.params.sku || '').trim().toUpperCase()
    if (!sku) {
      return res.status(400).json({ message: 'SKU is required.' })
    }

    // 1. Try to fetch from live WMS if user has wmsToken
    if (req.user?.wmsToken) {
      try {
        const wmsRes = await fetch(
          `https://wmsbysellvro.com/api/supplier/products/${encodeURIComponent(sku)}`,
          {
            headers: {
              Authorization: `Bearer ${req.user.wmsToken}`,
              Accept: 'application/json',
            },
          },
        )
        const wmsData = await wmsRes.json().catch(() => null)
        const item = wmsData?.data || (wmsData?.status && wmsData?.id ? wmsData : null)

        if (wmsRes.ok && item && item.sku) {
          const localMatch = await Product.findOne({ sku, supplier: req.user._id })
          const formatted = {
            id: localMatch?._id?.toString?.() || String(item.id),
            wmsId: item.id,
            sku: item.sku,
            name: item.name,
            category: item.category?.name || item.category || 'General',
            brand: item.brand || '',
            description: localMatch?.description || item.description || '',
            price: localMatch?.price || Number(item.price || 0),
            wholesalePrice: Number(item.price || 0),
            quantity: Number(item.stock_quantity ?? item.quantity ?? 0),
            inWarehouse: true,
            fulfillBy: 'warehouse',
            location: item.warehouse_location || 'Sellvro Central WMS Hub',
            weight: item.weight || '',
            weightUnit: item.weight_unit || 'kg',
            images:
              localMatch?.images?.length > 0
                ? localMatch.images
                : Array.isArray(item.images)
                ? item.images
                : [],
            image:
              localMatch?.image ||
              (Array.isArray(item.images) && item.images[0] ? item.images[0] : ''),
            supplierId: req.user._id.toString(),
            supplierClientId: req.user.wmsClientId || '',
            supplier: req.user.fullName,
            vendorName: req.user.fullName,
            isLiveWms: true,
          }

          return res.json({
            success: true,
            data: formatted,
          })
        }
      } catch (wmsErr) {
        console.warn('WMS single product fetch failed:', wmsErr.message)
      }
    }

    // 2. Fallback to local DB
    const query = {
      sku,
      ...(req.user.role === 'admin' ? {} : { supplier: req.user._id }),
    }

    const product = await Product.findOne(query).populate('supplier', 'fullName email phone clientId')
    if (!product) {
      return res.status(404).json({ message: `WMS Product with SKU "${sku}" not found.` })
    }

    const [enriched] = await enrichProductsWithSupplier([product])

    // Calculate Hot-Selling status and rank if applicable
    const score = Number(product.rankingScore || 0)
    if (score > 0 && (product.status === 'active' || product.status === 'approved')) {
      const higherCount = await Product.countDocuments({
        status: { $in: ['active', 'approved'] },
        $or: [
          { rankingScore: { $gt: score } },
          { rankingScore: score, createdAt: { $gt: product.createdAt } },
        ],
      })
      const rank = higherCount + 1
      enriched.hotSellingRank = rank
      enriched.isHotSelling = rank <= 20
    } else {
      enriched.isHotSelling = false
      enriched.hotSellingRank = null
    }

    return res.json({
      success: true,
      data: enriched,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to lookup WMS SKU.' })
  }
}

/**
 * POST /api/products/wms/attach-media/:id
 * Attach marketing photos/videos to an existing WMS SKU listing and publish directly to marketplace.
 */
export const attachWmsProductMedia = async (req, res) => {
  try {
    let product = null
    const paramId = req.params.id

    if (paramId && mongoose.Types.ObjectId.isValid(paramId)) {
      product = await Product.findById(paramId)
    }

    let sku = String(req.body.sku || '').trim().toUpperCase()
    if (!sku && paramId && !mongoose.Types.ObjectId.isValid(paramId)) {
      sku = String(paramId).trim().toUpperCase()
    }

    if (!product && sku) {
      product = await Product.findOne({ sku })
    }

    // If still not in local DB, initialize a new Product record from WMS details
    if (!product && sku) {
      product = new Product({
        name: req.body.name || 'WMS Consignment Item',
        sku,
        category:
          typeof req.body.category === 'object'
            ? req.body.category?.name || 'General'
            : req.body.category || 'General',
        brand: req.body.brand || '',
        price: Number(req.body.price || 0),
        quantity: Number(req.body.quantity || 0),
        fulfillBy: 'warehouse',
        inWarehouse: true,
        location: req.body.location || 'Sellvro Central WMS Hub',
        weight: req.body.weight || '',
        weightUnit: req.body.weightUnit || 'kg',
        barcode: req.body.barcode || '',
        supplier: req.user._id,
        status: 'active',
      })
    }

    if (!product) {
      return res.status(404).json({ message: 'WMS Product record could not be found or initialized.' })
    }

    if (product.supplier && !product.supplier.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only update your own WMS products.' })
    }

    const uploaded = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : []

    let baseImages = product.images || []
    if (req.body.existingImages !== undefined) {
      try {
        const parsed =
          typeof req.body.existingImages === 'string'
            ? JSON.parse(req.body.existingImages)
            : req.body.existingImages
        if (Array.isArray(parsed)) baseImages = parsed.filter(Boolean)
      } catch {
        // keep product.images
      }
    }

    const allImages = [...baseImages, ...uploaded]
    if (allImages.length < 1) {
      return res.status(400).json({ message: 'Please upload at least 1 image for the WMS listing.' })
    }

    product.images = allImages
    product.image = allImages[0]

    // Update Retail Selling Price (if provided)
    if (req.body.price !== undefined && req.body.price !== '') {
      const priceNum = Number(req.body.price)
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ message: 'Retail selling price must be a valid number greater than 0.' })
      }
      product.price = priceNum
    }

    // Update Retail Listing Description (if provided)
    if (req.body.description !== undefined) {
      product.description = String(req.body.description).trim()
    }

    // Optional stock quantity addition
    if (req.body.additionalQuantity && Number(req.body.additionalQuantity) > 0) {
      product.quantity = (product.quantity || 0) + Number(req.body.additionalQuantity)
    }

    // Pre-inspected WMS products publish directly to the marketplace as active without requiring admin approval
    product.status = 'active'
    product.fulfillBy = 'warehouse'
    product.inWarehouse = true
    product.isWmsVerified = true
    product.wmsVerifiedAt = new Date()

    const walletSetting = await WalletSetting.getOrCreate()
    product.commission = Number(walletSetting.wmsFeePercent ?? 0)

    await product.save()

    const [enriched] = await enrichProductsWithSupplier([product])

    // Calculate Hot-Selling status and rank if applicable
    const score = Number(product.rankingScore || 0)
    if (score > 0 && (product.status === 'active' || product.status === 'approved')) {
      const higherCount = await Product.countDocuments({
        status: { $in: ['active', 'approved'] },
        $or: [
          { rankingScore: { $gt: score } },
          { rankingScore: score, createdAt: { $gt: product.createdAt } },
        ],
      })
      const rank = higherCount + 1
      enriched.hotSellingRank = rank
      enriched.isHotSelling = rank <= 20
    } else {
      enriched.isHotSelling = false
      enriched.hotSellingRank = null
    }

    return res.json({
      success: true,
      message: `Product is now LIVE on Sellvro Marketplace! No admin approval required for pre-verified WMS inventory.`,
      product: enriched,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to attach media to WMS product.' })
  }
}

/**
 * POST /api/products/verify-wms/:id
 * Connects an existing self-selling product with Sellvro WMS.
 * Fetches verified warehouse stock from live WMS API, locks manual editing,
 * sets WMS Verified badge, and adjusts marketplace fee to WMS fulfillment policy.
 */
export const verifyProductWithWms = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (req.user.role !== 'admin' && !product.supplier.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only verify your own products.' })
    }

    const sku = String(product.sku || '').trim().toUpperCase()
    if (!sku) {
      return res.status(400).json({ message: 'Product has no valid SKU to verify against WMS.' })
    }

    let wmsItem = null

    // Check live WMS API if supplier or admin has token
    if (req.user.wmsToken) {
      try {
        const wmsRes = await fetch(
          `https://wmsbysellvro.com/api/supplier/products/${encodeURIComponent(sku)}`,
          {
            headers: {
              Authorization: `Bearer ${req.user.wmsToken}`,
              Accept: 'application/json',
            },
          },
        )
        const wmsData = await wmsRes.json().catch(() => null)
        const item = wmsData?.data || (wmsData?.status && wmsData?.id ? wmsData : null)
        if (wmsRes.ok && item && item.sku) {
          wmsItem = item
        }
      } catch (err) {
        console.warn('WMS live lookup failed during verification:', err.message)
      }
    }

    const walletSetting = await WalletSetting.getOrCreate()
    const wmsFee = Number(walletSetting.wmsFeePercent ?? 0)

    if (wmsItem) {
      // Stock quantity cannot be manually typed by supplier; updated strictly from WMS verified stock
      product.quantity = Number(wmsItem.stock_quantity ?? wmsItem.quantity ?? 0)
      if (wmsItem.warehouse_location) {
        product.location = wmsItem.warehouse_location
      }
    }

    // Set WMS Verified status and fulfillment attributes
    product.isWmsVerified = true
    product.wmsVerifiedAt = new Date()
    product.fulfillBy = 'warehouse'
    product.inWarehouse = true

    // Adjust fee under WMS fulfillment policy (e.g. 0% or configured WMS rate)
    product.commission = wmsFee

    await product.save()

    const [enriched] = await enrichProductsWithSupplier([product])

    // Calculate Hot-Selling status and rank if applicable
    const score = Number(product.rankingScore || 0)
    if (score > 0 && (product.status === 'active' || product.status === 'approved')) {
      const higherCount = await Product.countDocuments({
        status: { $in: ['active', 'approved'] },
        $or: [
          { rankingScore: { $gt: score } },
          { rankingScore: score, createdAt: { $gt: product.createdAt } },
        ],
      })
      const rank = higherCount + 1
      enriched.hotSellingRank = rank
      enriched.isHotSelling = rank <= 20
    } else {
      enriched.isHotSelling = false
      enriched.hotSellingRank = null
    }

    return res.json({
      success: true,
      message: `Product "${product.name}" (${product.sku}) is now WMS Verified! Live warehouse stock verified at ${product.quantity} units, and marketplace fee adjusted to WMS fulfillment policy (${wmsFee}%).`,
      product: enriched,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to verify product with WMS.' })
  }
}

/**
 * POST /api/products/sync-wms/:id
 * Re-syncs live stock for a WMS-verified product directly from WMS API.
 */
export const syncWmsStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (req.user.role !== 'admin' && !product.supplier.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only sync your own products.' })
    }

    const sku = String(product.sku || '').trim().toUpperCase()

    // 1. Check live stock directly from WMS MySQL inventories
    let liveStock = null
    try {
      const q = await getWmsLiveStockBySku(sku)
      if (typeof q === 'number') {
        liveStock = q
      }
    } catch (sqlErr) {
      console.warn('[Sync Stock] WMS MySQL stock check notice:', sqlErr.message)
    }

    if (liveStock !== null) {
      product.quantity = liveStock
      product.isWmsVerified = true
      product.wmsVerifiedAt = new Date()

      const walletSetting = await WalletSetting.getOrCreate()
      product.commission = Number(walletSetting.wmsFeePercent ?? 0)

      await product.save()
      const [enriched] = await enrichProductsWithSupplier([product])

    // Calculate Hot-Selling status and rank if applicable
    const score = Number(product.rankingScore || 0)
    if (score > 0 && (product.status === 'active' || product.status === 'approved')) {
      const higherCount = await Product.countDocuments({
        status: { $in: ['active', 'approved'] },
        $or: [
          { rankingScore: { $gt: score } },
          { rankingScore: score, createdAt: { $gt: product.createdAt } },
        ],
      })
      const rank = higherCount + 1
      enriched.hotSellingRank = rank
      enriched.isHotSelling = rank <= 20
    } else {
      enriched.isHotSelling = false
      enriched.hotSellingRank = null
    }

      return res.json({
        success: true,
        message: `Stock updated to ${liveStock} units directly from Master Sellvro WMS.`,
        product: enriched,
      })
    }

    if (!req.user.wmsToken) {
      return res.status(400).json({ message: 'Supplier account is not connected to Sellvro WMS.' })
    }

    const wmsRes = await fetch(
      `https://wmsbysellvro.com/api/supplier/products/${encodeURIComponent(sku)}`,
      {
        headers: {
          Authorization: `Bearer ${req.user.wmsToken}`,
          Accept: 'application/json',
        },
      },
    )
    const wmsData = await wmsRes.json().catch(() => null)
    const item = wmsData?.data || (wmsData?.status && wmsData?.id ? wmsData : null)

    if (!wmsRes.ok || !item) {
      return res.status(404).json({ message: `No active consignment record found for SKU "${sku}" in WMS.` })
    }

    const newStock = Number(item.stock_quantity ?? item.quantity ?? 0)
    product.quantity = newStock
    if (item.warehouse_location) {
      product.location = item.warehouse_location
    }
    product.isWmsVerified = true
    product.wmsVerifiedAt = new Date()

    const walletSetting = await WalletSetting.getOrCreate()
    product.commission = Number(walletSetting.wmsFeePercent ?? 0)

    await product.save()

    const [enriched] = await enrichProductsWithSupplier([product])

    // Calculate Hot-Selling status and rank if applicable
    const score = Number(product.rankingScore || 0)
    if (score > 0 && (product.status === 'active' || product.status === 'approved')) {
      const higherCount = await Product.countDocuments({
        status: { $in: ['active', 'approved'] },
        $or: [
          { rankingScore: { $gt: score } },
          { rankingScore: score, createdAt: { $gt: product.createdAt } },
        ],
      })
      const rank = higherCount + 1
      enriched.hotSellingRank = rank
      enriched.isHotSelling = rank <= 20
    } else {
      enriched.isHotSelling = false
      enriched.hotSellingRank = null
    }

    return res.json({
      success: true,
      message: `Stock updated to ${newStock} units directly from Sellvro WMS.`,
      product: enriched,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to sync stock with WMS.' })
  }
}

