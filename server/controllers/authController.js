import User from '../models/User.js'
import { signToken } from '../middleware/auth.js'

const getHomePath = (user) => {
  if (user.role === 'admin') return '/admin/dashboard'
  if (user.role === 'supplier') {
    return user.status === 'approved' ? '/supplier/dashboard' : '/supplier/business/details'
  }
  if (user.role === 'user') {
    return user.status === 'approved' ? '/user/dashboard' : '/user/business/detail'
  }
  return '/'
}

export const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role } = req.body

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    if (!['admin', 'supplier', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected.' })
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
    const safeUser = user.toSafeObject()

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
    const safeUser = user.toSafeObject()

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
  return res.json({
    user: req.user.toSafeObject(),
    redirectTo: getHomePath(req.user.toSafeObject()),
  })
}
