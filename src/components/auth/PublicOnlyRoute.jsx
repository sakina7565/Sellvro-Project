import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getRedirectForUser } from '../../lib/authRedirect.js'

/** Sends already-logged-in users away from login/register. */
function PublicOnlyRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getRedirectForUser(user)} replace />
  }

  return children
}

export default PublicOnlyRoute
