/**
 * USPS Developer REST API Integration Service
 * 
 * Documentation: https://developer.usps.com/api/71
 * 
 * Features:
 * 1. Automatic OAuth 2.0 Bearer Token Generation & In-Memory Caching
 * 2. Multi-Environment Support (Production vs Sandbox)
 * 3. Detailed Checkpoint Milestones & Scan Events Parser
 * 4. Automatic Order Status & Timeline Synchronization for User, Supplier & Admin
 */

let cachedUspsToken = null
let uspsTokenExpiresAt = null

/**
 * Returns the base URL for USPS REST APIs depending on USPS_ENV.
 */
export function getUspsBaseUrl() {
  const env = (process.env.USPS_ENV || 'production').toLowerCase().trim()
  if (env === 'sandbox' || env === 'test' || env === 'development') {
    return 'https://api-cat.usps.com'
  }
  return 'https://api.usps.com'
}

/**
 * Acquires a valid OAuth 2.0 Bearer access token from USPS.
 * Automatically caches token and re-authenticates on expiry.
 */
export async function getUspsAccessToken() {
  const clientId = (process.env.USPS_API_KEY || process.env.USPS_CLIENT_ID || '').trim()
  const clientSecret = (process.env.USPS_SECRET_KEY || process.env.USPS_CLIENT_SECRET || '').trim()

  if (!clientId || !clientSecret) {
    return null
  }

  // Return cached token if still valid (with 60-second buffer)
  if (cachedUspsToken && uspsTokenExpiresAt && Date.now() < uspsTokenExpiresAt - 60000) {
    return cachedUspsToken
  }

  const baseUrl = getUspsBaseUrl()
  const tokenUrl = `${baseUrl}/oauth2/v3/token`

  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  }

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => null)
    if (res.ok && data?.access_token) {
      cachedUspsToken = data.access_token
      const expiresInSec = Number(data.expires_in || 3600)
      uspsTokenExpiresAt = Date.now() + expiresInSec * 1000
      return cachedUspsToken
    } else {
      console.warn('[USPS API] OAuth token acquisition failed:', data || res.status)
      return null
    }
  } catch (err) {
    console.warn('[USPS API] Network/Auth error:', err.message)
    return null
  }
}

/**
 * Maps USPS status codes to Sellvro standard tracking status.
 */
export function mapUspsStatusCode(statusText = '', category = '') {
  const s = String(statusText || '').toLowerCase().trim()
  const c = String(category || '').toLowerCase().trim()

  if (s.includes('delivered') || c.includes('delivered')) return 'delivered'
  if (s.includes('out for delivery') || c.includes('out for delivery')) return 'out_for_delivery'
  if (s.includes('return to sender') || s.includes('returned') || c.includes('returned')) return 'returned'
  if (s.includes('in transit') || s.includes('departed') || s.includes('arrived') || s.includes('processed')) return 'in_transit'
  if (s.includes('pre-shipment') || s.includes('label created') || s.includes('electronic shipping info')) return 'processing'
  if (s.includes('alert') || s.includes('held') || s.includes('notice')) return 'processing'
  return 'in_transit'
}

/**
 * Returns external official USPS tracking portal link.
 */
export function getUspsTrackingUrl(trackingNumber = '') {
  const clean = encodeURIComponent(String(trackingNumber || '').trim().replace(/\s+/g, ''))
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${clean}`
}

/**
 * Queries USPS REST API for live parcel checkpoints and scan events.
 * 
 * @param {string} trackingNumber - USPS Tracking Number (e.g. 9400111899562537624112)
 * @returns {Promise<object>} Standardized tracking object
 */
export async function trackUspsShipment(trackingNumber) {
  const cleanTrk = String(trackingNumber || '').trim().replace(/[\s-]/g, '')
  if (!cleanTrk) {
    return {
      success: false,
      message: 'Tracking number is required.',
    }
  }

  const token = await getUspsAccessToken()
  if (!token) {
    return {
      success: true,
      hasLiveApi: false,
      isConfigured: false,
      carrier: 'USPS',
      trackingNumber: cleanTrk,
      trackingUrl: getUspsTrackingUrl(cleanTrk),
      status: 'in_transit',
      statusDetail: 'Shipment handed over to USPS. Tracking registered.',
      message: 'USPS API credentials not configured in environment variables (USPS_CLIENT_ID & USPS_CLIENT_SECRET). Official tracking available via link.',
      timeline: [
        {
          status: 'in_transit',
          title: 'Handed Over to USPS (In Transit)',
          location: 'USPS Processing & Distribution Center',
          timestamp: new Date(),
          note: `Parcel custody transferred to USPS. Tracking number: ${cleanTrk}.`,
        },
      ],
    }
  }

  const baseUrl = getUspsBaseUrl()
  const trackUrl = `${baseUrl}/tracking/v3/tracking/${encodeURIComponent(cleanTrk)}?expand=DETAIL`

  try {
    const res = await fetch(trackUrl, {
      method: 'GET',
      headers: {
        'X-User-Id': process.env.USPS_CLIENT_ID || 'sellvro',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await res.json().catch(() => null)
    if (!res.ok || !data) {
      return {
        success: false,
        carrier: 'USPS',
        trackingNumber: cleanTrk,
        trackingUrl: getUspsTrackingUrl(cleanTrk),
        message: data?.error?.message || `USPS tracking query failed (HTTP ${res.status}).`,
      }
    }

    const summary = data.statusSummary || data.status || 'In Transit'
    const category = data.statusCategory || ''
    const mappedStatus = mapUspsStatusCode(summary, category)

    const events = Array.isArray(data.trackingEvents) ? data.trackingEvents : []

    const timeline = events.map((ev) => {
      const loc = [ev.eventCity, ev.eventState, ev.eventZIP].filter(Boolean).join(', ') || 'USPS Post Office'
      let ts = new Date()
      if (ev.eventTimestamp) {
        const parsed = new Date(ev.eventTimestamp)
        if (!isNaN(parsed.getTime())) ts = parsed
      } else if (ev.eventDate && ev.eventTime) {
        const parsed = new Date(`${ev.eventDate} ${ev.eventTime}`)
        if (!isNaN(parsed.getTime())) ts = parsed
      }

      return {
        status: mapUspsStatusCode(ev.eventType || ev.eventCode || summary),
        title: ev.eventType || 'USPS Scan Event',
        location: loc,
        timestamp: ts,
        note: `USPS Scan: ${ev.eventType || 'Event'}. Location: ${loc}`,
      }
    })

    if (timeline.length === 0) {
      timeline.push({
        status: mappedStatus,
        title: summary,
        location: 'USPS Mail Distribution Facility',
        timestamp: new Date(),
        note: `Current Status: ${summary}`,
      })
    }

    return {
      success: true,
      hasLiveApi: true,
      carrier: 'USPS',
      trackingNumber: cleanTrk,
      trackingUrl: getUspsTrackingUrl(cleanTrk),
      status: mappedStatus,
      statusDetail: summary,
      serviceType: data.mailClass || 'USPS Priority Mail',
      estimatedDelivery: data.expectedDeliveryDate || null,
      timeline,
    }
  } catch (err) {
    console.warn('[USPS API] Tracking exception:', err.message)
    return {
      success: false,
      carrier: 'USPS',
      trackingNumber: cleanTrk,
      trackingUrl: getUspsTrackingUrl(cleanTrk),
      message: err.message || 'Failed to query live USPS tracking.',
    }
  }
}

export default {
  getUspsBaseUrl,
  getUspsAccessToken,
  mapUspsStatusCode,
  getUspsTrackingUrl,
  trackUspsShipment,
}

