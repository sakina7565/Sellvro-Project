import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import {
  calculateRankingScore,
  updateProductResearch,
} from '../controllers/productController.js'

mongoose.set('bufferCommands', false)

const restores = []
function stub(obj, key, fn) {
  restores.push([obj, key, obj[key]])
  obj[key] = fn
}
afterEach(() => {
  while (restores.length) {
    const [obj, key, original] = restores.pop()
    obj[key] = original
  }
})

function fakeRes() {
  const res = { statusCode: 200, body: undefined }
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    res.body = body
    return res
  }
  return res
}

test('Product Research: calculateRankingScore ranks priority tiers correctly', () => {
  const highTier = calculateRankingScore({
    rankingPriority: 'high',
    globalMonthlySales: 100,
    globalSearchVolume: 5000,
    usMarketAverageSales: 50,
    productKeywords: ['belt', 'leather'],
  })

  const mediumTier = calculateRankingScore({
    rankingPriority: 'medium',
    globalMonthlySales: 2000,
    globalSearchVolume: 100000,
    usMarketAverageSales: 1500,
    productKeywords: ['belt', 'leather', 'brown', 'men', 'buckle'],
  })

  const lowTier = calculateRankingScore({
    rankingPriority: 'low',
    globalMonthlySales: 500,
    globalSearchVolume: 10000,
    usMarketAverageSales: 200,
    productKeywords: ['belt'],
  })

  const standardTier = calculateRankingScore({
    rankingPriority: 'standard',
    globalMonthlySales: 1000,
    globalSearchVolume: 20000,
    usMarketAverageSales: 400,
  })

  // High tier > Medium tier > Low tier > Standard
  assert.ok(highTier > mediumTier, 'High priority must score higher than medium priority')
  assert.ok(mediumTier > lowTier, 'Medium priority must score higher than low priority')
  assert.ok(lowTier > standardTier, 'Low priority must score higher than unranked standard')
})

test('Product Research: within same priority tier, higher sales and volume yield higher score', () => {
  const productA = calculateRankingScore({
    rankingPriority: 'high',
    globalMonthlySales: 5000,
    globalSearchVolume: 80000,
    usMarketAverageSales: 3000,
    productKeywords: ['shoe', 'running'],
  })

  const productB = calculateRankingScore({
    rankingPriority: 'high',
    globalMonthlySales: 1000,
    globalSearchVolume: 10000,
    usMarketAverageSales: 500,
    productKeywords: ['shoe'],
  })

  assert.ok(productA > productB, 'Product A with higher sales/search metrics must rank higher than Product B within high priority')
})

test('Product Research: updateProductResearch updates all 4 fields, 5 keywords and calculates rank', async () => {
  const dummyProduct = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Leather Belt',
    sku: 'SVRO-00101',
    globalSearchVolume: 0,
    globalMonthlySales: 0,
    usMarketAverageSales: 0,
    productKeywords: [],
    rankingPriority: 'standard',
    rankingScore: 0,
    save: async function () {},
    populate: async function () {},
    toSafeObject: function () {
      return {
        id: this._id.toString(),
        sku: this.sku,
        globalSearchVolume: this.globalSearchVolume,
        globalMonthlySales: this.globalMonthlySales,
        usMarketAverageSales: this.usMarketAverageSales,
        productKeywords: this.productKeywords,
        rankingPriority: this.rankingPriority,
        rankingScore: this.rankingScore,
        adminEvaluationNotes: this.adminEvaluationNotes,
      }
    },
  }

  stub(Product, 'findById', async () => dummyProduct)

  const req = {
    params: { id: dummyProduct._id.toString() },
    user: { _id: new mongoose.Types.ObjectId() },
    body: {
      globalSearchVolume: 75000,
      globalMonthlySales: 4200,
      usMarketAverageSales: 2100,
      productKeywords: ['leather belt', 'men fashion', 'formal belt', 'brown leather', 'brass buckle', 'extra-keyword-ignored'],
      rankingPriority: 'high',
      adminEvaluationNotes: 'High Q4 demand verified across Amazon US and TikTok Shop.',
    },
  }
  const res = fakeRes()

  await updateProductResearch(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(dummyProduct.globalSearchVolume, 75000)
  assert.equal(dummyProduct.globalMonthlySales, 4200)
  assert.equal(dummyProduct.usMarketAverageSales, 2100)
  assert.equal(dummyProduct.rankingPriority, 'high')
  // Keywords capped at 5
  assert.equal(dummyProduct.productKeywords.length, 5)
  assert.deepEqual(dummyProduct.productKeywords, [
    'leather belt',
    'men fashion',
    'formal belt',
    'brown leather',
    'brass buckle',
  ])
  assert.ok(dummyProduct.rankingScore > 10000000, 'Score must reflect high priority weight + research numbers')
  assert.ok(dummyProduct.evaluatedAt instanceof Date)
  assert.equal(dummyProduct.evaluatedBy.toString(), req.user._id.toString())
})
