export const AUTH_COOKIE = 'sellvro_auth'

function parseMaxAgeMs() {
  const raw = process.env.JWT_EXPIRES_IN || '7d'
  const match = String(raw).match(/^(\d+)([smhd])$/i)
  if (!match) return 7 * 24 * 60 * 60 * 1000

  const value = Number(match[1])
  const unit = match[2].toLowerCase()
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }
  return value * (multipliers[unit] || multipliers.d)
}

export function getAuthCookieOptions() {
  const production = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
    maxAge: parseMaxAgeMs(),
  }
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, getAuthCookieOptions())
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, {
    ...getAuthCookieOptions(),
    maxAge: 0,
  })
}

export function readAuthToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE]
  if (cookieToken) return cookieToken

  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.split(' ')[1]

  return null
}
