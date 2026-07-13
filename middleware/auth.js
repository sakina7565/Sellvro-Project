import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized. Please log in.' })
    }

    const token = header.split(' ')[1]
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
