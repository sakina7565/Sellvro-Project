import WalletRequest from '../models/WalletRequest.js'
import BusinessProfile from '../models/BusinessProfile.js'
import User from '../models/User.js'
import WalletSetting from '../models/WalletSetting.js'

async function withBusinessName(requests) {
  const userIds = [
    ...new Set(
      requests.map((item) => item.user?._id?.toString?.() || item.user?.toString?.()).filter(Boolean),
    ),
  ]
  const profiles = await BusinessProfile.find({ user: { $in: userIds } })
  const map = Object.fromEntries(
    profiles.map((profile) => [profile.user.toString(), profile]),
  )

  return requests.map((item) => {
    const uid = item.user?._id?.toString?.() || item.user?.toString?.() || ''
    const profile = map[uid]
    return item.toSafeObject(profile?.businessName || 'No Business', profile)
  })
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', ratePerUsd: 1, feePercent: 0 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', ratePerUsd: 280.0, feePercent: 0 },
]

export const getCurrencies = async (_req, res) => {
  try {
    const setting = await WalletSetting.getOrCreate()
    const rate = setting.usdRatePerPkr || 280
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', ratePerUsd: 1, feePercent: 0 },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', ratePerUsd: rate, feePercent: 0 },
    ]
    return res.json({ currencies, settings: setting })
  } catch (_err) {
    return res.json({ currencies: SUPPORTED_CURRENCIES })
  }
}

export const getWalletSettings = async (_req, res) => {
  try {
    const setting = await WalletSetting.getOrCreate()
    return res.json({ data: setting })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load wallet settings.' })
  }
}

export const updateWalletSettings = async (req, res) => {
  try {
    const setting = await WalletSetting.getOrCreate()
    const { usdRatePerPkr, pkrAccounts, usdAccounts } = req.body

    if (usdRatePerPkr !== undefined) {
      const numRate = Number(usdRatePerPkr)
      if (!Number.isFinite(numRate) || numRate <= 0) {
        return res.status(400).json({ message: 'A valid USD exchange rate is required.' })
      }
      setting.usdRatePerPkr = numRate
    }

    if (req.body.marketplaceFeePercent !== undefined) {
      const fee = Number(req.body.marketplaceFeePercent)
      if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
        return res.status(400).json({ message: 'Marketplace fee must be a valid percentage between 0 and 100.' })
      }
      setting.marketplaceFeePercent = fee
    }

    if (Array.isArray(pkrAccounts)) {
      setting.pkrAccounts = pkrAccounts
    }

    if (Array.isArray(usdAccounts)) {
      setting.usdAccounts = usdAccounts
    }

    await setting.save()
    return res.json({
      message: 'Platform settings & exchange rate updated successfully.',
      data: setting,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update wallet settings.' })
  }
}

export const getMarketplaceFee = async (_req, res) => {
  try {
    const setting = await WalletSetting.getOrCreate()
    return res.json({
      success: true,
      marketplaceFeePercent: Number(setting.marketplaceFeePercent ?? 8),
    })
  } catch (error) {
    return res.json({ success: true, marketplaceFeePercent: 8 })
  }
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
    const setting = await WalletSetting.getOrCreate()
    const rate = rawCurrency === 'PKR' ? (setting.usdRatePerPkr || 280) : 1
    const foundCurrency = {
      code: rawCurrency === 'PKR' ? 'PKR' : 'USD',
      name: rawCurrency === 'PKR' ? 'Pakistani Rupee' : 'US Dollar',
      symbol: rawCurrency === 'PKR' ? '₨' : '$',
      ratePerUsd: rate,
      feePercent: 0,
    }

    const rawDepositAmount = Number(req.body.depositAmount ?? req.body.amount)
    const bankTid = String(req.body.bankTid || req.body.tid || '').trim()

    if (!Number.isFinite(rawDepositAmount) || rawDepositAmount <= 0) {
      return res.status(400).json({ message: 'A valid deposit amount is required.' })
    }
    if (!bankTid) {
      return res.status(400).json({ message: 'Bank Transaction ID (TID) is required. You cannot submit without TID.' })
    }

    const receiptImage = req.file ? `/uploads/${req.file.filename}` : String(req.body.receiptImage || '').trim()

    if (!receiptImage) {
      return res.status(400).json({ message: 'Payment receipt / deposit slip screenshot is essential and strictly required.' })
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

    // Currency conversion calculations (0% fee — no fee deducted)
    const grossUsd = Number((rawDepositAmount / rate).toFixed(2))
    const feeRate = 0
    const feeUsd = 0
    const netUsd = Number(Math.max(0.01, grossUsd).toFixed(2))

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
      .populate('user', 'fullName email role walletBalance status')
      .sort({ createdAt: -1 })

    return res.json({ data: await withBusinessName(requests) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load wallet requests.' })
  }
}

export const listAllWalletRequests = async (_req, res) => {
  try {
    const requests = await WalletRequest.find()
      .populate('user', 'fullName email role walletBalance status')
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
