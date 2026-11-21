import mongoose from 'mongoose'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import BusinessCategory from '../models/BusinessCategory.js'

const DEFAULT_BUSINESS_CATEGORIES = [
  { name: 'Mechanical & Automotive Parts', description: 'Engine components, spare parts, and industrial equipment' },
  { name: 'Shoes & Footwear', description: 'Casual, formal, athletic, and specialty footwear' },
  { name: 'Textiles & Apparel', description: 'Fabrics, ready-made garments, fashion, and accessories' },
  { name: 'Consumer Electronics & Gadgets', description: 'Mobile accessories, computing, smart devices, and hardware' },
  { name: 'Beauty, Health & Personal Care', description: 'Cosmetics, skincare, hygiene, and wellness products' },
  { name: 'Home, Kitchen & Furniture', description: 'Home decor, cookware, appliances, and furniture' },
  { name: 'General Wholesale & Retail', description: 'Multi-category trading, FMCG, and assorted retail products' },
]

export const listBusinessCategories = async (req, res) => {
  try {
    let count = await BusinessCategory.countDocuments()
    if (count === 0) {
      await BusinessCategory.insertMany(DEFAULT_BUSINESS_CATEGORIES)
    }

    const filter = req.query.all === 'true' ? {} : { isActive: true }
    const items = await BusinessCategory.find(filter).sort({ name: 1 })
    return res.json({
      data: items.map((c) => c.toSafeObject()),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load business categories.' })
  }
}

export const createBusinessCategory = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const description = String(req.body.description || '').trim()

    if (!name) {
      return res.status(400).json({ message: 'Business category name is required.' })
    }

    const existing = await BusinessCategory.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'A business category with this name already exists.' })
    }

    const created = await BusinessCategory.create({ name, description, isActive: true })
    return res.status(201).json({
      message: 'Business category created successfully.',
      category: created.toSafeObject(),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A business category with this name already exists.' })
    }
    return res.status(500).json({ message: error.message || 'Failed to create business category.' })
  }
}

export const updateBusinessCategory = async (req, res) => {
  try {
    const item = await BusinessCategory.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Business category not found.' })
    }

    const name = req.body.name !== undefined ? String(req.body.name).trim() : item.name
    const description = req.body.description !== undefined ? String(req.body.description).trim() : item.description
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : item.isActive

    if (!name) {
      return res.status(400).json({ message: 'Business category name cannot be empty.' })
    }

    const duplicate = await BusinessCategory.findOne({
      _id: { $ne: item._id },
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    })
    if (duplicate) {
      return res.status(400).json({ message: 'Another business category already has this name.' })
    }

    item.name = name
    item.description = description
    item.isActive = isActive
    await item.save()

    return res.json({
      message: 'Business category updated successfully.',
      category: item.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update business category.' })
  }
}

export const deleteBusinessCategory = async (req, res) => {
  try {
    const item = await BusinessCategory.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Business category not found.' })
    }

    await item.deleteOne()
    return res.json({ message: 'Business category deleted successfully.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete business category.' })
  }
}

export const listCategories = async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    const counts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])
    const countMap = Object.fromEntries(counts.map((row) => [row._id, row.count]))

    return res.json({
      data: categories.map((item) => item.toSafeObject(countMap[item.name] || 0)),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load categories.' })
  }
}

export const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const description = String(req.body.description || '').trim()
    const subcategories = parseSubcategories(req.body.subcategories)
    const commissionRate =
      req.body.commissionRate !== undefined && !Number.isNaN(Number(req.body.commissionRate))
        ? Math.max(0, Math.min(100, Number(req.body.commissionRate)))
        : 8

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' })
    }

    if (!subcategories || subcategories.length === 0) {
      return res.status(400).json({ message: 'At least one subcategory is required to create a category.' })
    }

    const existing = await Category.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'A category with this name already exists.' })
    }

    const category = await Category.create({ name, description, subcategories, commissionRate })
    return res.status(201).json({
      message: 'Category created.',
      category: category.toSafeObject(0),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A category with this name already exists.' })
    }
    return res.status(500).json({ message: error.message || 'Failed to create category.' })
  }
}

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' })
    }

    const name = String(req.body.name ?? category.name).trim()
    const description =
      req.body.description !== undefined
        ? String(req.body.description || '').trim()
        : category.description

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' })
    }

    const duplicate = await Category.findOne({
      _id: { $ne: category._id },
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    })
    if (duplicate) {
      return res.status(400).json({ message: 'A category with this name already exists.' })
    }

    const oldName = category.name
    category.name = name
    category.description = description

    let commissionUpdated = false
    if (req.body.commissionRate !== undefined && !Number.isNaN(Number(req.body.commissionRate))) {
      const parsedRate = Math.max(0, Math.min(100, Number(req.body.commissionRate)))
      if (category.commissionRate !== parsedRate) {
        category.commissionRate = parsedRate
        commissionUpdated = true
      }
    }

    if (req.body.subcategories !== undefined) {
      const parsed = parseSubcategories(req.body.subcategories)
      if (parsed.length === 0) {
        return res.status(400).json({ message: 'At least one subcategory is required.' })
      }
      category.subcategories = parsed
    }
    await category.save()

    // 1. Rename category on existing products if name changed
    if (oldName !== name) {
      await Product.updateMany({ category: oldName }, { $set: { category: name } })
    }

    // 2. Automatically propagate new category commission rate to all products in this category
    if (commissionUpdated) {
      await Product.updateMany(
        { category: category.name },
        { $set: { commission: category.commissionRate } },
      )
    }

    const productCount = await Product.countDocuments({ category: category.name })
    return res.json({
      message: commissionUpdated
        ? `Category updated! All products in "${category.name}" now automatically use ${category.commissionRate}% commission.`
        : 'Category updated.',
      category: category.toSafeObject(productCount),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update category.' })
  }
}

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' })
    }

    const productCount = await Product.countDocuments({ category: category.name })
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${productCount} product(s) still use this category.`,
      })
    }

    await category.deleteOne()
    return res.json({ message: 'Category deleted.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete category.' })
  }
}

/** Resolve category input (name or ObjectId) to a stored category name string. */
export async function resolveCategoryName(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  if (mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw) {
    const byId = await Category.findById(raw)
    if (byId) return byId.name
  }

  const byName = await Category.findOne({ name: new RegExp(`^${escapeRegex(raw)}$`, 'i') })
  return byName ? byName.name : null
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseSubcategories(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return [...new Set(input.map((s) => String(s).trim()).filter(Boolean))]
  }
  if (typeof input === 'string') {
    return [...new Set(input.split(',').map((s) => s.trim()).filter(Boolean))]
  }
  return []
}

