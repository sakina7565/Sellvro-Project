import { Router } from 'express'
import {
  createOrder,
  listMyOrders,
  listSupplierOrders,
  listAllOrders,
  lookupOrder,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { getUserDashboardStats } from '../controllers/dashboardController.js'
import { protect, authorize, requireApproved } from '../middleware/auth.js'

const router = Router()

router.post('/', protect, authorize('user'), requireApproved, createOrder)
router.get('/mine', protect, authorize('user'), requireApproved, listMyOrders)
router.get('/lookup', protect, authorize('user', 'supplier', 'admin'), lookupOrder)
router.get('/dashboard/stats', protect, authorize('user'), requireApproved, getUserDashboardStats)
router.get('/supplier', protect, authorize('supplier'), requireApproved, listSupplierOrders)
router.get('/', protect, authorize('admin'), listAllOrders)
router.patch('/:id/status', protect, authorize('admin', 'supplier'), updateOrderStatus)

export default router
