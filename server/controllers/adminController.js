import User from '../models/User.js'
import Role from '../models/Role.js'
import BusinessProfile from '../models/BusinessProfile.js'
import AdminNotification from '../models/AdminNotification.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Review from '../models/Review.js'
import Country from '../models/Country.js'
import Location from '../models/Location.js'
import Dispute from '../models/Dispute.js'
import AdminAuditLog from '../models/AdminAuditLog.js'
import { signToken } from '../middleware/auth.js'
import { setAuthCookie, setImpersonatorCookie, readAuthToken } from '../utils/authCookie.js'
import { createNotification } from '../utils/notifications.js'
import { sendSupplierWarningEmail, sendSupplierSuspensionEmail } from '../utils/emailService.js'
import { getNextDisputeNo } from '../services/sequenceService.js'
import { escapeRegex } from '../utils/regex.js'
import { logAdminAction } from '../utils/auditLogger.js'

const formatJoined = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

export const listPendingSuppliers = async (_req, res) => {
  try {
    const users = await User.find({ role: 'supplier', status: 'pending_approval' }).sort({ createdAt: -1 })
    const profiles = await BusinessProfile.find({
      user: { $in: users.map((u) => u._id) },
      profileType: 'supplier',
    })
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]))

    const data = users.map((user) => {
      const profile = profileMap.get(user._id.toString())
      return {
        id: user._id.toString(),
        supplier: user.fullName,
        fullName: user.fullName,
        email: user.email,
        businessName: profile?.businessName || user.companyName || user.fullName,
        companyName: profile?.businessName || user.companyName || user.fullName,
        companyEmail: profile?.businessEmail || user.companyEmail || user.email,
        companyPhone: profile?.businessPhone || user.companyPhone || '—',
        companyAddress: profile?.businessAddress || user.companyAddress || '—',
        registrationEntity: profile?.registrationEntity || user.registrationEntity || '—',
        registrationNo: profile?.registrationNo || user.registrationNo || '—',
        ownerName: profile?.ownerName || user.ownerName || user.fullName,
        ownerEmail: profile?.ownerEmail || user.ownerEmail || user.email,
        ownerPhone: profile?.ownerPhone || user.ownerPhone || '—',
        ownerAddress: profile?.ownerAddress || user.ownerAddress || '—',
        idCardUrl: profile?.idCardUrl || user.idCardUrl || '',
        idCardNumber: profile?.idCardNumber || user.idCardNumber || '—',
        bankName: profile?.bankName || user.bankName || '—',
        accountHolderName: profile?.accountHolderName || user.accountHolderName || '—',
        accountNumberOrIban: profile?.accountNumberOrIban || user.accountNumberOrIban || profile?.accNumber || '—',
        businessDescription: profile?.businessDescription || 'No description provided.',
        businessCategory: profile?.businessCategory || '—',
        businessEmail: profile?.businessEmail || user.companyEmail || user.email,
        businessPhone: profile?.businessPhone || user.companyPhone || '—',
        businessAddress: profile?.businessAddress || user.companyAddress || '—',
        country: profile?.country || '',
        city: profile?.city || '',
        orderType: profile?.orderType || 'Standard',
        location: [profile?.city, profile?.country].filter(Boolean).join(', ') || '—',
        category: profile?.businessCategory || '—',
        paymentProvider: profile?.paymentProvider || 'Not Set',
        accNumber: profile?.accNumber ? `•••• ${profile.accNumber.slice(-4)}` : 'Not Set',
        cardDate: profile?.cardDate || '—',
        joined: formatJoined(user.createdAt),
        rawJoined: user.createdAt,
        status: 'pending_approval',
        role: 'supplier',
        supplierCode: user.supplierCode || null,
        userCode: user.userCode || null,
        phone: profile?.businessPhone || user.phone || '—',
        businessProfile: profile ? (profile.toObject ? profile.toObject() : profile) : null,
      }
    })

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load pending suppliers.' })
  }
}

export const listPendingUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: 'user', status: 'pending_approval' }).sort({ createdAt: -1 })
    const profiles = await BusinessProfile.find({
      user: { $in: users.map((u) => u._id) },
      profileType: 'user',
    })
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]))

    const data = users.map((user) => {
      const profile = profileMap.get(user._id.toString())
      return {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        businessName: profile?.businessName || user.companyName || user.fullName,
        companyName: profile?.businessName || user.companyName || user.fullName,
        companyEmail: profile?.businessEmail || user.companyEmail || user.email,
        companyPhone: profile?.businessPhone || user.companyPhone || '—',
        companyAddress: profile?.businessAddress || user.companyAddress || '—',
        registrationEntity: profile?.registrationEntity || user.registrationEntity || '—',
        registrationNo: profile?.registrationNo || user.registrationNo || '—',
        ownerName: profile?.ownerName || user.ownerName || user.fullName,
        ownerEmail: profile?.ownerEmail || user.ownerEmail || user.email,
        ownerPhone: profile?.ownerPhone || user.ownerPhone || '—',
        ownerAddress: profile?.ownerAddress || user.ownerAddress || '—',
        idCardUrl: profile?.idCardUrl || user.idCardUrl || '',
        idCardNumber: profile?.idCardNumber || user.idCardNumber || '—',
        bankName: profile?.bankName || user.bankName || '—',
        accountHolderName: profile?.accountHolderName || user.accountHolderName || '—',
        accountNumberOrIban: profile?.accountNumberOrIban || user.accountNumberOrIban || profile?.accNumber || '—',
        businessDescription: profile?.businessDescription || 'No description provided.',
        businessCategory: profile?.businessCategory || 'General Buyer / Reseller',
        businessEmail: profile?.businessEmail || user.companyEmail || user.email,
        businessPhone: profile?.businessPhone || user.companyPhone || '—',
        businessAddress: profile?.businessAddress || user.companyAddress || '—',
        country: profile?.country || '',
        city: profile?.city || '',
        orderType: profile?.orderType || 'Standard',
        wallet: `$${Number(user.walletBalance || 0).toLocaleString()}`,
        walletBalance: user.walletBalance || 0,
        location: [profile?.city, profile?.country].filter(Boolean).join(', ') || '—',
        paymentProvider: profile?.paymentProvider || 'Not Set',
        accNumber: profile?.accNumber ? `•••• ${profile.accNumber.slice(-4)}` : 'Not Set',
        cardDate: profile?.cardDate || '—',
        joined: formatJoined(user.createdAt),
        rawJoined: user.createdAt,
        status: 'pending_approval',
        role: 'user',
        userCode: user.userCode || null,
        phone: profile?.businessPhone || user.phone || '—',
        businessProfile: profile ? (profile.toObject ? profile.toObject() : profile) : null,
      }
    })

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load pending users.' })
  }
}

export const listApprovedSuppliers = async (_req, res) => {
  try {
    const users = await User.find({ role: 'supplier', status: 'approved' }).sort({ createdAt: -1 })
    const profiles = await BusinessProfile.find({
      user: { $in: users.map((u) => u._id) },
      profileType: 'supplier',
    })
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]))

    const data = users.map((user) => {
      const profile = profileMap.get(user._id.toString())
      return {
        id: user._id.toString(),
        supplier: user.fullName,
        location: [profile?.city, profile?.country].filter(Boolean).join(', ') || '—',
        orders: 0,
        revenue: '$0',
        payout: 'weekly',
        warn: 0,
        joined: formatJoined(user.createdAt),
        status: 'Approved',
      }
    })

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load suppliers.' })
  }
}

