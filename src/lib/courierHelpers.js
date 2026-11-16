/**
 * Courier and Tracking System Helpers for Sellvro Marketplace
 * Supports the 3 official couriers: FedEx, USPS, UPS.
 */

export const POPULAR_COURIERS = [
  {
    id: 'fedex',
    name: 'FedEx',
    fullName: 'Federal Express',
    prefix: 'FDX',
    region: 'Global Express & Domestic',
    placeholder: 'e.g. 7946 1234 5678',
    hint: '12, 14, or 15 digits',
    color: '#4D148C',
    transitEstimate: '2 - 3 Business Days',
  },
  {
    id: 'usps',
    name: 'USPS',
    fullName: 'United States Postal Service',
    prefix: 'USP',
    region: 'USA & International Postal',
    placeholder: 'e.g. 9400 1118 9956 2537 6241 12',
    hint: '20-22 digits starting with 94/92/93, or international code',
    color: '#004B87',
    transitEstimate: '3 - 5 Business Days',
  },
  {
    id: 'ups',
    name: 'UPS',
    fullName: 'United Parcel Service',
    prefix: 'UPS',
    region: 'Global Express & Freight',
    placeholder: 'e.g. 1Z9999999999999999',
    hint: '18 characters starting with 1Z, or 9-12 digits',
    color: '#351C15',
    transitEstimate: '2 - 4 Business Days',
  },
]

/**
 * Validates courier tracking number format for real carrier numbers
 */
export function validateCarrierTracking(carrierName = '', trackingNumber = '') {
  const c = String(carrierName || '').toLowerCase().trim()
  const raw = String(trackingNumber || '').trim()

  if (!raw) {
    return { valid: false, message: 'Courier tracking number is required.' }
  }

  const clean = raw.replace(/\s+/g, '')

  // Disallow fake mock numbers in production
  if (clean.toUpperCase().startsWith('SLV-') || clean.toUpperCase().startsWith('TEST-')) {
    return {
      valid: false,
      message: 'Please enter a genuine tracking number issued by your courier company (not a simulated Sellvro ID).',
    }
  }

  if (c.includes('ups')) {
    const isUps1Z = /^1Z[0-9A-Z]{16}$/i.test(clean)
    const isUpsNumeric = /^\d{9,12}$/.test(clean)
    if (!isUps1Z && !isUpsNumeric) {
      return {
        valid: false,
        message: 'Invalid UPS tracking number. Standard UPS numbers start with "1Z" followed by 16 alphanumeric characters (or 9-12 digits).',
      }
    }
  } else if (c.includes('fedex')) {
    const isFedexStandard = /^\d{12,15}$/.test(clean)
    if (!isFedexStandard) {
      return {
        valid: false,
        message: 'Invalid FedEx tracking number. Standard FedEx numbers are 12, 14, or 15 digits.',
      }
    }
  } else if (c.includes('usps')) {
    const isUspsDomestic = /^\d{20,24}$/.test(clean)
    const isUspsIntl = /^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(clean)
    if (!isUspsDomestic && !isUspsIntl) {
      return {
        valid: false,
        message: 'Invalid USPS tracking number. Standard USPS numbers are 20-22 digits (e.g. 9400...) or 13-character international codes (e.g. EA123456789US).',
      }
    }
  } else if (c.includes('dhl')) {
    const isDhl = /^\d{10,11}$/.test(clean)
    if (!isDhl) {
      return {
        valid: false,
        message: 'Invalid DHL tracking number. Standard DHL Express numbers are 10 digits.',
      }
    }
  }

  return { valid: true }
}

/**
 * Returns external official courier tracking link for any supported carrier
 */
export function getCourierExternalTrackingUrl(carrierName = '', trackingNumber = '') {
  if (!trackingNumber) return null
  const c = String(carrierName || '').toLowerCase().trim()
  const trk = encodeURIComponent(String(trackingNumber).trim().replace(/\s+/g, ''))

  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trk}`
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trk}`
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trk}`

  return `https://www.fedex.com/fedextrack/?trknbr=${trk}`
}

