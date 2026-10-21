import { Router } from 'express'
import {
  createProduct,
  listMyProducts,
  listApprovedProducts,
  updateMyProduct,
  getProductById,
  getMyWmsSkus,
  getWmsProductBySku,
  attachWmsProductMedia,
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

router.get('/', protect, authorize('user', 'admin'), listApprovedProducts)
router.get('/mine', protect, authorize('supplier'), requireApproved, listMyProducts)
router.get('/:id', protect, getProductById)
router.post('/', protect, authorize('supplier'), requireApproved, handlePhotos, createProduct)
router.patch('/:id', protect, authorize('supplier'), requireApproved, handlePhotos, updateMyProduct)

export default router
