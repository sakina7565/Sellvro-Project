import User from '../models/User.js'
import Role from '../models/Role.js'
import BusinessProfile from '../models/BusinessProfile.js'
import AdminNotification from '../models/AdminNotification.js'
import Order from '../models/Order.js'
import { signToken } from '../middleware/auth.js'
import { setAuthCookie, setImpersonatorCookie, readAuthToken } from '../utils/authCookie.js'

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
        email: user.email,
        location: [profile?.city, profile?.country].filter(Boolean).join(', ') || '—',
        category: profile?.businessCategory || '—',
        paymentProvider: profile?.paymentProvider || 'Not Set',
        joined: formatJoined(user.createdAt),
        status: 'Pending',
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
        email: user.email,
        fullName: user.fullName,
        wallet: '$0',
        location: [profile?.city, profile?.country].filter(Boolean).join(', ') || '—',
        joined: formatJoined(user.createdAt),
        status: 'Pending',
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

    const data = users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      wallet: '$0',
      joined: formatJoined(user.createdAt),
      status: user.status === 'suspended' ? 'suspended' : 'approved',
    }))

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

    const query = {}

    if (role === 'supplier' || role === 'user') {
      query.role = role
    } else {
      query.role = { $in: ['supplier', 'user'] }
    }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i')
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
    const [profiles, orderCounts] = await Promise.all([
      BusinessProfile.find({ user: { $in: userIds } }),
      Order.aggregate([
        {
          $match: {
            $or: [{ supplier: { $in: userIds } }, { user: { $in: userIds } }],
          },
        },
        {
          $group: {
            _id: {
              $cond: [{ $in: ['$supplier', userIds] }, '$supplier', '$user'],
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]))
    const orderMap = new Map(orderCounts.map((o) => [o._id.toString(), o.count]))

    const [totalSuppliers, totalUsers, totalApproved, totalSuspended, totalPending] = await Promise.all([
      User.countDocuments({ role: 'supplier' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: { $in: ['supplier', 'user'] }, status: 'approved' }),
      User.countDocuments({ role: { $in: ['supplier', 'user'] }, status: 'suspended' }),
      User.countDocuments({ role: { $in: ['supplier', 'user'] }, status: { $in: ['pending_approval', 'pending_details'] } }),
    ])

    const data = users.map((user) => {
      const profile = profileMap.get(user._id.toString())
      return {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        walletBalance: user.walletBalance ?? 0,
        joined: formatJoined(user.createdAt),
        createdAt: user.createdAt,
        ordersCount: orderMap.get(user._id.toString()) || 0,
        businessProfile: profile
          ? {
              businessName: profile.businessName || '',
              businessCategory: profile.businessCategory || '',
              businessPhone: profile.businessPhone || '',
              city: profile.city || '',
              country: profile.country || '',
              location: [profile.city, profile.country].filter(Boolean).join(', ') || '—',
              paymentProvider: profile.paymentProvider || 'Not set',
            }
          : null,
      }
    })

    return res.json({
      data,
      stats: {
        totalAccounts: totalSuppliers + totalUsers,
        totalSuppliers,
        totalUsers,
        totalApproved,
        totalSuspended,
        totalPending,
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
      role,
      status = 'approved',
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

    if (!['supplier', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either "supplier" or "user".' })
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

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      status: finalStatus,
      walletBalance: Math.max(0, Number(walletBalance) || 0),
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

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot modify administrator accounts via this endpoint.' })
    }

    if (fullName?.trim()) user.fullName = fullName.trim()

    if (email?.trim() && email.toLowerCase().trim() !== user.email) {
      const conflict = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } })
      if (conflict) {
        return res.status(400).json({ message: 'Email address is already in use by another account.' })
      }
      user.email = email.toLowerCase().trim()
    }

    if (role && ['supplier', 'user'].includes(role)) {
      user.role = role
    }

    if (status && ['approved', 'pending_approval', 'pending_details', 'suspended', 'rejected'].includes(status)) {
      user.status = status
    }

    if (walletBalance !== undefined && !isNaN(Number(walletBalance))) {
      user.walletBalance = Math.max(0, Number(walletBalance))
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' })
      }
      user.password = password
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
      return res.status(403).json({ message: 'Cannot delete administrator accounts.' })
    }

    await BusinessProfile.deleteMany({ user: user._id })
    await User.findByIdAndDelete(user._id)

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

    // Capture the existing admin token, or generate a fresh one for the admin
    const adminToken = readAuthToken(req) || signToken(req.user._id)
    setImpersonatorCookie(res, adminToken)

    // Generate token for target user and set as the active session
    const targetToken = signToken(targetUser._id)
    setAuthCookie(res, targetToken)

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


