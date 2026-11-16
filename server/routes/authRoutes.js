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
  forgotPassword,
  verifyResetCode,
  resetPassword,
  googleAuth,
  changePassword,
} from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { authLimiter } from '../middleware/authLimiter.js'
import { productUpload } from '../middleware/upload.js'

const uploadIdCard = (req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return productUpload.single('idCard')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload failed.' })
      }
      next()
    })
  }
  next()
}

const router = Router()

router.post('/register', authLimiter, uploadIdCard, register)
router.post('/login', authLimiter, login)
router.post('/admin/register', authLimiter, adminRegister)
router.post('/admin/login', authLimiter, adminLogin)
router.get('/roles', getPublicRoles)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.post('/switch-back', switchBack)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/verify-code', authLimiter, verifyResetCode)
router.post('/reset-password', authLimiter, resetPassword)
router.post('/google', googleAuth)
router.patch('/change-password', protect, changePassword)

export default router

