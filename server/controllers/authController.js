import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Role from '../models/Role.js'
import { signToken } from '../middleware/auth.js'
import {
  clearAuthCookie,
  setAuthCookie,
  clearImpersonatorCookie,
  readImpersonatorToken,
} from '../utils/authCookie.js'
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

