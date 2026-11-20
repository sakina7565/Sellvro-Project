import { Router } from 'express'
import { getMyBusiness, submitBusinessDetails, verifyCnicNumber } from '../controllers/businessController.js'
import { protect, optionalProtect, authorize } from '../middleware/auth.js'
import { productUpload } from '../middleware/upload.js'

const router = Router()

router.post('/verify-cnic', optionalProtect, verifyCnicNumber)
router.use(protect, authorize('supplier', 'user', 'admin'))
router.get('/me', getMyBusiness)
router.post('/submit', productUpload.single('idCard'), submitBusinessDetails)

export default router

