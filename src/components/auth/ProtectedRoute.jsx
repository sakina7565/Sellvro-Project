import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { canAccessPath, getRedirectForUser } from '../../lib/authRedirect.js'
import AdminLayout from '../layout/AdminLayout.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'

/**
 * Guards private routes by auth + role + approval status.
 * Unapproved suppliers/users may only stay on their business-details
 * onboarding pages until an admin approves them.
 */
function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg text-sm text-slate-500">
        Checking access…
      </div>
    )
  }

  if (!isAuthenticated) {
    const isTargetAdmin = location.pathname.startsWith('/admin')
    const loginTarget = isTargetAdmin ? '/admin/login' : '/login'
    return <Navigate to={loginTarget} replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRedirectForUser(user)} replace />
  }

  if (!canAccessPath(user, location.pathname)) {
    if (user.role === 'admin') {
      return (
        <AdminLayout>
          <Card className="mx-auto mt-16 max-w-lg p-8 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Access Restricted</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Your staff account ({user.adminRoleName || 'Sub-Admin'}) does not have permission to access{' '}
              <span className="font-semibold text-slate-700">{location.pathname}</span>.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Please contact your Super Administrator to grant you permissions for this section.
            </p>
            <div className="mt-6">
              <Button as={Link} to="/admin/dashboard" size="sm">
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </AdminLayout>
      )
    }
    return <Navigate to={getRedirectForUser(user)} replace />
  }

  return children
}

export default ProtectedRoute
