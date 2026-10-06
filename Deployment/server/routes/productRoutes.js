import { Router } from 'express'
import {
  createProduct,
  listMyProducts,
  listApprovedProducts,
  updateMyProduct,
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

router.get('/', protect, authorize('user', 'admin'), listApprovedProducts)
router.get('/mine', protect, authorize('supplier'), requireApproved, listMyProducts)
router.post('/', protect, authorize('supplier'), requireApproved, handlePhotos, createProduct)
router.patch('/:id', protect, authorize('supplier'), requireApproved, handlePhotos, updateMyProduct)

export default router
