import { Router } from 'express'
import {
  createProduct,
  listMyProducts,
  listApprovedProducts,
  updateMyProduct,
  getProductById,
  toggleWatchProduct,
  getStoreDetails,
  getMyWmsSkus,
  getWmsProductBySku,
  attachWmsProductMedia,
  verifyProductWithWms,
  syncWmsStock,
} from '../controllers/productController.js'
import { protect, authorize, requireApproved } from '../middleware/auth.js'
import { productUpload } from '../middleware/upload.js'

const router = Router()

function handlePhotos(req, res, next) {
  productUpload.array('photos', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Photo upload failed.' })
    }
    return next()
  })
}

// Specific WMS routes (MUST be declared before /:id)
router.get('/wms/my-skus', protect, authorize('supplier'), requireApproved, getMyWmsSkus)
router.get('/wms/lookup/:sku', protect, authorize('supplier', 'admin'), requireApproved, getWmsProductBySku)
router.post('/wms/attach-media/:id', protect, authorize('supplier'), requireApproved, handlePhotos, attachWmsProductMedia)
router.post('/:id/verify-wms', protect, authorize('supplier', 'admin'), requireApproved, verifyProductWithWms)
router.post('/:id/sync-wms-stock', protect, authorize('supplier', 'admin'), requireApproved, syncWmsStock)

// Public marketplace catalog (active products)
router.get('/', listApprovedProducts)
router.get('/mine', protect, authorize('supplier'), requireApproved, listMyProducts)
router.get('/store/:supplierId', protect, getStoreDetails)
router.get('/:id', protect, getProductById)
router.post('/:id/watch', protect, toggleWatchProduct)
router.post('/', protect, authorize('supplier'), requireApproved, handlePhotos, createProduct)
router.patch('/:id', protect, authorize('supplier'), requireApproved, handlePhotos, updateMyProduct)

export default router
