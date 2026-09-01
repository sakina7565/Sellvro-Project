import User from '../models/User.js'
import Role from '../models/Role.js'
import BusinessProfile from '../models/BusinessProfile.js'

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
