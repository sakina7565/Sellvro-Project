import { Router } from 'express'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listBusinessCategories,
  createBusinessCategory,
  updateBusinessCategory,
  deleteBusinessCategory,
} from '../controllers/categoryController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = Router()

// Business Categories (Must be defined before /:id routes)
router.get('/business', listBusinessCategories)
router.post('/business', protect, authorize('admin'), createBusinessCategory)
router.patch('/business/:id', protect, authorize('admin'), updateBusinessCategory)
router.delete('/business/:id', protect, authorize('admin'), deleteBusinessCategory)

// Product Categories
router.get('/', listCategories)
router.post('/', protect, authorize('admin'), createCategory)
router.patch('/:id', protect, authorize('admin'), updateCategory)
router.delete('/:id', protect, authorize('admin'), deleteCategory)

export default router
