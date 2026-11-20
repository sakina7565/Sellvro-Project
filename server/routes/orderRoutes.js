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
  cancelOrder,
  requestOrderCancellation,
  approveOrderCancellation,
  rejectOrderCancellation,
  updateUserOrderTracking,
  getOrderShippingLabel,
  parseOrderLabel,
  reviewSupplierOrder,
} from '../controllers/orderController.js'
import { getUserDashboardStats } from '../controllers/dashboardController.js'
import { submitOrderReview, getPendingReviewOrders } from '../controllers/reviewController.js'
import {
  protect,
  optionalProtect,
  authorize,
  requireApproved,
  attachAdminPermissions,
  requirePermission,
} from '../middleware/auth.js'
import { productUpload } from '../middleware/upload.js'
import { requireWmsSecret } from '../middleware/wmsSecret.js'

const router = Router()

// Admins changing orders need the sales permission; buyers/suppliers are ownership-checked in the handlers.
const adminNeedsSalesManage = [
  attachAdminPermissions,
  (req, res, next) =>
    req.user?.role === 'admin' ? requirePermission('admin.sales.manage')(req, res, next) : next(),
]

function handleShippingLabel(req, res, next) {
  productUpload.single('shippingLabel')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Shipping label upload failed.' })
    }
    return next()
  })
}

function handleLabelParsingUpload(req, res, next) {
  productUpload.single('labelFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Label upload failed.' })
    }
    return next()
  })
}

// Public Tracking Lookup (no login required)
router.get('/public-track/:ref', getPublicOrderTracking)
router.get('/label/:ref', getOrderShippingLabel)
router.get('/:id/shipping-label', getOrderShippingLabel)
router.post('/parse-label', protect, handleLabelParsingUpload, parseOrderLabel)

router.post('/', optionalProtect, handleShippingLabel, createOrder)
router.get('/mine', protect, authorize('user', 'admin'), requireApproved, listMyOrders)
router.get('/pending-review', protect, authorize('user', 'admin'), requireApproved, getPendingReviewOrders)
router.post('/:id/review', protect, authorize('user', 'admin'), requireApproved, submitOrderReview)
router.get('/lookup', optionalProtect, lookupOrder)
router.get('/dashboard/stats', protect, authorize('user', 'admin'), requireApproved, getUserDashboardStats)
router.get('/supplier', protect, authorize('supplier'), requireApproved, listSupplierOrders)
router.get('/', protect, authorize('admin'), listAllOrders)

// WMS Live Direct Integration Endpoints
router.get('/wms/live-list', protect, authorize('supplier', 'admin'), requireApproved, listLiveWmsOrders)
router.get('/wms/supplier/:clientId', requireWmsSecret, getWmsSupplierOrders)
router.post('/wms/update-dispatch', requireWmsSecret, updateWmsOrderDispatch)

router.get('/:id/track-wms', protect, authorize('user', 'supplier', 'admin'), trackWmsOrder)
router.post('/:id/cancel', protect, authorize('user', 'supplier', 'admin'), requireApproved, ...adminNeedsSalesManage, cancelOrder)
router.post('/:id/supplier-review', protect, authorize('supplier', 'admin'), requireApproved, ...adminNeedsSalesManage, reviewSupplierOrder)
router.post('/:id/request-cancel', protect, authorize('user', 'supplier', 'admin'), requireApproved, requestOrderCancellation)
router.post('/:id/approve-cancel', protect, authorize('admin'), ...adminNeedsSalesManage, approveOrderCancellation)
router.post('/:id/reject-cancel', protect, authorize('admin'), ...adminNeedsSalesManage, rejectOrderCancellation)
router.patch('/:id/user-tracking', protect, authorize('user', 'supplier', 'admin'), requireApproved, ...adminNeedsSalesManage, updateUserOrderTracking)
router.patch('/:id/status', protect, authorize('admin', 'supplier'), requireApproved, ...adminNeedsSalesManage, updateOrderStatus)
router.patch('/:id/tracking', protect, authorize('admin', 'supplier'), requireApproved, ...adminNeedsSalesManage, updateOrderTracking)
router.post('/:id/push-wms', protect, authorize('admin', 'supplier'), requireApproved, ...adminNeedsSalesManage, pushOrderToWmsManual)

export default router