export const listApprovedUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: 'user', status: { $in: ['approved', 'suspended'] } }).sort({
      createdAt: -1,
    })

    const profiles = await BusinessProfile.find({
      user: { $in: users.map((u) => u._id) },
      profileType: 'user',
    })
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]))

    const data = users.map((user) => {
      const profile = profileMap.get(user._id.toString())
      return {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        wallet: `$${user.walletBalance ?? 0}`,
        walletBalance: user.walletBalance ?? 0,
        joined: formatJoined(user.createdAt),
        createdAt: user.createdAt,
        status: user.status === 'suspended' ? 'suspended' : 'approved',
        companyName: user.companyName || profile?.businessName || user.fullName || '',
        businessName: profile?.businessName || user.companyName || user.fullName || '',
        companyEmail: user.companyEmail || profile?.businessEmail || user.email || '',
        businessEmail: profile?.businessEmail || user.companyEmail || user.email || '',
        companyPhone: user.companyPhone || profile?.businessPhone || '—',
        businessPhone: profile?.businessPhone || user.companyPhone || '—',
        companyAddress: user.companyAddress || profile?.businessAddress || '—',
        businessAddress: profile?.businessAddress || user.companyAddress || '—',
        businessCategory: user.businessCategory || profile?.businessCategory || '—',
        registrationEntity: user.registrationEntity || profile?.registrationEntity || '—',
        registrationNo: user.registrationNo || profile?.registrationNo || '—',
        ownerName: user.ownerName || profile?.ownerName || user.fullName || '',
        ownerEmail: user.ownerEmail || profile?.ownerEmail || user.email || '',
        ownerPhone: user.ownerPhone || profile?.ownerPhone || '—',
        ownerAddress: user.ownerAddress || profile?.ownerAddress || '—',
        idCardUrl: user.idCardUrl || profile?.idCardUrl || '',
        idCardNumber: user.idCardNumber || profile?.idCardNumber || '—',
        bankName: user.bankName || profile?.bankName || '—',
        accountHolderName: user.accountHolderName || profile?.accountHolderName || user.fullName || '—',
        accountNumberOrIban: user.accountNumberOrIban || profile?.accountNumberOrIban || profile?.accNumber || '—',
      }
    })

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load users.' })
  }
}

export const approveAccount = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)

    if (!user || !['supplier', 'user'].includes(user.role)) {
      return res.status(404).json({ message: 'Account not found.' })
    }

    user.status = 'approved'
    await user.save()

    await BusinessProfile.findOneAndUpdate(
      { user: user._id },
      { status: 'approved' },
      { new: true },
    )

    await logAdminAction({
      adminId: req.user?._id,
      action: 'approve_account',
      targetType: 'user',
      targetId: user._id,
      details: { role: user.role, email: user.email },
      ip: req.ip,
    })

    await createNotification({
      recipient: user._id,
      targetRole: user.role,
      type: 'account',
      title: 'Account Approved!',
      message: `Congratulations! Your Sellvro ${user.role === 'supplier' ? 'Supplier' : 'Buyer'} account has been approved by the Admin. Full access to marketplace, orders, and wallet features is now activated.`,
      link: user.role === 'supplier' ? '/supplier/dashboard' : '/user/dashboard',
      metadata: { role: user.role, status: 'approved' },
    }).catch(() => {})

    return res.json({
      message: `${user.role === 'supplier' ? 'Supplier' : 'User'} approved successfully.`,
      user: user.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to approve account.' })
  }
}

export const listAdminUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: 'admin' }).sort({ createdAt: -1 })
    const roleIds = [...new Set(users.map((u) => u.adminRoleId?.toString()).filter(Boolean))]
    const roles = await Role.find({ _id: { $in: roleIds } })
    const roleMap = new Map(roles.map((r) => [r._id.toString(), r.name]))

    const data = users.map((user) => ({
      id: user._id.toString(),
      name: user.fullName,
      email: user.email,
      adminRoleId: user.adminRoleId?.toString() || null,
      roleLabel: user.adminRoleId
        ? roleMap.get(user.adminRoleId.toString()) || 'Unknown role'
        : 'Super Admin',
      joined: formatJoined(user.createdAt),
    }))

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load admin users.' })
  }
}

export const createAdminUser = async (req, res) => {
  try {
    const { fullName, email, password, adminRoleId } = req.body

    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    const roleId = adminRoleId || null

    if (req.user.adminRoleId && !roleId) {
      return res.status(403).json({ message: 'Only super admins can create super admin accounts.' })
    }

    let roleName = null
    if (roleId) {
      const role = await Role.findById(roleId)
      if (!role) {
        return res.status(400).json({ message: 'Selected role not found.' })
      }
      roleName = role.name
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
      status: 'approved',
      adminRoleId: roleId,
    })

    return res.status(201).json({
      message: 'Admin user created.',
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        adminRoleId: user.adminRoleId?.toString() || null,
        roleLabel: roleName || 'Super Admin',
        joined: formatJoined(user.createdAt),
      },
    })
  } catch (error) {
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

    return res.status(500).json({ message: error.message || 'Failed to create admin user.' })
  }
}

export const rejectAccount = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)

    if (!user || !['supplier', 'user'].includes(user.role)) {
      return res.status(404).json({ message: 'Account not found.' })
    }

    user.status = 'rejected'
    await user.save()

    await BusinessProfile.findOneAndUpdate(
      { user: user._id },
      { status: 'rejected' },
      { new: true },
    )

    await logAdminAction({
      adminId: req.user?._id,
      action: 'reject_account',
      targetType: 'user',
      targetId: user._id,
      details: { role: user.role, email: user.email },
      ip: req.ip,
    })

    await createNotification({
      recipient: user._id,
      targetRole: user.role,
      type: 'account',
      title: 'Account Verification Rejected',
      message: `Your Sellvro ${user.role === 'supplier' ? 'Supplier' : 'Buyer'} account application has been reviewed and rejected by the Admin. Please review your submitted details.`,
      link: user.role === 'supplier' ? '/supplier/business/details' : '/user/business/detail',
      metadata: { role: user.role, status: 'rejected' },
    }).catch(() => {})

    return res.json({
      message: 'Account rejected.',
      user: user.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reject account.' })
  }
}

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' })
    }

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

    let roleTitle = 'Super Admin'
    if (user.adminRoleId) {
      const role = await Role.findById(user.adminRoleId)
      roleTitle = role?.name || 'Sub-Admin'
    }

    // Create notification for Super Admin
    await AdminNotification.create({
      type: 'password_change',
      title: 'Password Changed',
      message: `${user.fullName} (${user.email} · ${roleTitle}) changed their account password.`,
      userId: user._id,
      metadata: {
        email: user.email,
        fullName: user.fullName,
        role: roleTitle,
        date: new Date().toISOString(),
      },
    })

    return res.json({ message: 'Password updated successfully.' })
  } catch (error) {
    console.error('Change password error:', error)
    return res.status(500).json({ message: error.message || 'Failed to update password.' })
  }
}

export const listAdminNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find()
      .sort({ createdAt: -1 })
      .limit(50)

    const unreadCount = notifications.filter(
      (n) => !n.readBy.some((uid) => uid.toString() === req.user._id.toString()),
    ).length

    const data = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      isRead: n.readBy.some((uid) => uid.toString() === req.user._id.toString()),
      createdAt: n.createdAt,
    }))

    return res.json({ data, unreadCount })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load notifications.' })
  }
}

