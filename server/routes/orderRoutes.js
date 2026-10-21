import { Router } from 'express'
import {
  createOrder,
  listMyOrders,
  listSupplierOrders,
  listAllOrders,
  lookupOrder,
  updateOrderStatus,
  updateOrderTracking,
} from '../controllers/orderController.js'
import { getUserDashboardStats } from '../controllers/dashboardController.js'
import { protect, authorize, requireApproved } from '../middleware/auth.js'
import { productUpload } from '../middleware/upload.js'

const router = Router()

function handleShippingLabel(req, res, next) {
  productUpload.single('shippingLabel')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Shipping label upload failed.' })
    }
    return next()
  })
}

router.post('/', protect, authorize('user'), requireApproved, handleShippingLabel, createOrder)
router.get('/mine', protect, authorize('user'), requireApproved, listMyOrders)
router.get('/lookup', protect, authorize('user', 'supplier', 'admin'), lookupOrder)
router.get('/dashboard/stats', protect, authorize('user'), requireApproved, getUserDashboardStats)
router.get('/supplier', protect, authorize('supplier'), requireApproved, listSupplierOrders)
router.get('/', protect, authorize('admin'), listAllOrders)
router.patch('/:id/status', protect, authorize('admin', 'supplier'), updateOrderStatus)
router.patch('/:id/tracking', protect, authorize('admin', 'supplier'), updateOrderTracking)

export default router
