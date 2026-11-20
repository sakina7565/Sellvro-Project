import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import User from '../models/User.js'
import {
  updateMyProduct,
  activateProduct,
  deactivateProduct,
  calculateRankingScore,
} from '../controllers/productController.js'

describe('Supplier Product Management & Editing', () => {
  const supplierAId = new mongoose.Types.ObjectId()
  const supplierBId = new mongoose.Types.ObjectId()
  let testProduct

  before(async () => {
    // Create an in-memory/mock Product for testing controller methods
    testProduct = new Product({
      _id: new mongoose.Types.ObjectId(),
      name: 'Leather Work Belt',
      sku: 'SVRO-TEST-001',
      category: 'Apparel & Accessories',
      subcategory: 'Belts',
      brand: 'Rustic',
      description: 'Original leather belt',
      price: 35.0,
      quantity: 50,
      stockAlert: 10,
      stockExpiry: '2027-12-31',
      supplier: supplierAId,
      status: 'active',
      customizationAvailable: true,
      customizationInstructions: 'Engrave initials on buckle',
      sisterSkus: ['SVRO-TEST-002', 'SVRO-TEST-003'],
      sisterVariationType: 'Color',
      globalSearchVolume: 12000,
      globalMonthlySales: 4500,
      usMarketAverageSales: 2100,
      productKeywords: ['leather', 'belt', 'formal', 'mens', 'accessory'],
      rankingPriority: 'high',
      rankingScore: 10000000,
      images: ['/uploads/photo1.jpg', '/uploads/photo2.jpg'],
    })
  })

  test('calculateRankingScore computes high priority tier with research metrics', () => {
    const score = calculateRankingScore({
      rankingPriority: 'high',
      globalMonthlySales: 4500,
      usMarketAverageSales: 2100,
      globalSearchVolume: 12000,
      productKeywords: ['leather', 'belt', 'formal', 'mens', 'accessory'],
    })
    // 10,000,000 + 4500*100 (450,000) + 2100*150 (315,000) + 12000*1 (12,000) + 5*500 (2,500) = 10,779,500
    assert.equal(score, 10779500)
  })

  test('Product model toSafeObject exposes all creation, research, and customization fields', () => {
    const safe = testProduct.toSafeObject()
    assert.equal(safe.name, 'Leather Work Belt')
    assert.equal(safe.sku, 'SVRO-TEST-001')
    assert.equal(safe.category, 'Apparel & Accessories')
    assert.equal(safe.subcategory, 'Belts')
    assert.equal(safe.stockAlert, 10)
    assert.equal(safe.stockExpiry, '2027-12-31')
    assert.equal(safe.customizationAvailable, true)
    assert.equal(safe.customizationInstructions, 'Engrave initials on buckle')
    assert.deepEqual(safe.sisterSkus, ['SVRO-TEST-002', 'SVRO-TEST-003'])
    assert.equal(safe.sisterVariationType, 'Color')
    assert.equal(safe.globalSearchVolume, 12000)
    assert.equal(safe.globalMonthlySales, 4500)
    assert.equal(safe.usMarketAverageSales, 2100)
    assert.equal(safe.rankingPriority, 'high')
    assert.equal(safe.rankingScore, 10000000)
    assert.equal(safe.productKeywords.length, 5)
  })

  test('activateProduct rejects unauthorized caller attempting to activate another supplier product', async () => {
    const req = {
      params: { id: testProduct._id.toString() },
      user: { _id: supplierBId, role: 'supplier' }, // Supplier B, not the owner
    }
    let statusSent = null
    let jsonSent = null
    const res = {
      status(s) {
        statusSent = s
        return this
      },
      json(j) {
        jsonSent = j
        return this
      },
    }

    // Mock Product.findById
    const origFindById = Product.findById
    Product.findById = () => ({
      populate: () => Promise.resolve(testProduct),
    })

    try {
      await activateProduct(req, res)
      assert.equal(statusSent, 403)
      assert.match(jsonSent.message, /only activate your own products/i)
    } finally {
      Product.findById = origFindById
    }
  })

  test('deactivateProduct rejects unauthorized caller attempting to deactivate another supplier product', async () => {
    const req = {
      params: { id: testProduct._id.toString() },
      user: { _id: supplierBId, role: 'supplier' }, // Supplier B
    }
    let statusSent = null
    let jsonSent = null
    const res = {
      status(s) {
        statusSent = s
        return this
      },
      json(j) {
        jsonSent = j
        return this
      },
    }

    const origFindById = Product.findById
    Product.findById = () => ({
      populate: () => Promise.resolve(testProduct),
    })

    try {
      await deactivateProduct(req, res)
      assert.equal(statusSent, 403)
      assert.match(jsonSent.message, /only deactivate your own products/i)
    } finally {
      Product.findById = origFindById
    }
  })
})
