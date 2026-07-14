/**
 * Role / approval based landing paths used after login, register,
 * and by protected route guards.
 */
export function getRedirectForUser(user) {
  if (!user) return '/login'

  if (user.role === 'admin') return '/admin/dashboard'

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
    return user.role === 'admin'
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