/**
 * Detects the best-matched courier company based on destination country and city
 */
export function detectBestCourierByLocation(country = '', city = '') {
  const c = String(country || '').trim().toLowerCase()
  const ci = String(city || '').trim().toLowerCase()

  // 1. Pakistan Domestic & Regional
  const pkKeywords = [
    'pakistan',
    'karachi',
    'lahore',
    'islamabad',
    'rawalpindi',
    'faisalabad',
    'peshawar',
    'multan',
    'sialkot',
    'gujranwala',
    'quetta',
    'hyderabad',
  ]
  if (pkKeywords.some((k) => c.includes(k) || ci.includes(k))) {
    return {
      carrierId: 'tcs',
      carrierName: 'TCS Express',
      reason: 'Auto-matched TCS Express (Pakistan Fast-Track Domestic Logistics)',
      regionTone: 'domestic_pk',
    }
  }

  // 2. United States & North America
  const usKeywords = ['united states', 'usa', 'us', 'canada', 'america', 'california', 'texas', 'new york', 'florida']
  if (usKeywords.some((k) => c.includes(k) || ci.includes(k))) {
    return {
      carrierId: 'usps',
      carrierName: 'USPS',
      reason: 'Auto-matched USPS (United States Postal Service & Priority Mail)',
      regionTone: 'north_america',
    }
  }

  // 3. Middle East / UAE / GCC
  const meKeywords = ['uae', 'emirates', 'dubai', 'abu dhabi', 'saudi', 'riyadh', 'jeddah', 'qatar', 'doha', 'kuwait', 'oman', 'bahrain']
  if (meKeywords.some((k) => c.includes(k) || ci.includes(k))) {
    return {
      carrierId: 'fedex',
      carrierName: 'FedEx',
      reason: 'Auto-matched FedEx Express (Middle East & GCC Priority Airway Network)',
      regionTone: 'middle_east',
    }
  }

  // 4. Europe, UK & Global International
  return {
    carrierId: 'dhl',
    carrierName: 'DHL Express',
    reason: 'Auto-matched DHL Express (Global International Air Freight)',
    regionTone: 'international',
  }
}

/**
 * Stages for the visual tracker progress stepper
 */
export const TRACKING_STAGES = [
  { key: 'placed', label: 'Order Placed', step: 1 },
  { key: 'processing', label: 'Warehouse Pick & Pack', step: 2 },
  { key: 'in_transit', label: 'Handed Over to Courier', step: 3 },
  { key: 'out_for_delivery', label: 'Out for Delivery', step: 4 },
  { key: 'delivered', label: 'Delivered', step: 5 },
]

export function getTrackingProgressPercent(status = '') {
  const s = String(status).toLowerCase().trim()
  if (s === 'delivered') return 100
  if (s === 'out_for_delivery') return 75
  if (s === 'in_transit') return 50
  if (s === 'processing' || s === 'in_process') return 25
  return 10
}

/**
 * Generates an automated tracking ID for testing/demo environments
 */
export function generateAutomatedTrackingId(carrierName = 'FedEx', orderNo = '') {
  const c = String(carrierName || '').toLowerCase()
  if (c.includes('ups')) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let randCode = ''
    for (let i = 0; i < 16; i++) randCode += chars[Math.floor(Math.random() * chars.length)]
    return `1Z${randCode}`
  }
  if (c.includes('fedex')) {
    const fdx = Math.floor(700000000000 + Math.random() * 299999999999)
    return String(fdx)
  }
  if (c.includes('dhl')) {
    return String(Math.floor(1000000000 + Math.random() * 9000000000))
  }
  if (c.includes('tcs')) {
    const tcsNum = Math.floor(770000000000 + Math.random() * 299999999999)
    return String(tcsNum)
  }
  if (c.includes('leopard')) {
    const leoNum = Math.floor(100000000 + Math.random() * 899999999)
    return `LE${leoNum}`
  }
  const uspsTail = Math.floor(100000000000000000 + Math.random() * 900000000000000000)
  return `9400${String(uspsTail).slice(0, 18)}`
}
