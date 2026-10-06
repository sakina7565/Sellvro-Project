import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Role from '../models/Role.js'
import BusinessProfile from '../models/BusinessProfile.js'
import { signToken } from '../middleware/auth.js'
import {
  clearAuthCookie,
  setAuthCookie,
  clearImpersonatorCookie,
  readImpersonatorToken,
} from '../utils/authCookie.js'
import { sendPasswordResetEmail } from '../utils/emailService.js'
import {
  ALL_PERMISSION_KEYS,
  sanitizePermissions,
  ADMIN_ROUTE_PERMISSIONS,
  hasPermission,
} from '../constants/permissions.js'

const getHomePath = (user) => {
  if (user.role === 'admin') {
    if (!user.adminRoleId || hasPermission(user.permissions, 'admin.dashboard.view')) {
      return '/admin/dashboard'
    }
    const firstAllowed = Object.keys(ADMIN_ROUTE_PERMISSIONS).find((path) =>
      hasPermission(user.permissions, ADMIN_ROUTE_PERMISSIONS[path]),
    )
    return firstAllowed || '/admin/dashboard'
  }
  if (user.role === 'supplier') {
    return user.status === 'approved' ? '/supplier/dashboard' : '/supplier/business/details'
  }
  if (user.role === 'user') {
    return user.status === 'approved' ? '/user/dashboard' : '/user/business/detail'
  }
  return '/'
}

async function buildSafeUser(user) {
  if (user.role !== 'admin') {
    return user.toSafeObject()
  }

  if (!user.adminRoleId) {
    return user.toSafeObject({ permissions: ALL_PERMISSION_KEYS })
  }

  const role = await Role.findById(user.adminRoleId)
  const permissions = sanitizePermissions(role?.permissions || [])
  const safeUser = user.toSafeObject({
    permissions,
    adminRoleName: role?.name || null,
  })
  return safeUser
}

export const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role } = req.body

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    if (role === 'admin') {
      return res.status(400).json({
        message: 'Admin registration is not allowed here. Please use the Admin Portal registration page.',
      })
    }

    if (!['supplier', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected. Only Supplier and User are permitted.' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    const status = role === 'admin' ? 'approved' : 'pending_details'

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      status,
    })

    const token = signToken(user._id)
    setAuthCookie(res, token)
    const safeUser = await buildSafeUser(user)

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: safeUser,
      redirectTo: getHomePath(safeUser),
    })
  } catch (error) {
    console.error('Register error:', error)

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map((item) => ({
        field: item.path,
        message: item.message,
      }))
      return res.status(400).json({
        message: errors[0]?.message || 'Validation failed.',
        errors,
      })
    }

    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    return res.status(500).json({ message: error.message || 'Registration failed.' })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' })
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Your account application was rejected.' })
    }

    const token = signToken(user._id)
    setAuthCookie(res, token)
    const safeUser = await buildSafeUser(user)

    return res.json({
      message: 'Login successful.',
      token,
      user: safeUser,
      redirectTo: getHomePath(safeUser),
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: error.message || 'Login failed.' })
  }
}

export const getMe = async (req, res) => {
  const safeUser = await buildSafeUser(req.user)
  const impersonatorToken = readImpersonatorToken(req)
  let impersonatedBy = null

  if (impersonatorToken) {
    try {
      const decoded = jwt.verify(impersonatorToken, process.env.JWT_SECRET)
      const admin = await User.findById(decoded.id)
      if (admin && admin.role === 'admin' && admin.status !== 'suspended') {
        impersonatedBy = {
          id: admin._id.toString(),
          fullName: admin.fullName,
          email: admin.email,
        }
      }
    } catch {
      // Ignore expired/invalid impersonator tokens
    }
  }

  return res.json({
    user: {
      ...safeUser,
      impersonatedBy,
    },
    redirectTo: getHomePath(safeUser),
  })
}

export const logout = async (_req, res) => {
  clearAuthCookie(res)
  clearImpersonatorCookie(res)
  return res.json({ message: 'Logged out.' })
}

export const switchBack = async (req, res) => {
  try {
    const impersonatorToken = readImpersonatorToken(req)
    if (!impersonatorToken) {
      return res.status(400).json({ message: 'No active impersonation session found.' })
    }

    const decoded = jwt.verify(impersonatorToken, process.env.JWT_SECRET)
    const admin = await User.findById(decoded.id)

    if (!admin || admin.role !== 'admin' || admin.status === 'suspended') {
      clearImpersonatorCookie(res)
      return res.status(403).json({ message: 'Original admin account is not available or suspended.' })
    }

    setAuthCookie(res, impersonatorToken)
    clearImpersonatorCookie(res)

    const safeAdmin = await buildSafeUser(admin)
    return res.json({
      message: 'Switched back to Admin successfully.',
      user: safeAdmin,
      redirectTo: '/admin/accounts',
    })
  } catch (error) {
    clearImpersonatorCookie(res)
    return res.status(401).json({ message: error.message || 'Failed to switch back to admin.' })
  }
}

