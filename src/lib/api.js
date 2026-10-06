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

export async function apiRequest(path, { method = 'GET', body, formData } = {}) {
  const headers = {}

  const token = typeof window !== 'undefined' ? localStorage.getItem('sellvro_token') : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (body !== undefined && !formData) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: formData || (body ? JSON.stringify(body) : undefined),
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
  adminRegister: (payload) => apiRequest('/auth/admin/register', { method: 'POST', body: payload }),
  adminLogin: (payload) => apiRequest('/auth/admin/login', { method: 'POST', body: payload }),
  getRoles: () => apiRequest('/auth/roles'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),
  switchBack: () => apiRequest('/auth/switch-back', { method: 'POST' }),
  forgotPassword: (payload) => apiRequest('/auth/forgot-password', { method: 'POST', body: payload }),
  verifyResetCode: (payload) => apiRequest('/auth/verify-code', { method: 'POST', body: payload }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: payload }),
  googleAuth: (payload) => apiRequest('/auth/google', { method: 'POST', body: payload }),
  changePassword: (payload) => apiRequest('/auth/change-password', { method: 'PATCH', body: payload }),
}

export const notificationApi = {
  list: () => apiRequest('/notifications'),
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
}

export const searchApi = {
  search: (query) => apiRequest(`/search?q=${encodeURIComponent(query)}`),
}

export const businessApi = {
  getMine: () => apiRequest('/business/me'),
  submit: (payload) => apiRequest('/business/submit', { method: 'POST', body: payload }),
}

export function mediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }
  if (API_BASE.startsWith('http')) {
    const origin = API_BASE.replace(/\/api\/?$/, '')
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

export const productApi = {
  create: (payload, files = []) => {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value))
    })
    files.forEach((file) => {
      if (file) formData.append('photos', file)
    })
    return apiRequest('/products', { method: 'POST', formData })
  },
  update: (id, payload, files = []) => {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value))
    })
    files.forEach((file) => {
      if (file) formData.append('photos', file)
    })
    return apiRequest(`/products/${id}`, { method: 'PATCH', formData })
  },
  mine: () => apiRequest('/products/mine'),
  marketplace: () => apiRequest('/products'),
  get: (id) => apiRequest(`/products/${id}`),
}

