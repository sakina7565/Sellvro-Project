import { Router } from 'express'

import {

  listPendingSuppliers,

  listPendingUsers,

  listApprovedSuppliers,

  listApprovedUsers,

  listAdminUsers,

  createAdminUser,

  approveAccount,

  rejectAccount,

  changeAdminPassword,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  listAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  impersonateAccount,
} from '../controllers/adminController.js'

import {
  listAllProducts,
  approveProduct,
  rejectProduct,
  activateProduct,
  deactivateProduct,
  createAdminProduct,
} from '../controllers/productController.js'

import {

  createCategory,

  updateCategory,

  deleteCategory,

  listCategories,

} from '../controllers/categoryController.js'

import { listAllOrders } from '../controllers/orderController.js'

import {

  listAllWalletRequests,

  approveWalletRequest,

  rejectWalletRequest,

} from '../controllers/walletController.js'

import { listAdminPayouts, processSupplierPayout } from '../controllers/payoutController.js'

import {

  listSupplierDisputes,

  listUserComplaints,

  listAllDisputes,

  getDispute,

  addDisputeMessage,

  resolveDispute,

  rejectDispute,

  markDisputeRead,

  getUnreadDisputeCount,

} from '../controllers/disputeController.js'

import {

  listRoles,

  createRole,

  updateRole,

  deleteRole,

  listPermissions,

} from '../controllers/roleController.js'

import { getAdminDashboardStats } from '../controllers/dashboardController.js'

import { protect, authorize, attachAdminPermissions, requirePermission, requireSuperAdmin } from '../middleware/auth.js'
import { productUpload } from '../middleware/upload.js'

const router = Router()

function handleProductPhotos(req, res, next) {
  productUpload.array('photos', 6)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Photo upload failed.' })
    }
    return next()
  })
}



router.use(protect, authorize('admin'), attachAdminPermissions)



router.get('/dashboard/stats', requirePermission('admin.dashboard.view'), getAdminDashboardStats)



router.get('/permissions', requireSuperAdmin, listPermissions)

router.get('/roles', requireSuperAdmin, listRoles)

router.get('/admins', requireSuperAdmin, listAdminUsers)

router.post('/admins', requireSuperAdmin, createAdminUser)

router.post('/roles', requireSuperAdmin, createRole)

router.patch('/roles/:id', requireSuperAdmin, updateRole)

router.delete('/roles/:id', requireSuperAdmin, deleteRole)



router.get('/suppliers/pending', requirePermission('admin.suppliers.pending'), listPendingSuppliers)

router.get('/suppliers', requirePermission('admin.suppliers.view'), listApprovedSuppliers)

router.get('/users/pending', requirePermission('admin.users.pending'), listPendingUsers)

router.get('/users', requirePermission('admin.users.view'), listApprovedUsers)

router.patch(

  '/accounts/:id/approve',

  requirePermission('admin.suppliers.approve', 'admin.users.approve'),

  approveAccount,

)

router.patch(

  '/accounts/:id/reject',

  requirePermission('admin.suppliers.approve', 'admin.users.approve'),

  rejectAccount,

)



router.get('/products', requirePermission('admin.products.view'), listAllProducts)

router.post(
  '/products',
  requirePermission('admin.products.create'),
  handleProductPhotos,
  createAdminProduct,
)

router.patch('/products/:id/approve', requirePermission('admin.products.approve'), approveProduct)

router.patch('/products/:id/reject', requirePermission('admin.products.approve'), rejectProduct)

router.patch('/products/:id/activate', requirePermission('admin.products.approve'), activateProduct)

router.patch('/products/:id/deactivate', requirePermission('admin.products.approve'), deactivateProduct)



router.get('/categories', requirePermission('admin.categories.view'), listCategories)

router.post('/categories', requirePermission('admin.categories.manage'), createCategory)

router.patch('/categories/:id', requirePermission('admin.categories.manage'), updateCategory)

router.delete('/categories/:id', requirePermission('admin.categories.manage'), deleteCategory)



router.get('/orders', requirePermission('admin.sales.view'), listAllOrders)



router.get('/wallet-requests', requirePermission('admin.wallets.view'), listAllWalletRequests)

router.patch(

  '/wallet-requests/:id/approve',

  requirePermission('admin.wallets.approve'),

  approveWalletRequest,

)

router.patch(

  '/wallet-requests/:id/reject',

  requirePermission('admin.wallets.approve'),

  rejectWalletRequest,

)



router.get('/payouts', requirePermission('admin.payouts.view'), listAdminPayouts)

router.patch('/payouts/:supplierId/process', requirePermission('admin.payouts.process'), processSupplierPayout)



router.get('/disputes/unread-count', requirePermission('admin.disputes.supplier', 'admin.disputes.user'), getUnreadDisputeCount)

router.get('/disputes', requirePermission('admin.disputes.supplier', 'admin.disputes.user'), listAllDisputes)

router.get('/disputes/supplier', requirePermission('admin.disputes.supplier'), listSupplierDisputes)

router.get('/disputes/user', requirePermission('admin.disputes.user'), listUserComplaints)

router.get(
  '/disputes/:id',
  requirePermission('admin.disputes.supplier', 'admin.disputes.user'),
  getDispute,
)

router.post(
  '/disputes/:id/messages',
  requirePermission('admin.disputes.supplier', 'admin.disputes.user'),
  addDisputeMessage,
)

router.patch(
  '/disputes/:id/resolve',
  requirePermission('admin.disputes.resolve', 'admin.disputes.supplier', 'admin.disputes.user'),
  resolveDispute,
)

router.patch(
  '/disputes/:id/reject',
  requirePermission('admin.disputes.resolve', 'admin.disputes.supplier', 'admin.disputes.user'),
  rejectDispute,
)

router.patch(
  '/disputes/:id/read',
  requirePermission('admin.disputes.supplier', 'admin.disputes.user'),
  markDisputeRead,
)

router.patch('/change-password', changeAdminPassword)
router.get('/notifications', requireSuperAdmin, listAdminNotifications)
router.patch('/notifications/read-all', requireSuperAdmin, markAllAdminNotificationsRead)
router.patch('/notifications/:id/read', requireSuperAdmin, markAdminNotificationRead)

router.get(
  '/accounts',
  requirePermission('admin.suppliers.view', 'admin.users.view'),
  listAllAccounts,
)
router.post(
  '/accounts',
  requirePermission('admin.suppliers.approve', 'admin.users.approve'),
  createAccount,
)
router.patch(
  '/accounts/:id',
  requirePermission('admin.suppliers.approve', 'admin.users.approve'),
  updateAccount,
)
router.delete(
  '/accounts/:id',
  requirePermission('admin.suppliers.approve', 'admin.users.approve'),
  deleteAccount,
)
router.post(
  '/impersonate/:id',
  requirePermission('admin.suppliers.view', 'admin.users.view'),
  impersonateAccount,
)

export default router


