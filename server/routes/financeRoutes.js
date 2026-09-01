import { Router } from 'express'
import { getSupplierFinance } from '../controllers/payoutController.js'
import { getSupplierDashboardStats } from '../controllers/dashboardController.js'
import { protect, authorize, requireApproved } from '../middleware/auth.js'

const router = Router()

router.get('/', protect, authorize('supplier'), requireApproved, getSupplierFinance)
router.get(
  '/dashboard/stats',
  protect,
  authorize('supplier'),
  requireApproved,
  getSupplierDashboardStats,
)

export default router
