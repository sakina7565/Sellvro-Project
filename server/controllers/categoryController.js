import mongoose from 'mongoose'
import Category from '../models/Category.js'
import Product from '../models/Product.js'

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

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' })
    }

    const existing = await Category.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'A category with this name already exists.' })
    }

    const category = await Category.create({ name, description })
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
    await category.save()

    if (oldName !== name) {
      await Product.updateMany({ category: oldName }, { $set: { category: name } })
    }

    const productCount = await Product.countDocuments({ category: category.name })
    return res.json({
      message: 'Category updated.',
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
