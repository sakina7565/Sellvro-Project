import BusinessProfile from '../models/BusinessProfile.js'
import User from '../models/User.js'
import {
  saveWmsSupplierBusinessDetails,
  findWmsUserByEmail,
} from '../services/wmsSqlService.js'
import { validateIban } from '../utils/ibanValidator.js'

export const getMyBusiness = async (req, res) => {
  try {
    let targetUser = req.user

    // If Admin is inspecting a specific applicant/supplier
    if (req.user.role === 'admin' && req.query.userId) {
      const found = await User.findById(req.query.userId)
      if (found) {
        targetUser = found
      }
    }

    const profile = await BusinessProfile.findOne({ user: targetUser._id })
    return res.json({
      user: targetUser.toSafeObject(),
      profile,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load business details.' })
  }
}

export const submitBusinessDetails = async (req, res) => {
  try {
    if (!['supplier', 'user'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only suppliers and users submit business details.' })
    }

    if (req.user.status === 'approved') {
      return res.status(400).json({ message: 'Your account is already approved.' })
    }

    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      // registrationEntity,
      // registrationNo,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerAddress,
      bankName,
      accountHolderName,
      accountNumberOrIban,
      idCardNumber,
      // fallback / legacy keys
      businessName,
      businessDescription,
      businessCategory,
      businessEmail,
      businessPhone,
      businessAddress,
      country,
      city,
      orderType,
      paymentProvider,
      accNumber,
      cardDate,
    } = req.body

    const finalCompanyName = (companyName || businessName || '').trim()
    const finalCompanyEmail = (companyEmail || businessEmail || '').trim().toLowerCase()
    const finalCompanyPhone = (companyPhone || businessPhone || '').trim()
    const finalCompanyAddress = (companyAddress || businessAddress || '').trim()
    const finalRegistrationEntity = (registrationEntity || '').trim()
    const finalRegistrationNo = (registrationNo || '').trim()

    const finalOwnerName = (ownerName || req.user.fullName || '').trim()
    const finalOwnerEmail = (ownerEmail || req.user.email || '').trim().toLowerCase()
    const finalOwnerPhone = (ownerPhone || '').trim()
    const finalOwnerAddress = (ownerAddress || '').trim()

    const finalBankName = (bankName || paymentProvider || '').trim()
    const finalAccountHolderName = (accountHolderName || ownerName || req.user.fullName || '').trim()
    const finalAccountNumberOrIban = (accountNumberOrIban || accNumber || '').trim()

    const finalIdCardNumber = (idCardNumber || '').trim()
    let finalIdCardUrl = req.body.idCardUrl || ''
    if (req.file) {
      finalIdCardUrl = `/uploads/${req.file.filename}`
    }

    // ── Backend Bank & IBAN Verification Check ──
    if (!finalBankName) {
      return res.status(400).json({
        message: 'Bank / Financial Institution Name is strictly required for business verification.',
      })
    }
    if (!finalAccountHolderName) {
      return res.status(400).json({
        message: 'Bank Account Holder Name is strictly required.',
      })
    }
    if (!finalAccountNumberOrIban) {
      return res.status(400).json({
        message: 'Bank Account Number / IBAN is strictly required.',
      })
    }

    const ibanCheck = validateIban(finalAccountNumberOrIban)
    if (!ibanCheck.isValid) {
      return res.status(400).json({
        message: ibanCheck.error || 'Invalid Bank Account / IBAN format.',
      })
    }

    // ── Backend CNIC Verification & Format Check ──
    const digits = String(finalIdCardNumber).replace(/\D+/g, '')
    if (digits.length !== 13) {
      return res.status(400).json({
        message: 'Valid 13-digit Pakistani CNIC number (format: XXXXX-XXXXXXX-X) is strictly required.',
      })
    }
    const province = parseInt(digits[0], 10)
    if (province < 1 || province > 7) {
      return res.status(400).json({
        message: 'Invalid CNIC. Pakistani CNIC number must begin with a valid province code (1-7).',
      })
    }
    const normalizedCnic = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`

    // ── Check CNIC Uniqueness in Backend ──
    const duplicateUser = await User.findOne({
      idCardNumber: { $in: [normalizedCnic, digits] },
      _id: { $ne: req.user._id },
    })
    if (duplicateUser) {
      return res.status(400).json({
        message: `Ye CNIC number (${normalizedCnic}) pehle se ek doosre account k sath registered hai. Ek CNIC se sirf ek hi account register ho sakta hai.`,
        isDuplicateCnic: true,
      })
    }

    const duplicateProfile = await BusinessProfile.findOne({
      idCardNumber: { $in: [normalizedCnic, digits] },
      user: { $ne: req.user._id },
    })
    if (duplicateProfile) {
      return res.status(400).json({
        message: `Ye CNIC number (${normalizedCnic}) pehle se ek doosre account k sath registered hai. Ek CNIC se sirf ek hi account register ho sakta hai.`,
        isDuplicateCnic: true,
      })
    }

    // ── Check ID Card Upload ──
    if (!finalIdCardUrl && !req.user.idCardUrl) {
      return res.status(400).json({
        message: 'CNIC / National ID Card photo is strictly mandatory for account verification.',
      })
    }

    if (req.file) {
      if (req.file.size < 15 * 1024) {
        return res.status(400).json({
          message: 'Uploaded CNIC image is too small or corrupted. Please upload a clear photo.',
        })
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(req.file.mimetype)) {
        return res.status(400).json({
          message: 'Only clear image files (JPG, PNG, WEBP) are accepted for CNIC verification.',
        })
      }
    }

    const effectiveBusinessName = finalCompanyName || finalOwnerName
    const effectiveCategory = (businessCategory || 'general').trim()

    if (!effectiveBusinessName) {
      return res.status(400).json({ message: 'Company Name or Business Name is required.' })
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        profileType: req.user.role,
        businessName: effectiveBusinessName,
        businessDescription: businessDescription || '',
        businessCategory: effectiveCategory,
        businessEmail: finalCompanyEmail || req.user.email,
        businessPhone: finalCompanyPhone,
        businessAddress: finalCompanyAddress,
        registrationEntity: finalRegistrationEntity,
        registrationNo: finalRegistrationNo,
        ownerName: finalOwnerName,
        ownerEmail: finalOwnerEmail,
        ownerPhone: finalOwnerPhone,
        ownerAddress: finalOwnerAddress,
        bankName: finalBankName,
        accountHolderName: finalAccountHolderName,
        accountNumberOrIban: finalAccountNumberOrIban,
        idCardNumber: normalizedCnic,
        ...(finalIdCardUrl ? { idCardUrl: finalIdCardUrl } : {}),
        country: country || 'Pakistan',
        city: city || '',
        orderType: orderType || 'B2B Wholesale',
        paymentProvider: finalBankName || 'Bank Transfer',
        accNumber: finalAccountNumberOrIban,
        cardDate: cardDate || '',
        status: 'pending',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    // Sync to User model
    if (finalCompanyName) req.user.companyName = finalCompanyName
    if (finalCompanyEmail) req.user.companyEmail = finalCompanyEmail
    if (finalCompanyPhone) req.user.companyPhone = finalCompanyPhone
    if (finalCompanyAddress) req.user.companyAddress = finalCompanyAddress
    if (finalRegistrationEntity) req.user.registrationEntity = finalRegistrationEntity
    if (finalRegistrationNo) req.user.registrationNo = finalRegistrationNo

    if (finalOwnerName) req.user.ownerName = finalOwnerName
    if (finalOwnerEmail) req.user.ownerEmail = finalOwnerEmail
    if (finalOwnerPhone) req.user.ownerPhone = finalOwnerPhone
    if (finalOwnerAddress) req.user.ownerAddress = finalOwnerAddress

    if (finalBankName) req.user.bankName = finalBankName
    if (finalAccountHolderName) req.user.accountHolderName = finalAccountHolderName
    if (finalAccountNumberOrIban) req.user.accountNumberOrIban = finalAccountNumberOrIban

    if (normalizedCnic) req.user.idCardNumber = normalizedCnic
    if (finalIdCardUrl) req.user.idCardUrl = finalIdCardUrl

    req.user.status = 'pending_approval'
    await req.user.save()

    // ── Sync to Master WMS MySQL supplier_business_details ──
    if (req.user.role === 'supplier') {
      try {
        let wmsId = req.user.wmsSupplierId
        if (!wmsId && req.user.email) {
          const wmsUser = await findWmsUserByEmail(req.user.email)
          if (wmsUser) {
            wmsId = wmsUser.id
            req.user.wmsSupplierId = wmsId
            req.user.wmsClientId = wmsUser.user_unique_name || ''
            req.user.isWmsRegistered = true
            await req.user.save()
          }
        }
        if (wmsId) {
          await saveWmsSupplierBusinessDetails(wmsId, {
            businessName: effectiveBusinessName,
            businessDescription: businessDescription || '',
            phone: finalCompanyPhone || finalOwnerPhone,
            businessEmail: finalCompanyEmail || req.user.email,
            address: finalCompanyAddress || finalOwnerAddress,
            country: country || 'Pakistan',
            city: city || '',
            orderType: orderType || 'B2B Wholesale',
            paymentMethod: finalBankName || 'Bank Transfer',
            accountNumber: finalAccountNumberOrIban,
          })
        }
      } catch (wmsErr) {
        console.warn('[Submit Business] WMS MySQL sync notice:', wmsErr.message)
      }
    }

    return res.json({
      message: 'Business details submitted successfully. Waiting for admin approval.',
      user: req.user.toSafeObject(),
      profile,
    })
  } catch (error) {
    console.error('Submit business error:', error)
    return res.status(500).json({ message: error.message || 'Failed to submit business details.' })
  }
}

/**
 * Verify CNIC Number format and uniqueness across accounts
 * POST /api/business/verify-cnic
 */
export const verifyCnicNumber = async (req, res) => {
  try {
    const { idCardNumber } = req.body
    if (!idCardNumber) {
      return res.status(400).json({ isValid: false, available: false, message: 'CNIC number is required.' })
    }

    const digits = String(idCardNumber).replace(/\D+/g, '')
    if (digits.length !== 13) {
      return res.status(400).json({
        isValid: false,
        available: false,
        message: 'Invalid CNIC format. Pakistani CNIC must contain exactly 13 digits.',
      })
    }

    const province = parseInt(digits[0], 10)
    if (province < 1 || province > 7) {
      return res.status(400).json({
        isValid: false,
        available: false,
        message: 'Invalid CNIC province code. Pakistani CNIC must begin with province code 1 through 7.',
      })
    }

    const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`

    // Check uniqueness across User collection (excluding current authenticated user)
    const currentUserId = req.user?._id
    const userQuery = {
      idCardNumber: { $in: [formatted, digits] },
      ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
    }
    const existingUser = await User.findOne(userQuery)

    if (existingUser) {
      return res.status(400).json({
        isValid: true,
        available: false,
        formattedCnic: formatted,
        message: `Ye CNIC number (${formatted}) pehle se ek doosre account k sath registered hai. Ek CNIC se sirf ek hi account register ho sakta hai.`,
        isDuplicate: true,
      })
    }

    const profileQuery = {
      idCardNumber: { $in: [formatted, digits] },
      ...(currentUserId ? { user: { $ne: currentUserId } } : {}),
    }
    const existingProfile = await BusinessProfile.findOne(profileQuery)

    if (existingProfile) {
      return res.status(400).json({
        isValid: true,
        available: false,
        formattedCnic: formatted,
        message: `Ye CNIC number (${formatted}) pehle se ek doosre account k sath registered hai. Ek CNIC se sirf ek hi account register ho sakta hai.`,
        isDuplicate: true,
      })
    }

    return res.json({
      isValid: true,
      available: true,
      formattedCnic: formatted,
      message: 'CNIC number is valid and available for registration.',
    })
  } catch (error) {
    console.error('verifyCnicNumber error:', error)
    return res.status(500).json({ message: error.message || 'Failed to verify CNIC.' })
  }
}

