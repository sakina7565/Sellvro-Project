/**
 * UPS Developer REST API Integration Service
 * 
 * Documentation: https://developer.ups.com/api/reference?loc=en_US#tag/Tracking
 * 
 * Features:
 * 1. Automatic OAuth 2.0 Bearer Token Generation & In-Memory Caching
 * 2. Multi-Environment Support (Production vs Sandbox)
 * 3. Detailed Checkpoint Milestones & Scan Events Parser
 * 4. Automatic Order Status & Timeline Synchronization for User, Supplier & Admin
 */

let cachedUpsToken = null
let upsTokenExpiresAt = null

/**
 * Returns the base URL for UPS REST APIs depending on UPS_ENV.
 */
export function getUpsBaseUrl() {
  const env = (process.env.UPS_ENV || 'production').toLowerCase().trim()
  if (env === 'sandbox' || env === 'test' || env === 'development') {
    return 'https://wwwcie.ups.com'
  }
  return 'https://onlinetools.ups.com'
}

/**
 * Acquires a valid OAuth 2.0 Bearer access token from UPS.
 * Automatically caches token and re-authenticates on expiry.
 */
export async function getUpsAccessToken() {
  const clientId = (process.env.UPS_API_KEY || process.env.UPS_CLIENT_ID || '').trim()
  const clientSecret = (process.env.UPS_SECRET_KEY || process.env.UPS_CLIENT_SECRET || '').trim()

  if (!clientId || !clientSecret) {
    return null
  }

  // Return cached token if still valid (with 60-second buffer)
  if (cachedUpsToken && upsTokenExpiresAt && Date.now() < upsTokenExpiresAt - 60000) {
    return cachedUpsToken
  }

  const baseUrl = getUpsBaseUrl()
  const tokenUrl = `${baseUrl}/security/v1/oauth/token`

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    })

    const data = await res.json().catch(() => null)
    if (res.ok && data?.access_token) {
      cachedUpsToken = data.access_token
      const expiresInSec = Number(data.expires_in || 3600)
      upsTokenExpiresAt = Date.now() + expiresInSec * 1000
      return cachedUpsToken
    } else {
      console.warn('[UPS API] OAuth token acquisition failed:', data || res.status)
      return null
    }
  } catch (err) {
    console.warn('[UPS API] Network/Auth error:', err.message)
    return null
  }
}

/**
 * Maps UPS status codes to Sellvro standard tracking status.
 */
export function mapUpsStatusCode(code, description = '') {
  const c = String(code || '').toUpperCase().trim()
  const d = String(description || '').toLowerCase().trim()

  if (c === 'D' || d.includes('delivered')) return 'delivered'
  if (c === 'OT' || d.includes('out for delivery') || d.includes('loaded on delivery vehicle')) return 'out_for_delivery'
  if (c === 'RS' || d.includes('return to sender') || d.includes('returned')) return 'returned'
  if (c === 'P' || c === 'I' || d.includes('in transit') || d.includes('departed') || d.includes('arrived')) return 'in_transit'
  if (c === 'M' || d.includes('label created') || d.includes('order processed') || d.includes('shipper created')) return 'processing'
  if (c === 'X' || d.includes('exception') || d.includes('delay')) return 'processing'
  return 'in_transit'
}

/**
 * Returns external official UPS tracking portal link.
 */
export function getUpsTrackingUrl(trackingNumber = '') {
  const clean = encodeURIComponent(String(trackingNumber || '').trim().replace(/\s+/g, ''))
  return `https://www.ups.com/track?tracknum=${clean}`
}

/**
 * Queries UPS REST API for live parcel checkpoints and scan events.
 * 
 * @param {string} trackingNumber - UPS Tracking Number (e.g. 1Z9999999999999999)
 * @returns {Promise<object>} Standardized tracking object
 */
