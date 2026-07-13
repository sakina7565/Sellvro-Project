import User from '../models/User.js'
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
