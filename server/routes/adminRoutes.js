import { Router } from 'express'
import {
  listPendingSuppliers,
  listPendingUsers,
  listApprovedSuppliers,
  listApprovedUsers,
  approveAccount,
  rejectAccount,
} from '../controllers/adminController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = Router()

router.use(protect, authorize('admin'))

router.get('/suppliers/pending', listPendingSuppliers)
router.get('/suppliers', listApprovedSuppliers)
router.get('/users/pending', listPendingUsers)
router.get('/users', listApprovedUsers)
router.patch('/accounts/:id/approve', approveAccount)
router.patch('/accounts/:id/reject', rejectAccount)

export default router
