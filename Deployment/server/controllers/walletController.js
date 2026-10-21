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

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', ratePerUsd: 1, feePercent: 0 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', ratePerUsd: 278.50, feePercent: 2.5 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', ratePerUsd: 3.67, feePercent: 2.0 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', ratePerUsd: 3.75, feePercent: 2.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', ratePerUsd: 0.92, feePercent: 2.0 },
  { code: 'GBP', name: 'British Pound', symbol: '£', ratePerUsd: 0.79, feePercent: 2.0 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', ratePerUsd: 84.00, feePercent: 2.5 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', ratePerUsd: 1.38, feePercent: 2.0 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', ratePerUsd: 34.50, feePercent: 3.0 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', ratePerUsd: 3.64, feePercent: 2.0 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', ratePerUsd: 0.31, feePercent: 2.0 },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', ratePerUsd: 0.385, feePercent: 2.0 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', ratePerUsd: 120.00, feePercent: 2.5 },
]

export const getCurrencies = (_req, res) => {
  return res.json({ currencies: SUPPORTED_CURRENCIES })
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
    const rawCurrency = String(req.body.depositCurrency || req.body.currency || 'USD').trim().toUpperCase()
    const foundCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === rawCurrency) || {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      ratePerUsd: 1,
      feePercent: 0,
    }

    const rawDepositAmount = Number(req.body.depositAmount ?? req.body.amount)
    const bankTid = String(req.body.bankTid || req.body.tid || '').trim()

    if (!Number.isFinite(rawDepositAmount) || rawDepositAmount <= 0) {
      return res.status(400).json({ message: 'A valid deposit amount is required.' })
    }
    if (!bankTid) {
      return res.status(400).json({ message: 'Bank TID is required.' })
    }

    const receiptImage = req.file ? `/uploads/${req.file.filename}` : String(req.body.receiptImage || '').trim()

    if (!receiptImage) {
      return res.status(400).json({ message: 'Receipt image is required. Please upload your payment receipt / deposit slip.' })
    }

    // Ensure Bank Transaction ID (TID) is strictly unique across all wallet requests
    const existingTid = await WalletRequest.findOne({
      bankTid: { $regex: new RegExp(`^${bankTid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    if (existingTid) {
      return res.status(400).json({
        message: `This Bank Transaction ID (${bankTid}) has already been used for another request. Please provide a valid, unique Bank TID.`,
      })
    }

    // Currency conversion calculations
    const rate = foundCurrency.ratePerUsd || 1
    const grossUsd = Number((rawDepositAmount / rate).toFixed(2))
    const feeRate = foundCurrency.feePercent || 0
    const feeUsd = Number(((grossUsd * feeRate) / 100).toFixed(2))
    const netUsd = Number(Math.max(0.01, grossUsd - feeUsd).toFixed(2))

    const request = await WalletRequest.create({
      user: req.user._id,
      amount: netUsd, // Net amount in USD credited to wallet
      depositCurrency: foundCurrency.code,
      depositAmount: rawDepositAmount,
      exchangeRate: rate,
      grossAmount: grossUsd,
      conversionFeeRate: feeRate,
      conversionFee: feeUsd,
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
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'This Bank Transaction ID (TID) has already been used. Please provide a unique Bank TID.',
      })
    }
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
