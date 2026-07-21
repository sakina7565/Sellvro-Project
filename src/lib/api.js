const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function fallbackMessage(status) {
  const liveMissingApi =
    import.meta.env.PROD && !import.meta.env.VITE_API_URL

  if (status === 0) {
    return liveMissingApi
      ? 'Cannot reach API. On Vercel set VITE_API_URL to your Railway URL ending with /api, then redeploy.'
      : 'Backend is not running. Open a second terminal and run: npm run dev:server (then keep both npm run dev and npm run dev:server open).'
  }
  if (status === 401) return 'Invalid email or password.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) {
    return liveMissingApi
      ? 'API not found on this site. Set Vercel env VITE_API_URL=https://YOUR-RAILWAY-URL/api and redeploy.'
      : 'API route not found. Is the backend running on port 5001?'
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return liveMissingApi
      ? 'Live frontend is not connected to Railway. Set VITE_API_URL on Vercel (https://YOUR-RAILWAY.app/api) and redeploy.'
      : 'Cannot reach API on port 5001. Run `npm run dev:server` in a separate terminal, wait for "Server running on port 5001", then try login again.'
  }
  return `Request failed (HTTP ${status}).`
}

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback

  if (err instanceof ApiError) {
    const list = err.data?.errors
    if (Array.isArray(list) && list.length > 0) {
      return list.map((item) => item.message || `${item.field}: invalid`).join(' ')
    }
    return err.message || fallback
  }

  if (err.message) return err.message
  return fallback
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  }

  const authToken = token ?? localStorage.getItem('sellvro_token')
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(fallbackMessage(0), 0, null)
  }

  let data = null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else {
    try {
      const text = await response.text()
      if (text) data = { message: text.slice(0, 200) }
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const message = data?.message || fallbackMessage(response.status)
    throw new ApiError(message, response.status, data)
  }

  return data
}

export const authApi = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  me: () => apiRequest('/auth/me'),
}

export const businessApi = {
  getMine: () => apiRequest('/business/me'),
  submit: (payload) => apiRequest('/business/submit', { method: 'POST', body: payload }),
}

export const adminApi = {
  pendingSuppliers: () => apiRequest('/admin/suppliers/pending'),
  pendingUsers: () => apiRequest('/admin/users/pending'),
  suppliers: () => apiRequest('/admin/suppliers'),
  users: () => apiRequest('/admin/users'),
  approve: (id) => apiRequest(`/admin/accounts/${id}/approve`, { method: 'PATCH' }),
  reject: (id) => apiRequest(`/admin/accounts/${id}/reject`, { method: 'PATCH' }),
}