export const markAdminNotificationRead = async (req, res) => {
  try {
    const { id } = req.params
    await AdminNotification.findByIdAndUpdate(id, {
      $addToSet: { readBy: req.user._id },
    })
    return res.json({ message: 'Notification marked as read.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update notification.' })
  }
}

export const markAllAdminNotificationsRead = async (req, res) => {
  try {
    await AdminNotification.updateMany(
      {},
      { $addToSet: { readBy: req.user._id } },
    )
    return res.json({ message: 'All notifications marked as read.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to mark all as read.' })
  }
}

export const listAllAccounts = async (req, res) => {
  try {
    const { role = 'all', status = 'all', search = '', page = 1, limit = 50 } = req.query

    // Case 1: Specific Supplier or Customer query from their dedicated pages / reporting widgets
    if (role === 'supplier' || role === 'user') {
      const query = { role }

      if (status && status !== 'all') {
        query.status = status
      }

      if (search?.trim()) {
        const regex = new RegExp(escapeRegex(search.trim()), 'i')
        const matchingProfiles = await BusinessProfile.find({
          $or: [
            { businessName: regex },
            { city: regex },
            { country: regex },
            { businessPhone: regex },
          ],
        }).select('user')

        const profileUserIds = matchingProfiles.map((p) => p.user)

        query.$or = [
          { fullName: regex },
          { email: regex },
          { _id: { $in: profileUserIds } },
        ]
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
      const skip = (pageNum - 1) * limitNum

      const [users, total] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        User.countDocuments(query),
      ])

      const userIds = users.map((u) => u._id)
      const [profiles, orderCounts, reviewStats] = await Promise.all([
        BusinessProfile.find({ user: { $in: userIds } }),
        Order.aggregate([
          {
            $match: {
              $or: [{ supplier: { $in: userIds } }, { user: { $in: userIds } }],
              status: { $ne: 'cancelled' },
            },
          },
          {
            $group: {
              _id: {
                $cond: [{ $in: ['$supplier', userIds] }, '$supplier', '$user'],
              },
              count: { $sum: 1 },
              totalSpent: { $sum: '$total' },
              totalEarnings: { $sum: { $subtract: ['$total', '$commission'] } },
            },
          },
        ]),
        Review.aggregate([
          { $match: { supplier: { $in: userIds } } },
          {
            $group: {
              _id: '$supplier',
              count: { $sum: 1 },
              totalProductRating: { $sum: '$productRating' },
              totalDeliveryRating: { $sum: '$deliveryRating' },
              onTimeCount: { $sum: { $cond: ['$deliveredOnTime', 1, 0] } },
              badRatingsCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $lte: ['$productRating', 2] },
                        { $lte: ['$deliveryRating', 2] },
                        { $eq: ['$deliveredOnTime', false] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ])

      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]))
      const orderMap = new Map(orderCounts.map((o) => [o._id.toString(), o]))
      const reviewMap = new Map(reviewStats.map((r) => [r._id.toString(), r]))

      const [totalSuppliers, totalUsers, totalApproved, totalSuspended, totalPending, totalWmsSuppliers, totalWithWarnings] = await Promise.all([
        User.countDocuments({ role: 'supplier' }),
        User.countDocuments({ role: 'user' }),
        User.countDocuments({ role: { $in: ['supplier', 'user'] }, status: 'approved' }),
        User.countDocuments({ role: { $in: ['supplier', 'user'] }, status: 'suspended' }),
        User.countDocuments({ role: { $in: ['supplier', 'user'] }, status: { $in: ['pending_approval', 'pending_details'] } }),
        User.countDocuments({
          role: 'supplier',
          $or: [
            { isWmsRegistered: true },
            { wmsClientId: { $exists: true, $ne: '' } },
            { wmsSupplierId: { $exists: true, $ne: null } },
            { wmsToken: { $exists: true, $ne: '' } },
          ],
        }),
        User.countDocuments({ role: 'supplier', warningsCount: { $gt: 0 } }),
      ])

      const totalMarketplaceSuppliers = Math.max(0, totalSuppliers - totalWmsSuppliers)

      const data = users.map((user) => {
        const profile = profileMap.get(user._id.toString())
        const stats = orderMap.get(user._id.toString())
        const rev = reviewMap.get(user._id.toString())

        const ordersCount = stats?.count || 0
        const revenue = user.role === 'supplier' ? (stats?.totalEarnings || 0) : (stats?.totalSpent || 0)
        const isWms = Boolean(
          user.isWmsRegistered ||
          user.wmsClientId ||
          user.wmsToken ||
          user.wmsSupplierId
        )

        const reviewsCount = rev?.count || 0
        const avgRating = reviewsCount > 0 ? Number((rev.totalProductRating / reviewsCount).toFixed(1)) : 0
        const avgDelivery = reviewsCount > 0 ? Number((rev.totalDeliveryRating / reviewsCount).toFixed(1)) : 0
        const onTimePct = reviewsCount > 0 ? Math.round((rev.onTimeCount / reviewsCount) * 100) : 100
        const badCount = rev?.badRatingsCount || 0
        const warningsCount = user.warningsCount ?? (user.warnings?.length || 0)
        const isLowPerformance = (reviewsCount >= 1 && (avgRating < 3.0 || onTimePct < 70)) || badCount >= 1

        const hex = user._id ? user._id.toString() : ''
        const fallbackNum = 1001 + (parseInt(hex.slice(-4) || '1001', 16) % 8999)
        const displayId =
          user.displayId ||
          (user.role === 'supplier'
            ? `SPAK-${fallbackNum}`
            : `US-${fallbackNum}`)

        return {
          id: user._id.toString(),
          displayId,
          supplierDisplayId: displayId,
          userDisplayId: displayId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          walletBalance: user.walletBalance ?? 0,
          joined: formatJoined(user.createdAt),
          createdAt: user.createdAt,
          ordersCount,
          revenue: Math.round(revenue * 100) / 100,
          revenueLabel: `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isWmsRegistered: isWms,
          wmsClientId: user.wmsClientId || '',
          wmsSupplierId: user.wmsSupplierId || null,
          wmsStatus: user.wmsStatus || '',
          supplierType: isWms ? 'wms' : 'marketplace_only',
          originLabel: isWms ? 'WMS Warehouse (3PL)' : 'Marketplace Only',
          ratings: {
            reviewsCount,
            averageRating: avgRating,
            deliveryRatingAverage: avgDelivery,
            onTimeDeliveryPercent: onTimePct,
            badRatingsCount: badCount,
            isLowPerformance,
          },
          warningsCount,
          warnings: user.warnings || [],
          suspensionReason: user.suspensionReason || '',
          suspendedAt: user.suspendedAt || null,
          canSuspend: warningsCount >= 3 || user.status === 'suspended',
          // User & Supplier Registration Details
          companyName: user.companyName || profile?.businessName || user.fullName || '',
          businessName: profile?.businessName || user.companyName || user.fullName || '',
          companyEmail: user.companyEmail || profile?.businessEmail || user.email || '',
          businessEmail: profile?.businessEmail || user.companyEmail || user.email || '',
          companyPhone: user.companyPhone || profile?.businessPhone || '—',
          businessPhone: profile?.businessPhone || user.companyPhone || '—',
          companyAddress: user.companyAddress || profile?.businessAddress || '—',
          businessAddress: profile?.businessAddress || user.companyAddress || '—',
          businessCategory: user.businessCategory || profile?.businessCategory || '—',
          registrationEntity: user.registrationEntity || profile?.registrationEntity || '—',
          registrationNo: user.registrationNo || profile?.registrationNo || '—',
          ownerName: user.ownerName || profile?.ownerName || user.fullName || '',
          ownerEmail: user.ownerEmail || profile?.ownerEmail || user.email || '',
          ownerPhone: user.ownerPhone || profile?.ownerPhone || '—',
          ownerAddress: user.ownerAddress || profile?.ownerAddress || '—',
          idCardUrl: user.idCardUrl || profile?.idCardUrl || '',
          idCardNumber: user.idCardNumber || profile?.idCardNumber || '—',
          bankName: user.bankName || profile?.bankName || '—',
          accountHolderName: user.accountHolderName || profile?.accountHolderName || user.fullName || '—',
          accountNumberOrIban: user.accountNumberOrIban || profile?.accountNumberOrIban || profile?.accNumber || '—',
          businessProfile: profile
            ? {
                businessName: profile.businessName || '',
                businessCategory: profile.businessCategory || '',
                businessPhone: profile.businessPhone || '',
                city: profile.city || '',
                country: profile.country || '',
                location: [profile.city, profile.country].filter(Boolean).join(', ') || '—',
                paymentProvider: profile.paymentProvider || 'Not set',
                payoutSchedule: profile.payoutSchedule || 'Weekly',
              }
            : null,
        }
      })

      return res.json({
        data,
        stats: {
          totalAccounts: totalSuppliers + totalUsers,
          totalSuppliers,
          totalWithWarnings,
          totalUsers,
          totalApproved,
          totalSuspended,
          totalPending,
          totalWmsSuppliers,
          totalMarketplaceSuppliers,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      })
    }

    // Case 2: Settings -> Accounts Management
    // Exclude Suppliers and Users! Display internal Staff, Administrators, Sub-admins and Managers.
    const query = { role: 'admin' }

    if (role === 'super_admin') {
      query.adminRoleId = null
    } else if (role === 'sub_admin') {
      query.adminRoleId = { $ne: null }
    }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search?.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i')
      const matchingRoles = await Role.find({ name: regex }).select('_id')
      const matchingRoleIds = matchingRoles.map((r) => r._id)

      query.$or = [
        { fullName: regex },
        { email: regex },
        { adminRoleId: { $in: matchingRoleIds } },
      ]
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
    const skip = (pageNum - 1) * limitNum

    const [users, total, allRoles, totalStaff, totalSuperAdmins, totalSubAdmins, totalApproved, totalSuspended] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query),
      Role.find({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'admin', adminRoleId: null }),
      User.countDocuments({ role: 'admin', adminRoleId: { $ne: null } }),
      User.countDocuments({ role: 'admin', status: 'approved' }),
      User.countDocuments({ role: 'admin', status: 'suspended' }),
    ])

    const roleMap = new Map(allRoles.map((r) => [r._id.toString(), r]))

    const data = users.map((user) => {
      const assignedRole = user.adminRoleId ? roleMap.get(user.adminRoleId.toString()) : null
      const isSuper = !user.adminRoleId
      const roleLabel = isSuper ? 'Super Admin' : (assignedRole?.name || 'Sub-Admin')
      const permissionsCount = isSuper ? null : (assignedRole?.permissions?.length ?? 0)

      return {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: 'admin',
        adminRoleId: user.adminRoleId?.toString() || null,
        roleLabel,
        roleDescription: isSuper
          ? 'Full root access with all administrative privileges'
          : (assignedRole?.description || 'Custom role permissions'),
        permissionsCount,
        status: user.status || 'approved',
        isSuperAdmin: isSuper,
        joined: formatJoined(user.createdAt),
        createdAt: user.createdAt,
      }
    })

    return res.json({
      data,
      stats: {
        totalAccounts: totalStaff,
        totalStaff,
        totalSuperAdmins,
        totalSubAdmins,
        totalApproved,
        totalSuspended,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    })
  } catch (error) {
    console.error('List accounts error:', error)
    return res.status(500).json({ message: error.message || 'Failed to list accounts.' })
  }
}

export const createAccount = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role = 'admin',
      status = 'approved',
      adminRoleId,
      businessName,
      businessCategory,
      businessPhone,
      city,
      country,
      walletBalance = 0,
    } = req.body

    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' })
    }

    if (!['supplier', 'user', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    const allowedStatuses = ['approved', 'pending_approval', 'pending_details', 'suspended', 'rejected']
    const finalStatus = allowedStatuses.includes(status) ? status : 'approved'

    // Admin / Staff creation
    if (role === 'admin' || role === 'staff') {
      const roleId = adminRoleId && adminRoleId !== 'super_admin' ? adminRoleId : null

      if (req.user?.adminRoleId) {
        return res.status(403).json({ message: 'Only Super Admins can create admin or staff accounts.' })
      }

      let roleName = null
      if (roleId) {
        const roleDoc = await Role.findById(roleId)
        if (!roleDoc) {
          return res.status(400).json({ message: 'Selected role not found.' })
        }
        roleName = roleDoc.name
      }

      const user = await User.create({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: 'admin',
        status: finalStatus,
        adminRoleId: roleId,
      })

      return res.status(201).json({
        message: 'Staff account created successfully.',
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          role: 'admin',
          adminRoleId: user.adminRoleId?.toString() || null,
          roleLabel: roleName || 'Super Admin',
          status: user.status,
          joined: formatJoined(user.createdAt),
        },
      })
    }

    // Supplier / User creation
    const isWms = Boolean(req.body.isWmsRegistered || req.body.wmsClientId)
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      status: finalStatus,
      walletBalance: Math.max(0, Number(walletBalance) || 0),
      isWmsRegistered: isWms,
      wmsClientId: isWms ? String(req.body.wmsClientId || '').trim() : '',
      wmsStatus: isWms ? 'approved' : '',
    })

    await BusinessProfile.create({
      user: user._id,
      profileType: role,
      businessName: businessName?.trim() || fullName.trim(),
      businessCategory: businessCategory?.trim() || '',
      businessPhone: businessPhone?.trim() || '',
      businessEmail: email.toLowerCase().trim(),
      city: city?.trim() || '',
      country: country?.trim() || '',
      status: finalStatus === 'approved' ? 'approved' : 'pending',
    })

    return res.status(201).json({
      message: `${role === 'supplier' ? 'Supplier' : 'Customer user'} created successfully.`,
      user: user.toSafeObject(),
    })
  } catch (error) {
    console.error('Create account error:', error)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }
    return res.status(500).json({ message: error.message || 'Failed to create account.' })
  }
}

export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params
    const {
      fullName,
      email,
      role,
      status,
      adminRoleId,
      businessName,
      businessCategory,
      businessPhone,
      city,
      country,
      walletBalance,
      password,
    } = req.body

    const user = await User.findById(id).select('+password')
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' })
    }

    if (user.role === 'admin' && req.user?.adminRoleId) {
      return res.status(403).json({ message: 'Only Super Admins can modify admin or staff accounts.' })
    }

    if (email?.trim() && email.toLowerCase().trim() !== user.email) {
      const conflict = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } })
      if (conflict) {
        return res.status(400).json({ message: 'Email address is already in use by another account.' })
      }
      user.email = email.toLowerCase().trim()
    }

    if (fullName?.trim()) user.fullName = fullName.trim()

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' })
      }
      user.password = password
    }

    // Handle Staff / Admin account update
    if (user.role === 'admin') {
      if (status && ['approved', 'suspended'].includes(status)) {
        if (user._id.toString() === req.user._id.toString() && status === 'suspended') {
          return res.status(400).json({ message: 'You cannot suspend your own account.' })
        }
        user.status = status
      }

      if (adminRoleId !== undefined) {
        const isSuper = adminRoleId === 'super_admin' || adminRoleId === '' || adminRoleId === null
        if (isSuper) {
          if (req.user?.adminRoleId) {
            return res.status(403).json({ message: 'Only super administrators can assign Super Admin role.' })
          }
          user.adminRoleId = null
        } else {
          const roleDoc = await Role.findById(adminRoleId)
          if (!roleDoc) {
            return res.status(400).json({ message: 'Selected role not found.' })
          }
          user.adminRoleId = roleDoc._id
        }
      }

      await user.save()

      let roleLabel = 'Super Admin'
      if (user.adminRoleId) {
        const roleDoc = await Role.findById(user.adminRoleId)
        roleLabel = roleDoc?.name || 'Sub-Admin'
      }

      return res.json({
        message: 'Staff account updated successfully.',
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          role: 'admin',
          status: user.status,
          adminRoleId: user.adminRoleId?.toString() || null,
          roleLabel,
          joined: formatJoined(user.createdAt),
        },
      })
    }

    // Regular User / Supplier update
    if (role && ['supplier', 'user'].includes(role)) {
      user.role = role
    }

    if (status && ['approved', 'pending_approval', 'pending_details', 'suspended', 'rejected'].includes(status)) {
      user.status = status
    }

    if (walletBalance !== undefined && !isNaN(Number(walletBalance))) {
      user.walletBalance = Math.max(0, Number(walletBalance))
    }

    if (typeof req.body.isWmsRegistered === 'boolean') {
      user.isWmsRegistered = req.body.isWmsRegistered
    }
    if (req.body.wmsClientId !== undefined) {
      user.wmsClientId = String(req.body.wmsClientId || '').trim()
    }
    if (req.body.wmsSupplierId !== undefined) {
      user.wmsSupplierId = req.body.wmsSupplierId ? Number(req.body.wmsSupplierId) : null
    }
    if (req.body.wmsStatus !== undefined) {
      user.wmsStatus = String(req.body.wmsStatus || '').trim()
    }

    await user.save()

    const profileData = {
      profileType: user.role,
      status: user.status === 'approved' ? 'approved' : user.status === 'rejected' ? 'rejected' : 'pending',
    }

    if (businessName !== undefined) profileData.businessName = businessName.trim()
    if (businessCategory !== undefined) profileData.businessCategory = businessCategory.trim()
    if (businessPhone !== undefined) profileData.businessPhone = businessPhone.trim()
    if (city !== undefined) profileData.city = city.trim()
    if (country !== undefined) profileData.country = country.trim()
    if (user.email) profileData.businessEmail = user.email

    const profile = await BusinessProfile.findOneAndUpdate(
      { user: user._id },
      { $set: profileData },
      { new: true, upsert: true },
    )

    await logAdminAction({
      adminId: req.user?._id,
      action: 'update_account',
      targetType: 'user',
      targetId: user._id,
      details: { role: user.role, status: user.status, walletBalance: user.walletBalance },
      ip: req.ip,
    })

    return res.json({
      message: 'Account updated successfully.',
      user: {
        ...user.toSafeObject(),
        businessProfile: profile,
      },
    })
  } catch (error) {
    console.error('Update account error:', error)
    return res.status(500).json({ message: error.message || 'Failed to update account.' })
  }
}

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' })
    }

    if (user.role === 'admin') {
      if (req.user?.adminRoleId) {
        return res.status(403).json({ message: 'Only Super Admins can delete admin or staff accounts.' })
      }
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You cannot delete your own account.' })
      }

      if (!user.adminRoleId) {
        const superAdminCount = await User.countDocuments({ role: 'admin', adminRoleId: null })
        if (superAdminCount <= 1) {
          return res.status(400).json({ message: 'Cannot delete the only Super Administrator account.' })
        }
      }

      await User.findByIdAndDelete(user._id)
      await logAdminAction({
        adminId: req.user?._id,
        action: 'delete_account',
        targetType: 'user',
        targetId: user._id,
        details: { role: user.role, email: user.email },
        ip: req.ip,
      })
      return res.json({ message: 'Staff account deleted successfully.' })
    }

    await BusinessProfile.deleteMany({ user: user._id })
    await User.findByIdAndDelete(user._id)

    await logAdminAction({
      adminId: req.user?._id,
      action: 'delete_account',
      targetType: 'user',
      targetId: user._id,
      details: { role: user.role, email: user.email },
      ip: req.ip,
    })

    return res.json({ message: `${user.role === 'supplier' ? 'Supplier' : 'User'} account deleted successfully.` })
  } catch (error) {
    console.error('Delete account error:', error)
    return res.status(500).json({ message: error.message || 'Failed to delete account.' })
  }
}

export const impersonateAccount = async (req, res) => {
  try {
    const { id } = req.params

    const targetUser = await User.findById(id)
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' })
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Administrator accounts cannot be impersonated.' })
    }

    const adminToken = readAuthToken(req) || signToken(req.user._id)
    setImpersonatorCookie(res, adminToken)

    const targetToken = signToken(targetUser._id)
    setAuthCookie(res, targetToken)

    await logAdminAction({
      adminId: req.user?._id,
      action: 'impersonate_account',
      targetType: 'user',
      targetId: targetUser._id,
      details: { targetRole: targetUser.role, targetEmail: targetUser.email },
      ip: req.ip,
    })

    const redirectUrl =
      targetUser.role === 'supplier'
        ? targetUser.status === 'approved'
          ? '/supplier/dashboard'
          : '/supplier/business/details'
        : targetUser.status === 'approved'
          ? '/user/dashboard'
          : '/user/business/detail'

    return res.json({
      message: `Now viewing as ${targetUser.fullName} (${targetUser.role}).`,
      user: targetUser.toSafeObject(),
      redirectUrl,
    })
  } catch (error) {
    console.error('Impersonation error:', error)
    return res.status(500).json({ message: error.message || 'Failed to start impersonation.' })
  }
}

export const listCountries = async (_req, res) => {
  try {
    const countries = await Country.find().sort({ name: 1 })
    return res.json({ data: countries.map((c) => c.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to list countries.' })
  }
}

export const createCountry = async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Country name is required.' })
    }

    const existing = await Country.findOne({ name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'Country already exists.' })
    }

    const country = await Country.create({ name: name.trim() })
    return res.status(201).json({ message: 'Country created successfully.', data: country.toSafeObject() })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create country.' })
  }
}

export const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params
    await Country.findByIdAndDelete(id)
    return res.json({ message: 'Country deleted successfully.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete country.' })
  }
}

export const listLocations = async (_req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 })
    return res.json({ data: locations.map((l) => l.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to list locations.' })
  }
}

export const createLocation = async (req, res) => {
  try {
    const { name, description = '' } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Location name is required.' })
    }

    const existing = await Location.findOne({ name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'Location already exists.' })
    }

    const location = await Location.create({ name: name.trim(), description: description.trim() })
    return res.status(201).json({ message: 'Location created successfully.', data: location.toSafeObject() })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create location.' })
  }
}

export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params
    await Location.findByIdAndDelete(id)
    return res.json({ message: 'Location deleted successfully.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete location.' })
  }
}

/**
 * Issue official performance warning to supplier due to bad ratings / delivery delays
 * POST /api/admin/suppliers/:id/warn
 */
export const warnSupplierAccount = async (req, res) => {
  try {
    const { id } = req.params
    const { reason, details } = req.body

    const supplier = await User.findById(id)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier account not found.' })
    }

    // Calculate current performance from Review collection
    const reviews = await Review.find({ supplier: supplier._id })
    const count = reviews.length
    let sumProduct = 0
    let onTimeCount = 0
    reviews.forEach((r) => {
      sumProduct += r.productRating || 0
      if (r.deliveredOnTime) onTimeCount += 1
    })
    const avgRating = count > 0 ? Number((sumProduct / count).toFixed(1)) : 0
    const onTimePct = count > 0 ? Math.round((onTimeCount / count) * 100) : 100

    const nextWarningNumber = (supplier.warningsCount || 0) + 1
    const warningRecord = {
      warningNumber: nextWarningNumber,
      reason: reason?.trim() || 'Poor Product Quality & Bad Customer Ratings',
      details: details?.trim() || '',
      averageRating: avgRating,
      onTimeDeliveryPercent: onTimePct,
      warnedAt: new Date(),
      warnedBy: req.user?._id,
    }

    supplier.warningsCount = nextWarningNumber
    if (!supplier.warnings) supplier.warnings = []
    supplier.warnings.push(warningRecord)

    // Automatic Suspension Policy: When supplier receives 3 warnings, automatically suspend account
    let autoSuspended = false
    if (nextWarningNumber >= 3) {
      supplier.status = 'suspended'
      supplier.suspensionReason =
        reason?.trim() ||
        'Account automatically suspended: Reached maximum limit of 3 performance and SLA warnings.'
      supplier.suspendedAt = new Date()
      autoSuspended = true

      // Deactivate all active/approved products from marketplace
      await Product.updateMany(
        { supplier: supplier._id, status: { $in: ['active', 'approved'] } },
        { status: 'inactive' },
      )
    }

    await supplier.save()

    // Create In-App Notification (non-blocking)
    createNotification({
      userId: supplier._id,
      title: autoSuspended
        ? '🚫 Account Suspended (3/3 Warnings Reached)'
        : `⚠️ Performance Warning #${nextWarningNumber}`,
      message: autoSuspended
        ? `Supplier account has been suspended after receiving warning #3: ${warningRecord.reason}`
        : `Admin has issued official warning #${nextWarningNumber} of 3: ${warningRecord.reason}`,
      type: 'account',
    }).catch(() => {})

    // Send Official Warning Email (purely optional / non-blocking background)
    sendSupplierWarningEmail(supplier.email, {
      supplierName: supplier.fullName,
      warningNumber: nextWarningNumber,
      maxWarnings: 3,
      reason: warningRecord.reason,
      details: warningRecord.details,
      averageRating: avgRating,
      onTimeDeliveryPercent: onTimePct,
    }).catch(() => {})

    // If auto-suspended on 3rd warning, also send formal suspension email in background
    if (autoSuspended) {
      sendSupplierSuspensionEmail(supplier.email, {
        supplierName: supplier.fullName,
        reason: supplier.suspensionReason,
        suspendedAt: supplier.suspendedAt,
        averageRating: avgRating,
        onTimeDeliveryPercent: onTimePct,
      }).catch(() => {})
    }

    return res.json({
      success: true,
      message: autoSuspended
        ? `Warning #3 of 3 issued. Supplier "${supplier.fullName}" has been AUTOMATICALLY SUSPENDED and products deactivated.`
        : `Warning #${nextWarningNumber} of 3 recorded successfully for ${supplier.fullName}.`,
      warningsCount: supplier.warningsCount,
      status: supplier.status,
      isLimitReached: nextWarningNumber >= 3,
      autoSuspended,
      warning: warningRecord,
    })
  } catch (error) {
    console.error('Warn supplier error:', error)
    return res.status(500).json({ message: error.message || 'Failed to issue warning.' })
  }
}

/**
 * Suspend supplier account (after 3 warnings or admin enforcement)
 * POST /api/admin/suppliers/:id/suspend
 */
export const suspendSupplierAccount = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const supplier = await User.findById(id)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier account not found.' })
    }

    // Performance snapshot for suspension record
    const reviews = await Review.find({ supplier: supplier._id })
    const count = reviews.length
    let sumProduct = 0
    let onTimeCount = 0
    reviews.forEach((r) => {
      sumProduct += r.productRating || 0
      if (r.deliveredOnTime) onTimeCount += 1
    })
    const avgRating = count > 0 ? Number((sumProduct / count).toFixed(1)) : 0
    const onTimePct = count > 0 ? Math.round((onTimeCount / count) * 100) : 100

    supplier.status = 'suspended'
    supplier.suspensionReason =
      reason?.trim() ||
      `Account manually suspended by Administration.`
    supplier.suspendedAt = new Date()
    await supplier.save()

    // Deactivate all active/approved products from marketplace
    await Product.updateMany(
      { supplier: supplier._id, status: { $in: ['active', 'approved'] } },
      { status: 'inactive' },
    )

    // In-App Notification (non-blocking)
    createNotification({
      userId: supplier._id,
      title: '🚫 Supplier Account Suspended',
      message: supplier.suspensionReason,
      type: 'account',
    }).catch(() => {})

    // Send Suspension Email (non-blocking background)
    sendSupplierSuspensionEmail(supplier.email, {
      supplierName: supplier.fullName,
      reason: supplier.suspensionReason,
      totalWarnings: supplier.warningsCount || 3,
      averageRating: avgRating,
      onTimeDeliveryPercent: onTimePct,
    }).catch(() => {})

    return res.json({
      success: true,
      message: `Supplier "${supplier.fullName}" has been suspended and products deactivated.`,
      status: supplier.status,
      suspensionReason: supplier.suspensionReason,
      supplier: supplier.toSafeObject(),
    })
  } catch (error) {
    console.error('Suspend supplier error:', error)
    return res.status(500).json({ message: error.message || 'Failed to suspend supplier.' })
  }
}

