import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import User from '../models/User.js'
import Product from '../models/Product.js'
import BusinessProfile from '../models/BusinessProfile.js'
import {
  findWmsUserByEmail,
  registerWmsSupplier,
  saveWmsSupplierBusinessDetails,
  checkWmsSkuExists,
  createWmsProduct,
} from '../services/wmsSqlService.js'
import { checkMySQLConnection } from '../config/mysql.js'

/**
 * Migration & Sync Utility:
 * Synchronizes existing MongoDB suppliers and products into Master WMS MySQL.
 * Can be safely run multiple times without duplicating data or causing collisions.
 */
export async function runSyncMongoToWms() {
  console.log('--- STARTING MONGO TO WMS MYSQL DATA SYNCHRONIZATION ---')

  const mysqlOk = await checkMySQLConnection()
  if (!mysqlOk) {
    console.warn('[Sync] Master WMS MySQL database is currently unreachable. Sync skipped.')
    return { success: false, reason: 'MySQL unavailable' }
  }

  // 1. Sync Suppliers
  const suppliers = await User.find({ role: 'supplier' })
  console.log(`[Sync] Found ${suppliers.length} supplier accounts in MongoDB.`)

  let suppliersSynced = 0
  for (const supplier of suppliers) {
    try {
      let wmsUser = await findWmsUserByEmail(supplier.email)
      if (!wmsUser) {
        console.log(`[Sync] Registering supplier "${supplier.fullName}" (${supplier.email}) in WMS MySQL...`)
        wmsUser = await registerWmsSupplier({
          name: supplier.fullName,
          email: supplier.email,
          password: 'Password@123', // placeholder if raw password cannot be extracted
        })
      }

      if (wmsUser) {
        supplier.wmsSupplierId = wmsUser.id
        supplier.wmsClientId = wmsUser.user_unique_name || supplier.wmsClientId || ''
        supplier.isWmsRegistered = true
        supplier.wmsStatus = wmsUser.status || supplier.status || 'approved'
        await supplier.save()

        // Sync Business Profile
        const profile = await BusinessProfile.findOne({ user: supplier._id })
        if (profile) {
          await saveWmsSupplierBusinessDetails(wmsUser.id, {
            businessName: profile.businessName || supplier.fullName,
            businessDescription: profile.businessDescription || '',
            phone: profile.businessPhone || supplier.phone || '',
            businessEmail: profile.businessEmail || supplier.email,
            address: profile.businessAddress || '',
            country: profile.country || 'Pakistan',
            city: profile.city || '',
            orderType: profile.orderType || 'B2B Wholesale',
            paymentMethod: profile.paymentProvider || 'Bank Transfer',
            accountNumber: profile.accNumber || '',
          })
        }
        suppliersSynced += 1
      }
    } catch (err) {
      console.warn(`[Sync] Error syncing supplier ${supplier.email}:`, err.message)
    }
  }

  // 2. Sync Products
  const products = await Product.find().populate('supplier')
  console.log(`[Sync] Found ${products.length} products in MongoDB.`)

  let productsSynced = 0
  for (const product of products) {
    try {
      const sku = String(product.sku || '').trim().toUpperCase()
      if (!sku) continue

      const existsInWms = await checkWmsSkuExists(sku)
      if (!existsInWms) {
        const supplierWmsId = product.supplier?.wmsSupplierId || 1
        console.log(`[Sync] Migrating product "${product.name}" (${sku}) to WMS MySQL...`)

        const created = await createWmsProduct({
          supplierId: supplierWmsId,
          name: product.name,
          sku,
          image: product.image || (product.images && product.images[0]) || '',
          description: product.description || '',
          weight: Number(product.weight || 0),
          weightUnit: product.weightUnit || 'gm',
          length: Number(product.length || 0),
          width: Number(product.width || 0),
          height: Number(product.height || 0),
          dimensionUnit: product.dimensionUnit || 'cm',
          brand: product.brand || '',
          inWarehouse: Boolean(product.inWarehouse || product.fulfillBy === 'warehouse'),
          fulfillBy: product.fulfillBy === 'warehouse' ? 'wms' : 'client',
          status: product.status === 'active' || product.status === 'approved' ? 'approved' : 'pending',
        })

        if (created) {
          product.wmsProductId = created.id
          await product.save()
          productsSynced += 1
        }
      } else {
        productsSynced += 1
      }
    } catch (err) {
      console.warn(`[Sync] Error syncing product ${product.sku}:`, err.message)
    }
  }

  console.log('--- SYNCHRONIZATION COMPLETE ---')
  console.log(`Summary: Suppliers Synced: ${suppliersSynced}, Products Synced: ${productsSynced}`)

  return {
    success: true,
    suppliersSynced,
    productsSynced,
  }
}

// Direct CLI execution support
if (process.argv[1]?.includes('syncMongoToWms.js')) {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sellvro'
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log('Connected to MongoDB. Running sync...')
      await runSyncMongoToWms()
      await mongoose.disconnect()
      process.exit(0)
    })
    .catch((err) => {
      console.error('Mongo connection error:', err)
      process.exit(1)
    })
}

