import { useState } from 'react'
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { authApi } from '../../lib/api.js'

function ImpersonationBanner() {
  const { user } = useAuth()
  const [switching, setSwitching] = useState(false)

  if (!user?.impersonatedBy) return null

  const handleReturnToAdmin = async () => {
    setSwitching(true)
    try {
      const res = await authApi.switchBack()
      // Full redirect to guarantee fresh admin state and layout
      window.location.href = res.redirectTo || '/admin/accounts'
    } catch {
      // Fallback
      window.location.href = '/admin/accounts'
    }
  }

  const roleLabel = user.role === 'supplier' ? 'Supplier' : 'Customer'
  const adminName = user.impersonatedBy?.fullName || 'Administrator'

  return (
    <aside
      aria-label="Admin Impersonation Banner"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-linear-to-r from-amber-500 via-amber-600 to-orange-600 px-4 py-2.5 text-white shadow-md transition-all"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-xs sm:text-sm">
          <span className="font-bold tracking-wide uppercase text-[11px] bg-white/20 px-2 py-0.5 rounded-full mr-2">
            Impersonation Mode
          </span>
          <span className="hidden sm:inline">You are viewing Sellvro as </span>
          <strong className="font-semibold underline decoration-white/50 underline-offset-2">
            {user.fullName}
          </strong>{' '}
          <span className="text-white/80">({roleLabel})</span>
          <span className="hidden md:inline text-white/75 text-xs ml-2">
            • Authorized by {adminName}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={switching}
        onClick={handleReturnToAdmin}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition-all hover:bg-amber-50 hover:shadow-sm focus:ring-2 focus:ring-white focus:outline-none disabled:opacity-70 cursor-pointer"
      >
        {switching ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />
            <span>Returning…</span>
          </>
        ) : (
          <>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Admin</span>
          </>
        )}
      </button>
    </aside>
  )
}

export default ImpersonationBanner
