import { Router } from 'express'
import {
  createDispute,
  listMyDisputes,
  getDispute,
  addDisputeMessage,
  markDisputeRead,
  getUnreadDisputeCount,
} from '../controllers/disputeController.js'
import { protect, authorize, requireApproved } from '../middleware/auth.js'

const router = Router()

router.post('/', protect, authorize('user', 'supplier', 'admin'), requireApproved, createDispute)
router.get('/unread-count', protect, authorize('user', 'supplier', 'admin'), requireApproved, getUnreadDisputeCount)
router.get('/mine', protect, authorize('user', 'supplier'), requireApproved, listMyDisputes)
router.get('/:id', protect, authorize('user', 'supplier', 'admin'), requireApproved, getDispute)
router.post('/:id/messages', protect, authorize('user', 'supplier', 'admin'), requireApproved, addDisputeMessage)
router.patch('/:id/read', protect, authorize('user', 'supplier', 'admin'), requireApproved, markDisputeRead)

export default router