export const adminRegister = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, adminType, adminRoleId } = req.body

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    let roleId = null
    if (adminType === 'subadmin' && adminRoleId) {
      const role = await Role.findById(adminRoleId)
      if (!role) {
        return res.status(400).json({ message: 'Selected sub-admin role not found.' })
      }
      roleId = role._id
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
      status: 'approved',
      adminRoleId: roleId,
    })

    const token = signToken(user._id)
    setAuthCookie(res, token)
    const safeUser = await buildSafeUser(user)

    return res.status(201).json({
      message: 'Admin account registered successfully.',
      token,
      user: safeUser,
      redirectTo: getHomePath(safeUser),
    })
  } catch (error) {
    console.error('Admin register error:', error)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }
    return res.status(500).json({ message: error.message || 'Admin registration failed.' })
  }
}

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: This login is restricted to administrators and staff members.',
      })
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your admin account has been suspended.' })
    }

    const token = signToken(user._id)
    setAuthCookie(res, token)
    const safeUser = await buildSafeUser(user)

    return res.json({
      message: 'Admin login successful.',
      token,
      user: safeUser,
      redirectTo: getHomePath(safeUser),
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return res.status(500).json({ message: error.message || 'Login failed.' })
  }
}

export const getPublicRoles = async (_req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 })
    return res.json({
      data: roles.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        description: r.description || '',
      })),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load roles.' })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Please enter your email address.' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+resetPasswordCode +resetPasswordExpires')
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' })
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    user.resetPasswordCode = code
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000) // 15 mins
    await user.save()

    await sendPasswordResetEmail(user.email, code, user.fullName)

    return res.json({
      message: 'A 6-digit verification code has been sent to your email.',
      email: user.email,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({ message: error.message || 'Failed to send recovery code.' })
  }
}

export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required.' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+resetPasswordCode +resetPasswordExpires')
    if (!user || !user.resetPasswordCode) {
      return res.status(400).json({ message: 'No reset request found. Please request a new code.' })
    }

    if (user.resetPasswordCode !== code.trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check and try again.' })
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' })
    }

    return res.json({ message: 'Code verified successfully.', valid: true })
  } catch (error) {
    console.error('Verify code error:', error)
    return res.status(500).json({ message: error.message || 'Failed to verify code.' })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +resetPasswordCode +resetPasswordExpires')
    if (!user || !user.resetPasswordCode) {
      return res.status(400).json({ message: 'No reset request found. Please request a new code.' })
    }

    if (user.resetPasswordCode !== code.trim()) {
      return res.status(400).json({ message: 'Invalid verification code.' })
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' })
    }

    user.password = newPassword
    user.resetPasswordCode = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    const token = signToken(user._id)
    setAuthCookie(res, token)
    const safeUser = await buildSafeUser(user)

    return res.json({
      message: 'Your password has been changed successfully.',
      token,
      user: safeUser,
      redirectTo: getHomePath(safeUser),
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ message: error.message || 'Failed to reset password.' })
  }
}

export const googleAuth = async (req, res) => {
  try {
    const { credential, role = 'user', email, name, googleId, picture } = req.body

    let userEmail = email
    let userName = name
    let userGoogleId = googleId

    if (credential) {
      try {
        const decoded = jwt.decode(credential)
        if (decoded?.email) {
          userEmail = decoded.email
          userName = decoded.name || decoded.given_name || userEmail.split('@')[0]
          userGoogleId = decoded.sub
        }
      } catch (e) {
        console.error('Google token decode error:', e)
      }
    }

    if (!userEmail) {
      return res.status(400).json({ message: 'Could not obtain email address from Google.' })
    }

    userEmail = userEmail.toLowerCase().trim()
    let user = await User.findOne({ email: userEmail })

    if (user) {
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended.' })
      }
      if (user.status === 'rejected') {
        return res.status(403).json({ message: 'Your account application was rejected.' })
      }
      if (!user.googleId && userGoogleId) {
        user.googleId = userGoogleId
        await user.save()
      }
    } else {
      const selectedRole = ['supplier', 'user'].includes(role) ? role : 'user'
      const status = selectedRole === 'supplier' ? 'pending_details' : 'approved'

      const randomPassword = 'G_' + Math.random().toString(36).slice(2) + '!9X'
      user = await User.create({
        fullName: userName || userEmail.split('@')[0],
        email: userEmail,
        password: randomPassword,
        role: selectedRole,
        status,
        googleId: userGoogleId || undefined,
      })

      await BusinessProfile.create({
        user: user._id,
        profileType: selectedRole,
        businessName: user.fullName,
        businessEmail: userEmail,
        status: status === 'approved' ? 'approved' : 'pending',
      })
    }

    const token = signToken(user._id)
    setAuthCookie(res, token)
    const safeUser = await buildSafeUser(user)

    return res.json({
      message: 'Logged in with Google successfully.',
      token,
      user: safeUser,
      redirectTo: getHomePath(safeUser),
    })
  } catch (error) {
    console.error('Google auth error:', error)
    return res.status(500).json({ message: error.message || 'Google sign in failed.' })
  }
}


