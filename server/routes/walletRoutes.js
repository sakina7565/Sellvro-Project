import { Router } from 'express'
import {
  getBalance,
  createWalletRequest,
  listMyWalletRequests,
  listAllWalletRequests,
  approveWalletRequest,
  rejectWalletRequest,
} from '../controllers/walletController.js'
import { protect, authorize, requireApproved } from '../middleware/auth.js'
import { productUpload } from '../middleware/upload.js'

const router = Router()

function handleReceipt(req, res, next) {
  productUpload.single('receipt')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Receipt upload failed.' })
    }
    return next()
  })
}

router.get('/balance', protect, authorize('user', 'admin'), getBalance)
router.get('/requests/mine', protect, authorize('user'), requireApproved, listMyWalletRequests)
router.post(
  '/requests',
  protect,
  authorize('user'),
  requireApproved,
  handleReceipt,
  createWalletRequest,
)

router.get('/requests', protect, authorize('admin'), listAllWalletRequests)
router.patch('/requests/:id/approve', protect, authorize('admin'), approveWalletRequest)
router.patch('/requests/:id/reject', protect, authorize('admin'), rejectWalletRequest)

export default router
