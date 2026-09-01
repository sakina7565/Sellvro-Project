/**
 * Role / approval based landing paths used after login, register,
 * and by protected route guards.
 */
import { canAccessAdminPath, ADMIN_ROUTE_PERMISSIONS } from './permissions.js'

export function getRedirectForUser(user) {
  if (!user) return '/login'

  if (user.role === 'admin') {
    if (canAccessAdminPath(user, '/admin/dashboard')) {
      return '/admin/dashboard'
    }
    const firstAllowed = Object.keys(ADMIN_ROUTE_PERMISSIONS).find((path) =>
      canAccessAdminPath(user, path),
    )
    return firstAllowed || '/admin/dashboard'
  }

  if (user.role === 'supplier') {
    return user.status === 'approved' ? '/supplier/dashboard' : '/supplier/business/details'
  }

  if (user.role === 'user') {
    return user.status === 'approved' ? '/user/dashboard' : '/user/business/detail'
  }

  return '/'
}

export function canAccessPath(user, path) {
  if (!user) return false

  if (path.startsWith('/admin')) {
    if (user.role !== 'admin') return false
    return canAccessAdminPath(user, path)
  }

  if (path.startsWith('/supplier')) {
    if (user.role !== 'supplier') return false
    if (path.startsWith('/supplier/business')) {
      return ['pending_details', 'pending_approval', 'approved'].includes(user.status)
    }
    return user.status === 'approved'
  }

  if (path.startsWith('/user')) {
    if (user.role !== 'user') return false
    if (path.startsWith('/user/business')) {
      return ['pending_details', 'pending_approval', 'approved'].includes(user.status)
    }
    return user.status === 'approved'
  }

  return true
}
