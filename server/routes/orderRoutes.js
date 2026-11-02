import { Router } from 'express'
import {
  createOrder,
  listMyOrders,
  listSupplierOrders,
  listAllOrders,
  lookupOrder,
  updateOrderStatus,
  updateOrderTracking,
  pushOrderToWmsManual,
  trackWmsOrder,
  listLiveWmsOrders,
  getWmsSupplierOrders,
  updateWmsOrderDispatch,
  getPublicOrderTracking,
} from '../controllers/orderController.js'
import { getUserDashboardStats } from '../controllers/dashboardController.js'
import { submitOrderReview, getPendingReviewOrders } from '../controllers/reviewController.js'
import { protect, optionalProtect, authorize, requireApproved } from '../middleware/auth.js'
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

// Public Tracking Lookup (no login required)
router.get('/public-track/:ref', getPublicOrderTracking)

router.post('/', optionalProtect, handleShippingLabel, createOrder)
router.get('/mine', protect, authorize('user', 'admin'), listMyOrders)
router.get('/pending-review', protect, authorize('user', 'admin'), getPendingReviewOrders)
router.post('/:id/review', protect, authorize('user', 'admin'), submitOrderReview)
router.get('/lookup', optionalProtect, lookupOrder)
router.get('/dashboard/stats', protect, authorize('user', 'admin'), getUserDashboardStats)
router.get('/supplier', protect, authorize('supplier'), requireApproved, listSupplierOrders)
router.get('/', protect, authorize('admin'), listAllOrders)

// WMS Live Direct Integration Endpoints
router.get('/wms/live-list', protect, authorize('supplier', 'admin'), listLiveWmsOrders)
router.get('/wms/supplier/:clientId', getWmsSupplierOrders)
router.post('/wms/update-dispatch', updateWmsOrderDispatch)

router.get('/:id/track-wms', protect, authorize('user', 'supplier', 'admin'), trackWmsOrder)
router.patch('/:id/status', protect, authorize('admin', 'supplier'), updateOrderStatus)
router.patch('/:id/tracking', protect, authorize('admin', 'supplier'), updateOrderTracking)
router.post('/:id/push-wms', protect, authorize('admin', 'supplier'), pushOrderToWmsManual)

export default router
