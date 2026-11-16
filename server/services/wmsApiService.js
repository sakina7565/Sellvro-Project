/**
 * Live WMS API Integration Service
 * Communicates directly with https://wmsbysellvro.com to:
 * 1. Authenticate suppliers / master admin and acquire Bearer tokens
 * 2. Push marketplace orders directly into WMS dispatch queue
 * 3. Poll real-time live courier tracking and dispatch status
 */

let cachedToken = null
let tokenExpiresAt = null

/**
 * Retrieves a valid Bearer token for WMS API.
 * Uses cached token, supplier token, .env token, or logs in on the fly.
 */
export async function getLiveWmsToken(supplierUser = null) {
  const baseUrl = process.env.WMS_BASE_URL || 'https://wmsbysellvro.com'

  // 1. Direct environment variable token (valid Bearer token only, ignore Laravel cookie strings)
  if (process.env.WMS_API_TOKEN && process.env.WMS_API_TOKEN.trim()) {
    const raw = process.env.WMS_API_TOKEN.trim()
    if (!raw.startsWith('eyJpdi') && !raw.startsWith('{"iv"')) {
      return raw
    }
  }

  // 2. Specific supplier token stored in DB
  if (supplierUser?.wmsToken && supplierUser.wmsToken.trim()) {
    return supplierUser.wmsToken.trim()
  }

  // 3. In-memory cached token (if still fresh)
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  // 4. Automatic On-the-Fly Authentication via WMS Credentials
  const email =
    process.env.WMS_SUPPLIER_EMAIL ||
    supplierUser?.email ||
    process.env.WMS_LOGIN_EMAIL
  const password =
    process.env.WMS_SUPPLIER_PASSWORD ||
    process.env.WMS_LOGIN_PASSWORD

  if (email && password) {
    try {
      console.log(`[WMS API] Authenticating with live WMS for ${email}...`)
      const res = await fetch(`${baseUrl}/api/supplier/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })

      const data = await res.json().catch(() => null)
      if (res.ok && data?.status && data?.token) {
        cachedToken = data.token
        // Cache token for 24 hours
        tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000
        console.log('[WMS API] Successfully acquired fresh live WMS token!')

        if (supplierUser && !supplierUser.wmsToken) {
          supplierUser.wmsToken = data.token
          if (data.supplier?.id) supplierUser.wmsSupplierId = data.supplier.id
          if (data.supplier?.user_unique_name) supplierUser.wmsClientId = data.supplier.user_unique_name
          await supplierUser.save?.().catch(() => null)
        }

        return cachedToken
      } else {
        console.warn('[WMS API] Login failed:', data?.message || res.status)
      }
    } catch (err) {
      console.warn('[WMS API] Authentication error:', err.message)
    }
  }

  return process.env.WMS_SUPPLIER_TOKEN || null
}

/**
 * Pushes a marketplace order to WMS API:
 * 1. Tries the Automated WMS Bridge (https://wmsbysellvro.com/wms_bridge.php)
 * 2. Falls back to standard Laravel endpoint (https://wmsbysellvro.com/api/supplier/orders)
 */
export async function pushOrderToLiveWmsApi(payload, supplierUser = null) {
  const baseUrl = process.env.WMS_BASE_URL || 'https://wmsbysellvro.com'
  const bridgeEndpoint = process.env.WMS_BRIDGE_URL || `${baseUrl}/wms_bridge.php`
  const standardEndpoint = `${baseUrl}/api/supplier/orders`

  // 1. First Attempt: Automated WMS Bridge
  try {
    const bridgeController = new AbortController()
    const bridgeTimeout = setTimeout(() => bridgeController.abort(), 15000)

    const bridgeRes = await fetch(bridgeEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Sellvro-Key': 'sellvro_wms_secret_2026',
      },
      body: JSON.stringify({
        ...payload,
        supplier_code: supplierUser?.wmsClientId || supplierUser?.user_unique_name || 'WMS-PAK1035',
        supplier_email: supplierUser?.email || '',
      }),
      signal: bridgeController.signal,
    })
    clearTimeout(bridgeTimeout)

    const bridgeData = await bridgeRes.json().catch(() => null)
    if (bridgeRes.ok && bridgeData?.status) {
      console.log('[WMS API] Order successfully dispatched via WMS Automated Bridge!')
      return {
        ok: true,
        status: bridgeRes.status,
        data: bridgeData,
      }
    } else {
      console.warn('[WMS Bridge Attempt Notice]: Response status', bridgeRes.status, bridgeData)
    }
  } catch (bridgeErr) {
    console.warn('[WMS Bridge Attempt Notice]:', bridgeErr.message)
  }

  // 2. Second Attempt: Standard Laravel WMS Endpoint
  let token = await getLiveWmsToken(supplierUser)
  if (!token) {
    console.warn('[WMS API] No valid token found for standard endpoint.')
  }

  const makeRequest = async (authToken) => {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    if (authToken && !authToken.startsWith('eyJpdi') && !authToken.startsWith('{"iv"')) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const cookieCandidate =
      process.env.WMS_SESSION_COOKIE ||
      (process.env.WMS_API_TOKEN && (process.env.WMS_API_TOKEN.startsWith('eyJpdi') || process.env.WMS_API_TOKEN.startsWith('{"iv"'))
        ? process.env.WMS_API_TOKEN.trim()
        : null)
    if (cookieCandidate) {
      headers.Cookie = `sellvro_warehouse_session=${cookieCandidate}; laravel_session=${cookieCandidate}`
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(standardEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json().catch(() => null)
    return { response, data }
  }

  let { response, data } = await makeRequest(token)

  // If token expired, clear cache and retry once
  if (response.status === 401) {
    console.warn('[WMS API] Token rejected (401). Retrying with fresh login...')
    cachedToken = null
    tokenExpiresAt = null
    const freshToken = await getLiveWmsToken(supplierUser)
    if (freshToken && freshToken !== token) {
      const retry = await makeRequest(freshToken)
      response = retry.response
      data = retry.data
    }
  }

  return {
    ok: response.ok && Boolean(data?.status),
    status: response.status,
    data,
  }
}

/**
 * Checks real-time live courier tracking from WMS API:
 * GET /api/supplier/orders/{orderRef}/track
 */
export async function fetchLiveWmsOrderTracking(orderRef, supplierUser = null) {
  if (!orderRef) return null
  const baseUrl = process.env.WMS_BASE_URL || 'https://wmsbysellvro.com'
  const endpoint = `${baseUrl}/api/supplier/orders/${encodeURIComponent(orderRef)}/track`

  const token = await getLiveWmsToken(supplierUser)
  const headers = {
    Accept: 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json().catch(() => null)
    if (response.ok && data?.status && data?.data) {
      return data.data
    }
  } catch (err) {
    console.warn('[WMS API] Live track error:', err.message)
  }

  return null
}

export default {
  getLiveWmsToken,
  pushOrderToLiveWmsApi,
  fetchLiveWmsOrderTracking,
}

