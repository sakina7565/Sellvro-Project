import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Role from '../models/Role.js'
import { readAuthToken } from '../utils/authCookie.js'
import {
  ALL_PERMISSION_KEYS,
  hasAnyPermission,
  sanitizePermissions,
} from '../constants/permissions.js'

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

export const protect = async (req, res, next) => {
  try {
    const token = readAuthToken(req)
    if (!token) {
      return res.status(401).json({ message: 'Not authorized. Please log in.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' })
    }

    req.user = user
    return next()
  } catch {
    return res.status(401).json({ message: 'Not authorized. Token invalid or expired.' })
  }
}

export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource.' })
    }
    return next()
  }

export const requireApproved = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.status !== 'approved') {
    return res.status(403).json({
      message: 'Your account is not approved yet.',
      status: req.user.status,
    })
  }
  return next()
}

export async function attachAdminPermissions(req, _res, next) {
  try {
    if (req.user?.role !== 'admin') {
      req.adminPermissions = []
      return next()
    }

    if (!req.user.adminRoleId) {
      req.adminPermissions = ALL_PERMISSION_KEYS
      req.isSuperAdmin = true
      return next()
    }

    const role = await Role.findById(req.user.adminRoleId)
    req.adminPermissions = sanitizePermissions(role?.permissions || [])
    req.adminRoleName = role?.name || null
    req.isSuperAdmin = false
    return next()
  } catch (error) {
    return next(error)
  }
}

export const requirePermission =
  (...permissions) =>
  (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have access to this resource.' })
    }

    if (!req.user.adminRoleId) {
      return next()
    }

    if (!hasAnyPermission(req.adminPermissions, permissions)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' })
    }

    return next()
  }

export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'You do not have access to this resource.' })
  }

  if (req.user.adminRoleId) {
    return res.status(403).json({ message: 'Access restricted to Super Admin only.' })
  }

  return next()
}