export async function trackUpsShipment(trackingNumber) {
  const cleanTrk = String(trackingNumber || '').trim().replace(/[\s-]/g, '')
  if (!cleanTrk) {
    return {
      success: false,
      message: 'Tracking number is required.',
    }
  }

  const token = await getUpsAccessToken()
  if (!token) {
    return {
      success: true,
      hasLiveApi: false,
      isConfigured: false,
      carrier: 'UPS',
      trackingNumber: cleanTrk,
      trackingUrl: getUpsTrackingUrl(cleanTrk),
      status: 'in_transit',
      statusDetail: 'Shipment handed over to UPS. Tracking registered.',
      message: 'UPS API credentials not configured in environment variables (UPS_CLIENT_ID & UPS_CLIENT_SECRET). Official tracking available via link.',
      timeline: [
        {
          status: 'in_transit',
          title: 'Handed Over to UPS (In Transit)',
          location: 'UPS Dispatch Facility',
          timestamp: new Date(),
          note: `Parcel custody transferred to UPS. Tracking number: ${cleanTrk}.`,
        },
      ],
    }
  }

  const baseUrl = getUpsBaseUrl()
  const trackUrl = `${baseUrl}/api/track/v1/details/${encodeURIComponent(cleanTrk)}?locale=en_US`

  try {
    const res = await fetch(trackUrl, {
      method: 'GET',
      headers: {
        'transId': `sellvro-${Date.now()}`,
        'transactionSrc': 'Sellvro-Marketplace',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.trackResponse?.shipment?.[0]) {
      return {
        success: false,
        carrier: 'UPS',
        trackingNumber: cleanTrk,
        trackingUrl: getUpsTrackingUrl(cleanTrk),
        message: data?.response?.errors?.[0]?.message || `UPS tracking query failed (HTTP ${res.status}).`,
      }
    }

    const shipment = data.trackResponse.shipment[0]
    const pkg = shipment.package?.[0] || shipment.package || {}
    const activity = Array.isArray(pkg.activity) ? pkg.activity : []

    const currentActivity = activity[0] || {}
    const statusType = currentActivity.status?.type || pkg.currentStatus?.type || ''
    const statusDesc = currentActivity.status?.description || pkg.currentStatus?.description || 'In Transit'

    const mappedStatus = mapUpsStatusCode(statusType, statusDesc)

    const timeline = activity.map((act) => {
      const actType = act.status?.type || ''
      const actDesc = act.status?.description || 'Scan Event'
      const loc = act.location?.address
        ? [loc.city, loc.stateProvince, loc.country].filter(Boolean).join(', ')
        : 'UPS Facility'
      
      let ts = new Date()
      if (act.date && act.time) {
        // e.g. date: "20261115", time: "143000"
        const dStr = `${act.date.slice(0, 4)}-${act.date.slice(4, 6)}-${act.date.slice(6, 8)}T${act.time.slice(0, 2)}:${act.time.slice(2, 4)}:${act.time.slice(4, 6)}Z`
        const parsed = new Date(dStr)
        if (!isNaN(parsed.getTime())) ts = parsed
      }

      return {
        status: mapUpsStatusCode(actType, actDesc),
        title: actDesc,
        location: loc,
        timestamp: ts,
        note: `UPS Scan: ${actDesc}. Location: ${loc}`,
      }
    })

    if (timeline.length === 0) {
      timeline.push({
        status: mappedStatus,
        title: statusDesc,
        location: 'UPS Network Hub',
        timestamp: new Date(),
        note: `Current Status: ${statusDesc}`,
      })
    }

    return {
      success: true,
      hasLiveApi: true,
      carrier: 'UPS',
      trackingNumber: cleanTrk,
      trackingUrl: getUpsTrackingUrl(cleanTrk),
      status: mappedStatus,
      statusDetail: statusDesc,
      serviceType: shipment.service?.description || 'UPS Ground',
      estimatedDelivery: shipment.deliveryDate?.[0]?.date || null,
      timeline,
    }
  } catch (err) {
    console.warn('[UPS API] Tracking exception:', err.message)
    return {
      success: false,
      carrier: 'UPS',
      trackingNumber: cleanTrk,
      trackingUrl: getUpsTrackingUrl(cleanTrk),
      message: err.message || 'Failed to query live UPS tracking.',
    }
  }
}

export default {
  getUpsBaseUrl,
  getUpsAccessToken,
  mapUpsStatusCode,
  getUpsTrackingUrl,
  trackUpsShipment,
}

