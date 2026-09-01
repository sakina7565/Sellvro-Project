import WalletRequest from '../models/WalletRequest.js'
import BusinessProfile from '../models/BusinessProfile.js'
import User from '../models/User.js'

async function withBusinessName(requests) {
  const userIds = [
    ...new Set(
      requests.map((item) => item.user?._id?.toString?.() || item.user?.toString?.()).filter(Boolean),
    ),
  ]
  const profiles = await BusinessProfile.find({ user: { $in: userIds } }).select('user businessName')
  const map = Object.fromEntries(
    profiles.map((profile) => [profile.user.toString(), profile.businessName || 'No Business']),
  )

  return requests.map((item) => {
    const uid = item.user?._id?.toString?.() || item.user?.toString?.() || ''
    return item.toSafeObject(map[uid] || 'No Business')
  })
}

export const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    return res.json({
      balance: user?.walletBalance || 0,
      walletBalance: user?.walletBalance || 0,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load wallet balance.' })
  }
}

export const createWalletRequest = async (req, res) => {
  try {
    const amount = Number(req.body.amount)
    const bankTid = String(req.body.bankTid || req.body.tid || '').trim()

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'A valid deposit amount is required.' })
    }
    if (!bankTid) {
      return res.status(400).json({ message: 'Bank TID is required.' })
    }

    const receiptImage = req.file ? `/uploads/${req.file.filename}` : String(req.body.receiptImage || '').trim()

    const request = await WalletRequest.create({
      user: req.user._id,
      amount,
      bankTid,
      receiptImage,
      status: 'pending',
    })

    await request.populate('user', 'fullName email role')
    const [safe] = await withBusinessName([request])

    return res.status(201).json({
      message: 'Deposit request submitted. Waiting for admin approval.',
      request: safe,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create wallet request.' })
  }
}

export const listMyWalletRequests = async (req, res) => {
  try {
    const requests = await WalletRequest.find({ user: req.user._id })
      .populate('user', 'fullName email role')
      .sort({ createdAt: -1 })

    return res.json({ data: await withBusinessName(requests) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load wallet requests.' })
  }
}

export const listAllWalletRequests = async (_req, res) => {
  try {
    const requests = await WalletRequest.find()
      .populate('user', 'fullName email role')
      .sort({ createdAt: -1 })

    return res.json({ data: await withBusinessName(requests) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load wallet requests.' })
  }
}

export const approveWalletRequest = async (req, res) => {
  try {
    const request = await WalletRequest.findById(req.params.id).populate('user', 'fullName email role')
    if (!request) {
      return res.status(404).json({ message: 'Wallet request not found.' })
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` })
    }

    const user = await User.findById(request.user._id || request.user)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    user.walletBalance = Number(((user.walletBalance || 0) + request.amount).toFixed(2))
    request.status = 'approved'
    if (req.body?.adminNote) request.adminNote = String(req.body.adminNote).trim()

    await user.save()
    await request.save()

    const [safe] = await withBusinessName([request])
    return res.json({
      message: 'Wallet request approved. Balance updated.',
      request: safe,
      walletBalance: user.walletBalance,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to approve wallet request.' })
  }
}

export const rejectWalletRequest = async (req, res) => {
  try {
    const request = await WalletRequest.findById(req.params.id).populate('user', 'fullName email role')
    if (!request) {
      return res.status(404).json({ message: 'Wallet request not found.' })
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` })
    }

    request.status = 'rejected'
    if (req.body?.adminNote) request.adminNote = String(req.body.adminNote).trim()
    await request.save()

    const [safe] = await withBusinessName([request])
    return res.json({
      message: 'Wallet request rejected.',
      request: safe,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reject wallet request.' })
  }
}
