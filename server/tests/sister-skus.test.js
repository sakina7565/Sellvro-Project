import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { syncSisterSkusForProduct } from '../controllers/productController.js'

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

test('Sister SKUs: syncSisterSkusForProduct synchronizes connected products bi-directionally', async () => {
  const currentProduct = {
    sku: 'BELT-BRN-01',
    sisterSkus: [],
    sisterVariationType: 'Color',
    save: async () => {},
  }

  const updatedDocs = []
  stub(Product, 'updateOne', async (query, update) => {
    updatedDocs.push({ query, update })
    return { modifiedCount: 1 }
  })
  stub(Product, 'updateMany', async (query, update) => {
    updatedDocs.push({ query, update, isMany: true })
    return { modifiedCount: 1 }
  })

  // Product A connects to B and C
  await syncSisterSkusForProduct(currentProduct, ['BELT-BLK-02', 'BELT-BLU-03'])

  // Current product's sisterSkus should now have B and C
  assert.deepEqual(currentProduct.sisterSkus, ['BELT-BLK-02', 'BELT-BLU-03'])

  // Peer B should be updated with A and C
  const updateForB = updatedDocs.find((u) => u.query.sku === 'BELT-BLK-02')
  assert.ok(updateForB, 'Peer B should have received an update')
  assert.ok(updateForB.update.$addToSet.sisterSkus.$each.includes('BELT-BRN-01'))
  assert.ok(updateForB.update.$addToSet.sisterSkus.$each.includes('BELT-BLU-03'))

  // Peer C should be updated with A and B
  const updateForC = updatedDocs.find((u) => u.query.sku === 'BELT-BLU-03')
  assert.ok(updateForC, 'Peer C should have received an update')
  assert.ok(updateForC.update.$addToSet.sisterSkus.$each.includes('BELT-BRN-01'))
  assert.ok(updateForC.update.$addToSet.sisterSkus.$each.includes('BELT-BLK-02'))
})

test('Sister SKUs: removing a sister SKU pulls current product SKU from peer', async () => {
  const currentProduct = {
    sku: 'BELT-BRN-01',
    sisterSkus: ['BELT-BLK-02', 'BELT-BLU-03'],
    sisterVariationType: 'Color',
    save: async () => {},
  }

  const updatedManyDocs = []
  stub(Product, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(Product, 'updateMany', async (query, update) => {
    updatedManyDocs.push({ query, update })
    return { modifiedCount: 1 }
  })

  // Remove BELT-BLU-03 from Product A
  await syncSisterSkusForProduct(currentProduct, ['BELT-BLK-02'])

  // Product A's sisterSkus should only have B
  assert.deepEqual(currentProduct.sisterSkus, ['BELT-BLK-02'])

  // Product C (BELT-BLU-03) should have A pulled from its sisterSkus
  const pullForRemoved = updatedManyDocs.find((u) => u.update.$pull)
  assert.ok(pullForRemoved, 'updateMany with $pull should have been called')
  assert.deepEqual(pullForRemoved.query, { sku: { $in: ['BELT-BLU-03'] } })
  assert.deepEqual(pullForRemoved.update, { $pull: { sisterSkus: 'BELT-BRN-01' } })
})

test('Sister SKUs: self-SKU is prevented from being added to its own sisterSkus', async () => {
  const currentProduct = {
    sku: 'BELT-BRN-01',
    sisterSkus: [],
    sisterVariationType: 'Color',
    save: async () => {},
  }

  stub(Product, 'updateOne', async () => ({ modifiedCount: 1 }))
  stub(Product, 'updateMany', async () => ({ modifiedCount: 1 }))

  // Attempt to add self-SKU along with another SKU
  await syncSisterSkusForProduct(currentProduct, ['BELT-BRN-01', 'BELT-BLK-02'])

  assert.deepEqual(currentProduct.sisterSkus, ['BELT-BLK-02'])
})