/**
 * Reinstate suspended supplier account
 * POST /api/admin/suppliers/:id/reinstate
 */
export const reinstateSupplierAccount = async (req, res) => {
  try {
    const { id } = req.params
    const supplier = await User.findById(id)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier account not found.' })
    }

    supplier.status = 'approved'
    supplier.warningsCount = 0
    supplier.suspensionReason = ''
    supplier.suspendedAt = null
    await supplier.save()

    try {
      await createNotification({
        userId: supplier._id,
        title: '✅ Supplier Account Reinstated',
        message: 'Your supplier account has been reinstated. You may now reactivate your product listings in the portal.',
        type: 'account',
      })
    } catch {}

    return res.json({
      success: true,
      message: `Supplier ${supplier.fullName} has been reinstated successfully.`,
      supplier: supplier.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reinstate supplier.' })
  }
}

/**
 * Complete Supplier Performance, Reviews, Rating & Dispatch SLA Report
 * GET /api/admin/suppliers/:id/performance-report
 */
export const getSupplierPerformanceReport = async (req, res) => {
  try {
    const { id } = req.params
    const supplier = await User.findById(id)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier account not found.' })
    }

    const profile = await BusinessProfile.findOne({ user: supplier._id, profileType: 'supplier' })

    // 1. Fetch all reviews for this supplier
    const reviews = await Review.find({ supplier: supplier._id })
      .populate('product', 'name sku images')
      .populate('order', 'orderNo createdAt')
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })

    const totalReviews = reviews.length
    let sumProduct = 0
    let sumDelivery = 0
    let onTimeCustomerCount = 0
    let positiveCount = 0
    let neutralCount = 0
    let negativeCount = 0

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    reviews.forEach((r) => {
      const pR = Number(r.productRating || 5)
      const dR = Number(r.deliveryRating || 5)
      sumProduct += pR
      sumDelivery += dR
      if (r.deliveredOnTime) onTimeCustomerCount += 1

      if (pR >= 4) positiveCount += 1
      else if (pR === 3) neutralCount += 1
      else negativeCount += 1

      const starKey = Math.min(5, Math.max(1, Math.round(pR)))
      ratingDistribution[starKey] = (ratingDistribution[starKey] || 0) + 1
    })

    const avgProductRating = totalReviews > 0 ? Number((sumProduct / totalReviews).toFixed(1)) : 0
    const avgDeliveryRating = totalReviews > 0 ? Number((sumDelivery / totalReviews).toFixed(1)) : 0
    const overallRating = totalReviews > 0 ? Number(((avgProductRating + avgDeliveryRating) / 2).toFixed(1)) : 0
    const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 100
    const customerOnTimePct = totalReviews > 0 ? Math.round((onTimeCustomerCount / totalReviews) * 100) : 100

    // 2. Fetch all orders for this supplier
    const orders = await Order.find({ supplier: supplier._id })
      .populate('product', 'name sku handlingTime deliveryTime fulfillBy images')
      .sort({ createdAt: -1 })

    // 3. Analyze Handling Time & Dispatch Performance (Promised vs Actual)
    let totalActualDispatchHours = 0
    let dispatchedOrdersCount = 0
    let onTimeDispatchedCount = 0
    let lateDispatchedCount = 0
    let pendingHandoverCount = 0
    let overduePendingCount = 0

    const parseHandlingHours = (str) => {
      if (!str) return 24
      const lower = String(str).toLowerCase()
      if (lower.includes('12') || lower.includes('same')) return 12
      if (lower.includes('24') || lower.includes('1 business') || lower.includes('1 day')) return 24
      if (lower.includes('48') || lower.includes('2 business') || lower.includes('2 day')) return 48
      if (lower.includes('72') || lower.includes('3 business') || lower.includes('3 day')) return 72
      if (lower.includes('4-5') || lower.includes('4 - 5') || lower.includes('5 day')) return 120
      const match = lower.match(/(\d+)\s*hour/)
      if (match) return parseInt(match[1], 10)
      const dayMatch = lower.match(/(\d+)\s*day/)
      if (dayMatch) return parseInt(dayMatch[1], 10) * 24
      return 24
    }

    const comparisonList = orders.map((order) => {
      const promisedStr = order.promisedHandlingTime || order.product?.handlingTime || '24 Hours (1 business day)'
      const promisedHours = order.handlingHoursPromised || parseHandlingHours(promisedStr)

      const createdAt = order.createdAt ? new Date(order.createdAt) : new Date()
      let actualHours = order.actualHandlingHours
      let isDispatched = Boolean(order.isDispatched || order.dispatchedAt)
      let dispatchedAt = order.dispatchedAt ? new Date(order.dispatchedAt) : null

      let complianceStatus = 'Pending Handover'
      let delayHours = 0
      let isOnTime = true

      if (isDispatched && dispatchedAt) {
        dispatchedOrdersCount += 1
        if (!actualHours) {
          actualHours = Math.max(1, Math.round((dispatchedAt - createdAt) / (1000 * 60 * 60)))
        }
        totalActualDispatchHours += actualHours
        isOnTime = actualHours <= promisedHours
        if (isOnTime) {
          onTimeDispatchedCount += 1
          complianceStatus = 'On-Time'
        } else {
          lateDispatchedCount += 1
          delayHours = actualHours - promisedHours
          complianceStatus = 'Late Dispatch'
        }
      } else {
        pendingHandoverCount += 1
        const elapsedHours = Math.max(1, Math.round((Date.now() - createdAt) / (1000 * 60 * 60)))
        if (elapsedHours > promisedHours) {
          overduePendingCount += 1
          delayHours = elapsedHours - promisedHours
          complianceStatus = 'Overdue'
          isOnTime = false
        } else {
          complianceStatus = 'Pending (Within SLA)'
          isOnTime = true
        }
      }

      return {
        orderId: order._id.toString(),
        orderNo: order.orderNo,
        productName: order.productName || order.product?.name || 'Item',
        sku: order.product?.sku || '—',
        carrier: order.carrier || 'Sellvro Express',
        trackingNumber: order.trackingNumber || '',
        orderDate: order.createdAt,
        promisedHandlingTime: promisedStr,
        promisedHours,
        dispatchedAt,
        actualHours: isDispatched ? actualHours : null,
        isDispatched,
        complianceStatus,
        isOnTime,
        delayHours,
        status: order.status,
        warehouseLocation: order.warehouseLocationLabel || order.warehouseLocation,
      }
    })

    const avgActualDispatchHours = dispatchedOrdersCount > 0
      ? Number((totalActualDispatchHours / dispatchedOrdersCount).toFixed(1))
      : 0

    const dispatchOnTimeRate = dispatchedOrdersCount > 0
      ? Math.round((onTimeDispatchedCount / dispatchedOrdersCount) * 100)
      : (orders.length > 0 && overduePendingCount === 0 ? 100 : 0)

    // 4. Group reviews by Product
    const productReviewsMap = new Map()
    reviews.forEach((r) => {
      const prodId = r.product?._id?.toString() || r.product?.toString() || 'unknown'
      const prodName = r.product?.name || 'Product Item'
      const prodSku = r.product?.sku || '—'
      const prodImage = (r.product?.images && r.product.images[0]) || ''

      if (!productReviewsMap.has(prodId)) {
        productReviewsMap.set(prodId, {
          productId: prodId,
          productName: prodName,
          sku: prodSku,
          image: prodImage,
          totalReviews: 0,
          sumRating: 0,
          reviews: [],
        })
      }

      const pGroup = productReviewsMap.get(prodId)
      pGroup.totalReviews += 1
      pGroup.sumRating += (r.productRating || 5)
      pGroup.reviews.push({
        id: r._id.toString(),
        orderNo: r.order?.orderNo || '—',
        reviewerName: r.reviewerName || r.user?.fullName || 'Verified Buyer',
        productQualityRating: r.productQualityRating || r.productRating || 5,
        productPerformanceRating: r.productPerformanceRating || r.productRating || 5,
        supplierServicesRating: r.supplierServicesRating || r.deliveryRating || 5,
        supplierPerformanceRating: r.supplierPerformanceRating || r.deliveryRating || 5,
        productRating: r.productRating || 5,
        deliveryRating: r.deliveryRating || 5,
        deliveredOnTime: Boolean(r.deliveredOnTime),
        comment: r.comment || '',
        date: r.createdAt,
      })
    })

    const productReviewsList = Array.from(productReviewsMap.values()).map((p) => ({
      ...p,
      averageRating: p.totalReviews > 0 ? Number((p.sumRating / p.totalReviews).toFixed(1)) : 0,
    }))

    // 5. Supplier Reviews List
    const supplierReviewsList = reviews.map((r) => ({
      id: r._id.toString(),
      orderNo: r.order?.orderNo || '—',
      productName: r.product?.name || 'Item',
      productSku: r.product?.sku || '—',
      reviewerName: r.reviewerName || r.user?.fullName || 'Verified Buyer',
      productQualityRating: r.productQualityRating || r.productRating || 5,
      productPerformanceRating: r.productPerformanceRating || r.productRating || 5,
      supplierServicesRating: r.supplierServicesRating || r.deliveryRating || 5,
      supplierPerformanceRating: r.supplierPerformanceRating || r.deliveryRating || 5,
      supplierDeliveryRating: r.deliveryRating || 5,
      productRating: r.productRating || 5,
      deliveredOnTime: Boolean(r.deliveredOnTime),
      comment: r.comment || '',
      date: r.createdAt,
    }))

    const rawSupplierId = supplier._id.toString()
    const supplierDisplayId =
      supplier.displayId ||
      (supplier.clientId && /^SPAK-\d+$/i.test(supplier.clientId) ? supplier.clientId : '') ||
      `SPAK-${1001 + (parseInt(rawSupplierId.slice(-4), 16) % 8999)}`

    return res.json({
      success: true,
      supplier: {
        id: rawSupplierId,
        fullName: supplier.fullName,
        email: supplier.email,
        phone: supplier.phone || '',
        supplierDisplayId,
        businessName: profile?.businessName || supplier.companyName || supplier.fullName,
        supplierType: supplier.isWmsRegistered ? 'WMS 3PL Integrated' : 'Direct Marketplace Vendor',
        status: supplier.status,
        warningsCount: supplier.warningsCount || 0,
        warnings: supplier.warnings || [],
        penalties: supplier.penalties || [],
        suspensionReason: supplier.suspensionReason || '',
        suspendedAt: supplier.suspendedAt || null,
        joined: supplier.createdAt,
      },
      metrics: {
        overallRating,
        totalReviews,
        positivePercentage,
        positiveCount,
        neutralCount,
        negativeCount,
        ratingDistribution,
        avgProductRating,
        avgDeliveryRating,
        customerOnTimePct,
        // Dispatch SLA & Handover metrics
        totalOrders: orders.length,
        dispatchedOrdersCount,
        pendingHandoverCount,
        onTimeDispatchedCount,
        lateDispatchedCount,
        overduePendingCount,
        dispatchOnTimeRate,
        avgActualDispatchHours,
      },
      comparisonList,
      supplierReviews: supplierReviewsList,
      productReviews: productReviewsList,
    })
  } catch (error) {
    console.error('getSupplierPerformanceReport error:', error)
    return res.status(500).json({ message: error.message || 'Failed to generate performance report.' })
  }
}

