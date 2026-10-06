import BusinessProfile from '../models/BusinessProfile.js'

export const getMyBusiness = async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ user: req.user._id })
    return res.json({
      user: req.user.toSafeObject(),
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

    if (!businessName || !businessCategory) {
      return res.status(400).json({ message: 'Business name and category are required.' })
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        profileType: req.user.role,
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
        status: 'pending',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    req.user.status = 'pending_approval'
    await req.user.save()

    return res.json({
      message: 'Business details submitted. Waiting for admin approval.',
      user: req.user.toSafeObject(),
      profile,
    })
  } catch (error) {
    console.error('Submit business error:', error)
    return res.status(500).json({ message: error.message || 'Failed to submit business details.' })
  }
}