export const categoryApi = {
  list: () => apiRequest('/categories'),
  create: (payload) => apiRequest('/categories', { method: 'POST', body: payload }),
  update: (id, payload) => apiRequest(`/categories/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
}

export const orderApi = {
  create: (payload) => apiRequest('/orders', { method: 'POST', body: payload }),
  mine: () => apiRequest('/orders/mine'),
  supplier: () => apiRequest('/orders/supplier'),
  lookup: (ref) => apiRequest(`/orders/lookup?ref=${encodeURIComponent(ref)}`),
  updateStatus: (id, status) =>
    apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  dashboardStats: (period = 'all') =>
    apiRequest(`/orders/dashboard/stats?period=${encodeURIComponent(period)}`),
}

export const walletApi = {
  balance: () => apiRequest('/wallet/balance'),
  myRequests: () => apiRequest('/wallet/requests/mine'),
  createRequest: (payload, receiptFile) => {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value))
    })
    if (receiptFile) formData.append('receipt', receiptFile)
    return apiRequest('/wallet/requests', { method: 'POST', formData })
  },
}

export const financeApi = {
  supplier: () => apiRequest('/finance'),
  dashboardStats: (period = 'all') =>
    apiRequest(`/finance/dashboard/stats?period=${encodeURIComponent(period)}`),
}

export const disputeApi = {
  create: (payload) => apiRequest('/disputes', { method: 'POST', body: payload }),
  mine: () => apiRequest('/disputes/mine'),
  unreadCount: () => apiRequest('/disputes/unread-count'),
  get: (id) => apiRequest(`/disputes/${id}`),
  sendMessage: (id, text) =>
    apiRequest(`/disputes/${id}/messages`, { method: 'POST', body: { text } }),
  markRead: (id) => apiRequest(`/disputes/${id}/read`, { method: 'PATCH' }),
}

export const adminApi = {
  pendingSuppliers: () => apiRequest('/admin/suppliers/pending'),
  pendingUsers: () => apiRequest('/admin/users/pending'),
  suppliers: () => apiRequest('/admin/suppliers'),
  users: () => apiRequest('/admin/users'),
  approve: (id) => apiRequest(`/admin/accounts/${id}/approve`, { method: 'PATCH' }),
  reject: (id) => apiRequest(`/admin/accounts/${id}/reject`, { method: 'PATCH' }),
  products: () => apiRequest('/admin/products'),
  product: (id) => apiRequest(`/admin/products/${id}`),
  updateProductCommission: (id, commission) =>
    apiRequest(`/admin/products/${id}/commission`, { method: 'PATCH', body: { commission } }),
  createProduct: (payload, files = []) => {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value))
    })
    files.forEach((file) => {
      if (file) formData.append('photos', file)
    })
    return apiRequest('/admin/products', { method: 'POST', formData })
  },
  approveProduct: (id, body = {}) =>
    apiRequest(`/admin/products/${id}/approve`, { method: 'PATCH', body }),
  rejectProduct: (id) => apiRequest(`/admin/products/${id}/reject`, { method: 'PATCH' }),
  activateProduct: (id) => apiRequest(`/admin/products/${id}/activate`, { method: 'PATCH' }),
  deactivateProduct: (id) => apiRequest(`/admin/products/${id}/deactivate`, { method: 'PATCH' }),
  categories: () => apiRequest('/admin/categories'),
  createCategory: (payload) => apiRequest('/admin/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) =>
    apiRequest(`/admin/categories/${id}`, { method: 'PATCH', body: payload }),
  deleteCategory: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  orders: () => apiRequest('/admin/orders'),
  walletRequests: () => apiRequest('/admin/wallet-requests'),
  approveWalletRequest: (id, body = {}) =>
    apiRequest(`/admin/wallet-requests/${id}/approve`, { method: 'PATCH', body }),
  rejectWalletRequest: (id, body = {}) =>
    apiRequest(`/admin/wallet-requests/${id}/reject`, { method: 'PATCH', body }),
  payouts: () => apiRequest('/admin/payouts'),
  processPayout: (supplierId) =>
    apiRequest(`/admin/payouts/${supplierId}/process`, { method: 'PATCH' }),
  supplierDisputes: () => apiRequest('/admin/disputes/supplier'),
  userComplaints: () => apiRequest('/admin/disputes/user'),
  disputeUnreadCount: () => apiRequest('/admin/disputes/unread-count'),
  getDispute: (id) => apiRequest(`/admin/disputes/${id}`),
  sendDisputeMessage: (id, text) =>
    apiRequest(`/admin/disputes/${id}/messages`, { method: 'POST', body: { text } }),
  markDisputeRead: (id) => apiRequest(`/admin/disputes/${id}/read`, { method: 'PATCH' }),
  resolveDispute: (id, body = {}) =>
    apiRequest(`/admin/disputes/${id}/resolve`, { method: 'PATCH', body }),
  rejectDispute: (id, body = {}) =>
    apiRequest(`/admin/disputes/${id}/reject`, { method: 'PATCH', body }),
  adminUsers: () => apiRequest('/admin/admins'),
  createAdminUser: (payload) => apiRequest('/admin/admins', { method: 'POST', body: payload }),
  roles: () => apiRequest('/admin/roles'),
  permissions: () => apiRequest('/admin/permissions'),
  createRole: (payload) => apiRequest('/admin/roles', { method: 'POST', body: payload }),
  updateRole: (id, payload) => apiRequest(`/admin/roles/${id}`, { method: 'PATCH', body: payload }),
  deleteRole: (id) => apiRequest(`/admin/roles/${id}`, { method: 'DELETE' }),
  dashboardStats: (period = 'all') =>
    apiRequest(`/admin/dashboard/stats?period=${encodeURIComponent(period)}`),
  changePassword: (payload) =>
    apiRequest('/admin/change-password', { method: 'PATCH', body: payload }),
  notifications: () => apiRequest('/admin/notifications'),
  markNotificationRead: (id) =>
    apiRequest(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest('/admin/notifications/read-all', { method: 'PATCH' }),
  accounts: (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''),
    )
    const query = new URLSearchParams(clean).toString()
    return apiRequest(`/admin/accounts${query ? `?${query}` : ''}`)
  },
  createAccount: (payload) => apiRequest('/admin/accounts', { method: 'POST', body: payload }),
  updateAccount: (id, payload) =>
    apiRequest(`/admin/accounts/${id}`, { method: 'PATCH', body: payload }),
  deleteAccount: (id) => apiRequest(`/admin/accounts/${id}`, { method: 'DELETE' }),
  impersonate: (id) => apiRequest(`/admin/impersonate/${id}`, { method: 'POST' }),
  countries: () => apiRequest('/admin/countries'),
  createCountry: (payload) => apiRequest('/admin/countries', { method: 'POST', body: payload }),
  deleteCountry: (id) => apiRequest(`/admin/countries/${id}`, { method: 'DELETE' }),
  locations: () => apiRequest('/admin/locations'),
  createLocation: (payload) => apiRequest('/admin/locations', { method: 'POST', body: payload }),
  deleteLocation: (id) => apiRequest(`/admin/locations/${id}`, { method: 'DELETE' }),
}