/**
 * Record a penalty on supplier account
 * POST /api/admin/suppliers/:id/penalty
 */
export const penalizeSupplierAccount = async (req, res) => {
  try {
    const { id } = req.params
    const { amount = 0, reason, details } = req.body

    const supplier = await User.findById(id)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier account not found.' })
    }

    const penaltyNum = (supplier.penalties?.length || 0) + 1
    const penaltyRecord = {
      penaltyNumber: penaltyNum,
      amount: Number(amount) || 0,
      reason: reason?.trim() || 'SLA Dispatch Breach & Low Performance Penalty',
      details: details?.trim() || '',
      penalizedAt: new Date(),
      penalizedBy: req.user?._id,
    }

    if (!supplier.penalties) supplier.penalties = []
    supplier.penalties.push(penaltyRecord)
    await supplier.save()

    try {
      await createNotification({
        userId: supplier._id,
        title: `⚠️ Performance Penalty Notice #${penaltyNum}`,
        message: `Admin has recorded a performance penalty${amount > 0 ? ` ($${amount})` : ''}: ${penaltyRecord.reason}`,
        type: 'account',
      })
    } catch {}

    return res.json({
      success: true,
      message: `Penalty notice #${penaltyNum} recorded successfully.`,
      penalties: supplier.penalties,
    })
  } catch (error) {
    console.error('Penalize supplier error:', error)
    return res.status(500).json({ message: error.message || 'Failed to record penalty.' })
  }
}

