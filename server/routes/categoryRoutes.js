import { Router } from 'express'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js'
import {
  protect,
  authorize,
  attachAdminPermissions,
  requirePermission,
} from '../middleware/auth.js'

const router = Router()

router.get('/', protect, authorize('admin', 'supplier', 'user'), listCategories)
router.post(
  '/',
  protect,
  authorize('admin'),
  attachAdminPermissions,
  requirePermission('admin.categories.manage'),
  createCategory,
)
router.patch(
  '/:id',
  protect,
  authorize('admin'),
  attachAdminPermissions,
  requirePermission('admin.categories.manage'),
  updateCategory,
)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  attachAdminPermissions,
  requirePermission('admin.categories.manage'),
  deleteCategory,
)

export default router
