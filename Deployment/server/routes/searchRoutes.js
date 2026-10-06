import { Router } from 'express'
import { protect, attachAdminPermissions } from '../middleware/auth.js'
import { universalSearch } from '../controllers/searchController.js'

const router = Router()

router.use(protect, attachAdminPermissions)

router.get('/', universalSearch)

export default router
