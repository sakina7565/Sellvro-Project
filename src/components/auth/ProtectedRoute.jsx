import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { canAccessPath, getRedirectForUser } from '../../lib/authRedirect.js'

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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRedirectForUser(user)} replace />
  }

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to={getRedirectForUser(user)} replace />
  }

  return children
}

export default ProtectedRoute
