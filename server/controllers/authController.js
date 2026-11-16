import {
  findWmsUserByEmail,
  registerWmsSupplier,
  verifyWmsSupplierCredentials,
} from '../services/wmsSqlService.js'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Role from '../models/Role.js'
import BusinessProfile from '../models/BusinessProfile.js'
import Review from '../models/Review.js'
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
    return user.status === 'approved' ? '/' : '/user/business/detail'
  }
  return '/'
}

const formatDbError = (error, fallback = 'Operation failed.') => {
  if (error?.message?.includes('buffering timed out') || error?.name === 'MongooseError') {
    return 'Database connection timed out. Please check your internet connection and verify MongoDB Atlas IP Whitelist (0.0.0.0/0).'
  }
  return error?.message || fallback
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
    const {
      fullName,
      email,
      password,
      confirmPassword,
      role,
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      registrationEntity,
      registrationNo,
      businessCategory,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerAddress,
      idCardNumber,
      bankName,
      accountHolderName,
      accountNumberOrIban,
      googleId,
    } = req.body

    const idCardUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.idCardUrl || req.body.idCard || '')

    if (role === 'admin') {
      return res.status(400).json({
        message: 'Admin registration is not allowed here. Please use the Admin Portal registration page.',
      })
    }

    if (!['supplier', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected. Only Supplier and User are permitted.' })
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Password and confirm password are required.' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    // Resolve effective name & login email
    const effectiveName = (ownerName || fullName || companyName)?.trim()
    const effectiveEmail = (ownerEmail || email || companyEmail)?.toLowerCase()?.trim()

    if (!effectiveName) {
      return res.status(400).json({ message: 'Owner Name is required.' })
    }

    if (!effectiveEmail) {
      return res.status(400).json({ message: 'Email address is required.' })
    }

    // Company & Owner validations for both Supplier and User
    if (!companyName?.trim()) {
      return res.status(400).json({ message: 'Name of Company is required.' })
    }
    if (!companyEmail?.trim()) {
      return res.status(400).json({ message: 'Email of Company is required.' })
    }
    if (!companyPhone?.trim()) {
      return res.status(400).json({ message: 'Official Phone Number is required.' })
    }
    if (!companyAddress?.trim()) {
      return res.status(400).json({ message: 'Address of Company is required.' })
    }
    if (!ownerPhone?.trim()) {
      return res.status(400).json({ message: 'Owner Phone is required.' })
    }
    if (!ownerAddress?.trim()) {
      return res.status(400).json({ message: 'Owner Address is required.' })
    }
    if (!bankName?.trim()) {
      return res.status(400).json({ message: 'Bank Name is required.' })
    }
    if (!accountHolderName?.trim()) {
      return res.status(400).json({ message: 'Account Holder Name is required.' })
    }
    if (!accountNumberOrIban?.trim()) {
      return res.status(400).json({ message: 'Account Number or IBAN is required.' })
    }
    if (!idCardUrl) {
      return res.status(400).json({ message: 'Please upload an ID Card for verification.' })
    }

    // ── CNIC Format & Duplicate Check ──
    if (idCardNumber) {
      const digits = String(idCardNumber).replace(/\D+/g, '')
      if (digits.length !== 13) {
        return res.status(400).json({
          message: 'Valid 13-digit Pakistani CNIC number (format: XXXXX-XXXXXXX-X) is required.',
        })
      }
      const province = parseInt(digits[0], 10)
      if (province < 1 || province > 7) {
        return res.status(400).json({
          message: 'Invalid CNIC province code. Pakistani CNIC must begin with 1 through 7.',
        })
      }
      const formattedCnic = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
      const existingCnic = await User.findOne({ idCardNumber: { $in: [formattedCnic, digits] } })
      if (existingCnic) {
        return res.status(400).json({
          message: `Ye CNIC number (${formattedCnic}) pehle se ek doosre account k sath registered hai. Ek CNIC se sirf ek hi account register ho sakta hai.`,
          isDuplicateCnic: true,
        })
      }
    }

    const existing = await User.findOne({ email: effectiveEmail })
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    // ── Unified Supplier Registration in Master WMS MySQL ──
    let wmsSupplier = null
    if (role === 'supplier') {
      try {
        const existingWmsUser = await findWmsUserByEmail(effectiveEmail)
        if (existingWmsUser) {
          wmsSupplier = existingWmsUser
        } else {
          wmsSupplier = await registerWmsSupplier({
            name: effectiveName,
            email: effectiveEmail,
            password,
            companyName: companyName?.trim() || effectiveName,
            companyEmail: (companyEmail || effectiveEmail)?.toLowerCase()?.trim(),
            companyPhone: companyPhone?.trim() || '',
            companyAddress: companyAddress?.trim() || '',
            registrationEntity: registrationEntity?.trim() || '',
            registrationNo: registrationNo?.trim() || '',
            ownerName: (ownerName || effectiveName)?.trim(),
            ownerEmail: (ownerEmail || effectiveEmail)?.toLowerCase()?.trim(),
            ownerPhone: ownerPhone?.trim() || '',
            ownerAddress: ownerAddress?.trim() || '',
            idCardUrl: idCardUrl || '',
          })
        }
      } catch (wmsErr) {
        console.warn('[Register] WMS MySQL registration notice:', wmsErr.message)
      }
    }

    // Both Suppliers and Users submit complete verification details upfront, so status is pending_approval
    const status = role === 'admin' ? 'approved' : 'pending_approval'

    const user = await User.create({
      fullName: effectiveName,
      email: effectiveEmail,
      password,
      role,
      status,
      companyName: companyName?.trim() || '',
      companyEmail: (companyEmail || effectiveEmail)?.toLowerCase()?.trim() || '',
      companyPhone: companyPhone?.trim() || '',
      companyAddress: companyAddress?.trim() || '',
      businessCategory: businessCategory?.trim() || '',
      registrationEntity: registrationEntity?.trim() || '',
      registrationNo: registrationNo?.trim() || '',
      ownerName: (ownerName || effectiveName)?.trim() || '',
      ownerEmail: (ownerEmail || effectiveEmail)?.toLowerCase()?.trim() || '',
      ownerPhone: ownerPhone?.trim() || '',
      ownerAddress: ownerAddress?.trim() || '',
      idCardUrl: idCardUrl || '',
      idCardNumber: idCardNumber?.trim() || '',
      bankName: bankName?.trim() || '',
      accountHolderName: accountHolderName?.trim() || '',
      accountNumberOrIban: accountNumberOrIban?.trim() || '',
      googleId: googleId?.trim() || undefined,
      isWmsRegistered: Boolean(wmsSupplier),
      wmsSupplierId: wmsSupplier?.id || null,
      wmsClientId: wmsSupplier?.user_unique_name || '',
      wmsStatus: wmsSupplier?.status || 'pending',
    })

    // Upsert BusinessProfile with complete details for both suppliers and users
    try {
      await BusinessProfile.findOneAndUpdate(
        { user: user._id },
        {
          user: user._id,
          profileType: role,
          businessName: companyName?.trim() || effectiveName,
          businessEmail: (companyEmail || effectiveEmail)?.toLowerCase()?.trim(),
          businessPhone: companyPhone?.trim() || '',
          businessAddress: companyAddress?.trim() || '',
          registrationEntity: registrationEntity?.trim() || '',
          registrationNo: registrationNo?.trim() || '',
          businessCategory: businessCategory?.trim() || 'General Wholesale & Retail',
          ownerName: (ownerName || effectiveName)?.trim(),
          ownerEmail: (ownerEmail || effectiveEmail)?.toLowerCase()?.trim(),
          ownerPhone: ownerPhone?.trim() || '',
          ownerAddress: ownerAddress?.trim() || '',
          idCardUrl: idCardUrl || '',
          idCardNumber: idCardNumber?.trim() || '',
          bankName: bankName?.trim() || '',
          accountHolderName: accountHolderName?.trim() || '',
          accountNumberOrIban: accountNumberOrIban?.trim() || '',
          accNumber: accountNumberOrIban?.trim() || '',
          paymentProvider: bankName?.trim() || 'Bank Transfer',
          country: 'Pakistan',
          orderType: role === 'supplier' ? 'B2B Wholesale' : 'Wholesale / Retail',
          status: 'pending',
        },
        { upsert: true, new: true }
      )
    } catch (bpErr) {
      console.warn('[Register] BusinessProfile sync notice:', bpErr.message)
    }

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

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message:
          'Database offline: MongoDB connection failed. Please ensure your IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0) and internet is connected.',
      })
    }

    const cleanEmail = email.toLowerCase().trim()
    let user = await User.findOne({ email: cleanEmail }).select('+password')

    // ── Check Master WMS MySQL first (Single Master Database) ──
    let wmsSqlUser = null
    const shouldCheckWms = !user || user.role === 'supplier'
    if (shouldCheckWms) {
      try {
        wmsSqlUser = await verifyWmsSupplierCredentials(cleanEmail, password)
      } catch (wmsSqlErr) {
        console.warn('[Login] WMS MySQL verification notice:', wmsSqlErr.message)
      }
    }

    if (wmsSqlUser) {
      if (!user) {
        user = await User.create({
          fullName: wmsSqlUser.name || 'WMS Supplier',
          email: cleanEmail,
          password,
          role: 'supplier',
          status: wmsSqlUser.status === 'approved' ? 'approved' : 'pending_approval',
          isWmsRegistered: true,
          wmsClientId: wmsSqlUser.user_unique_name || '',
          wmsSupplierId: wmsSqlUser.id,
          wmsStatus: wmsSqlUser.status || 'approved',
        })

        await BusinessProfile.findOneAndUpdate(
          { user: user._id },
          {
            user: user._id,
            profileType: 'supplier',
            businessName: wmsSqlUser.name ? `${wmsSqlUser.name}'s Store` : 'Supplier Store',
            status: 'approved',
          },
          { upsert: true, new: true },
        )
      } else {
        user.isWmsRegistered = true
        user.wmsSupplierId = wmsSqlUser.id
        user.wmsClientId = wmsSqlUser.user_unique_name || user.wmsClientId
        user.wmsStatus = wmsSqlUser.status || user.wmsStatus
        await user.save()
      }
    }

    // ── Check WMS Supplier Status via Live WMS API (fallback for external token) ──
    let wmsAuthResult = null
    if (shouldCheckWms && !wmsSqlUser) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3500)
        const wmsRes = await fetch('https://wmsbysellvro.com/api/supplier/login', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: cleanEmail, password }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const wmsData = await wmsRes.json().catch(() => null)
        if (wmsRes.ok && wmsData?.status && wmsData?.token && wmsData?.supplier) {
          wmsAuthResult = wmsData
        }
      } catch (wmsErr) {
        console.warn('WMS login check skipped/timed out:', wmsErr.message)
      }
    }

    // If user does not exist locally on marketplace, but authenticated on WMS as a supplier:
    if (!user && wmsAuthResult) {
      user = await User.create({
        fullName: wmsAuthResult.supplier.name || 'WMS Supplier',
        email: cleanEmail,
        password,
        role: 'supplier',
        status: 'approved',
        isWmsRegistered: true,
        wmsToken: wmsAuthResult.token,
        wmsClientId: wmsAuthResult.supplier.user_unique_name || '',
        wmsSupplierId: wmsAuthResult.supplier.id,
        wmsStatus: wmsAuthResult.supplier.status || 'approved',
      })

      await BusinessProfile.findOneAndUpdate(
        { user: user._id },
        {
          user: user._id,
          profileType: 'supplier',
          businessName:
            wmsAuthResult.supplier.company_name ||
            wmsAuthResult.supplier.name ||
            'Supplier Store',
          status: 'approved',
        },
        { upsert: true, new: true },
      )
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Verify local password or WMS synced password
    const isPasswordMatch = await user.matchPassword(password)
    if (!isPasswordMatch) {
      if (wmsSqlUser || wmsAuthResult) {
        user.password = password
        await user.save()
      } else {
        return res.status(401).json({ message: 'Invalid email or password.' })
      }
    }

    // Admin accounts must use the dedicated admin portal — block them here
    if (user.role === 'admin') {
      return res.status(403).json({
        message:
          'Admin accounts cannot log in from the public portal. Please use the Admin Sign In page at /admin/login.',
      })
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' })
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Your account application was rejected.' })
    }

    // Sync WMS registration status and credentials
    if (wmsAuthResult) {
      user.isWmsRegistered = true
      user.wmsToken = wmsAuthResult.token
      user.wmsClientId = wmsAuthResult.supplier.user_unique_name || user.wmsClientId || ''
      user.wmsSupplierId = wmsAuthResult.supplier.id || user.wmsSupplierId
      user.wmsStatus = wmsAuthResult.supplier.status || 'approved'
      await user.save()

      if (wmsAuthResult.supplier.company_name) {
        await BusinessProfile.findOneAndUpdate(
          { user: user._id },
          {
            $set: {
              businessName: wmsAuthResult.supplier.company_name,
            },
          },
        )
      }
    } else if (user.role === 'supplier' && (user.isWmsRegistered || user.wmsToken)) {
      // User is supplier on marketplace, but WMS login did not succeed (not registered on WMS)
      user.isWmsRegistered = false
      user.wmsToken = ''
      await user.save()
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
    const status = error?.message?.includes('buffering timed out') ? 503 : 500
    return res.status(status).json({ message: formatDbError(error, 'Login failed.') })
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

  let ratings = null
  if (req.user.role === 'supplier') {
    try {
      const reviewStats = await Review.aggregate([
        { $match: { supplier: req.user._id } },
        {
          $group: {
            _id: '$supplier',
            reviewsCount: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            deliveryRatingAverage: { $avg: '$deliveryRating' },
            onTimeDeliveryPercent: {
              $avg: { $cond: [{ $eq: ['$deliveryOnTime', true] }, 100, 0] },
            },
            badRatingsCount: {
              $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] },
            },
          },
        },
      ])
      const r = reviewStats[0] || {}
      const avg = Number((r.averageRating || 0).toFixed(1))
      const onTime =
        r.onTimeDeliveryPercent !== undefined && r.onTimeDeliveryPercent !== null
          ? Math.round(r.onTimeDeliveryPercent)
          : null
      const reviewsCount = r.reviewsCount || 0
      const badRatingsCount = r.badRatingsCount || 0
      ratings = {
        reviewsCount,
        averageRating: avg,
        deliveryRatingAverage: Number((r.deliveryRatingAverage || 0).toFixed(1)),
        onTimeDeliveryPercent: onTime,
        badRatingsCount,
        isLowPerformance: reviewsCount >= 2 && (avg < 3.0 || (onTime !== null && onTime < 60) || badRatingsCount >= 2),
      }
    } catch {
      ratings = null
    }
  }

  return res.json({
    user: {
      ...safeUser,
      ratings,
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
    const status = error?.message?.includes('buffering timed out') ? 503 : 500
    return res.status(status).json({ message: formatDbError(error, 'Login failed.') })
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

/**
 * PATCH /auth/change-password
 * Works for all roles (admin, supplier, user).
 * Requires: currentPassword, newPassword, confirmPassword.
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' })
    }

    // Reload user with password field (it's select:false by default)
    const user = await User.findById(req.user._id).select('+password')
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' })
    }

    user.password = newPassword
    await user.save()

    return res.json({ message: 'Password updated successfully.' })
  } catch (error) {
    console.error('changePassword error:', error)
    return res.status(500).json({ message: error.message || 'Failed to change password.' })
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
      if (user.role === 'admin') {
        return res.status(403).json({
          message:
            'Admin accounts cannot log in from the public portal. Please use the Admin Sign In page at /admin/login.',
        })
      }
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

      const token = signToken(user._id)
      setAuthCookie(res, token)
      const safeUser = await buildSafeUser(user)

      return res.json({
        message: 'Logged in with Google successfully.',
        token,
        user: safeUser,
        redirectTo: getHomePath(safeUser),
      })
    }

    // If account does not exist yet, return Google profile so client can complete business registration
    return res.json({
      isNewUser: true,
      message: 'Google account verified. Please complete your registration details.',
      googleUser: {
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        googleId: userGoogleId || '',
        picture: picture || '',
      },
    })
  } catch (error) {
    console.error('Google auth error:', error)
    return res.status(500).json({ message: error.message || 'Google sign in failed.' })
  }
}