/**
 * Admin sends direct message / official warning notice to supplier
 * Creates a dispute thread in the Supplier Panel's Disputes section
 * POST /api/admin/suppliers/:id/send-message
 */
export const sendSupplierMessage = async (req, res) => {
  try {
    const { id } = req.params
    const { message, subject = 'Notice from Administration', isWarning = false } = req.body

    const trimmedMsg = String(message || '').trim()
    if (!trimmedMsg) {
      return res.status(400).json({ message: 'Message text is required.' })
    }

    const supplier = await User.findById(id)
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier account not found.' })
    }

    // Generate dispute number (Pattern: 26-D-0001)
    let disputeNo = ''
    try {
      disputeNo = await getNextDisputeNo()
    } catch {
      const yy = new Date().getFullYear().toString().slice(-2)
      disputeNo = `${yy}-D-${String(Date.now()).slice(-4)}`
    }

    const fullMessage = subject
      ? `[${isWarning ? 'OFFICIAL WARNING / NOTICE' : 'ADMIN MESSAGE'}] ${subject.trim()}:\n\n${trimmedMsg}`
      : trimmedMsg

    const now = new Date()
    const dispute = await Dispute.create({
      disputeNo,
      raisedBy: req.user._id,
      againstRole: 'supplier',
      againstUser: supplier._id,
      type: 'supplier_dispute',
      message: fullMessage,
      status: 'open',
      chatWindowExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days chat window
      messages: [
        {
          sender: req.user._id,
          text: fullMessage,
          role: 'admin',
          createdAt: now,
        },
      ],
    })

    // If marked as warning, also increment warnings and record in supplier warnings log
    let autoSuspended = false
    if (isWarning) {
      if (!supplier.warnings) supplier.warnings = []
      const nextWarnNum = (supplier.warningsCount || supplier.warnings.length || 0) + 1
      supplier.warnings.push({
        warningNumber: nextWarnNum,
        reason: subject || 'Administrative Performance Warning',
        details: trimmedMsg,
        warnedAt: now,
        warnedBy: req.user._id,
      })
      supplier.warningsCount = nextWarnNum

      if (nextWarnNum >= 3) {
        supplier.status = 'suspended'
        supplier.suspensionReason =
          subject || 'Account automatically suspended: Reached maximum limit of 3 performance warnings.'
        supplier.suspendedAt = now
        autoSuspended = true

        await Product.updateMany(
          { supplier: supplier._id, status: 'active' },
          { status: 'inactive' },
        )
      }

      await supplier.save()
    }

    // In-app Notification for supplier
    try {
      await createNotification({
        userId: supplier._id,
        title: isWarning ? '⚠️ Official Warning from Administration' : '📩 Message from Administration',
        message: `Admin has sent you a message: "${subject || 'Notice'}". Check your Disputes section to view and reply.`,
        type: 'dispute',
      })
    } catch {}

    return res.status(201).json({
      success: true,
      message: `Message sent successfully. Dispute #${disputeNo} has been opened in the Supplier Panel.`,
      disputeId: dispute._id,
      disputeNo,
    })
  } catch (error) {
    console.error('sendSupplierMessage error:', error)
    return res.status(500).json({ message: error.message || 'Failed to send message to supplier.' })
  }
}

export const listAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50))
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      AdminAuditLog.find()
        .populate('adminId', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(),
    ])

    return res.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to list audit logs.' })
  }
}






