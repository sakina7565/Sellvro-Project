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
import {
  protect,
  authorize,
  attachAdminPermissions,
  requirePermission,
} from '../middleware/auth.js'

const router = Router()

// Business Categories (Must be defined before /:id routes)
router.get('/business', listBusinessCategories)
router.post(
  '/business',
  protect,
  authorize('admin'),
  attachAdminPermissions,
  requirePermission('admin.categories.manage'),
  createBusinessCategory,
)
router.patch(
  '/business/:id',
  protect,
  authorize('admin'),
  attachAdminPermissions,
  requirePermission('admin.categories.manage'),
  updateBusinessCategory,
)
router.delete(
  '/business/:id',
  protect,
  authorize('admin'),
  attachAdminPermissions,
  requirePermission('admin.categories.manage'),
  deleteBusinessCategory,
)

// Product Categories
router.get('/', listCategories)
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
