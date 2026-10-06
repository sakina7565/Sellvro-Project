import { Router } from 'express'
import { getMyBusiness, submitBusinessDetails } from '../controllers/businessController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = Router()

router.use(protect, authorize('supplier', 'user'))
router.get('/me', getMyBusiness)
router.post('/submit', submitBusinessDetails)

export default router
