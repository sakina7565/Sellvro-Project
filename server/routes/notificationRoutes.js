import { Router } from 'express'
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)

router.get('/', listMyNotifications)
router.patch('/read-all', markAllNotificationsRead)
router.patch('/:id/read', markNotificationRead)

export default router
