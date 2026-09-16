import { Router } from 'express'
import {
  register,
  login,
  getMe,
  logout,
  adminRegister,
  adminLogin,
  getPublicRoles,
  switchBack,
} from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { authLimiter } from '../middleware/authLimiter.js'

const router = Router()

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/admin/register', authLimiter, adminRegister)
router.post('/admin/login', authLimiter, adminLogin)
router.get('/roles', getPublicRoles)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.post('/switch-back', switchBack)

export default router

