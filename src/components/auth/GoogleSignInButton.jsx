import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getErrorMessage } from '../../lib/api.js'

function GoogleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.36 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

export default function GoogleSignInButton({
  defaultRole = 'user',
  label = 'Continue with Google',
  className = '',
  onGoogleSuccess = null,
}) {
  const navigate = useNavigate()
  const { googleLogin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Google OAuth Client ID provided by user
  const googleClientId =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    '366677857468-va47f432ro1haif68t6glvdpp895tq36.apps.googleusercontent.com'

  const handleGoogleClick = () => {
    setError('')

    // Check if Google Identity Services SDK is loaded
    if (!window.google?.accounts?.oauth2) {
      setError(
        'Google authentication library is loading. Please check your internet connection and try again in a moment.',
      )
      return
    }

    setLoading(true)

    try {
      // Launch Google's native OAuth 2.0 Account Chooser Popup
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setLoading(false)
            if (tokenResponse.error !== 'popup_closed_by_user') {
              setError(`Google Sign-In error: ${tokenResponse.error_description || tokenResponse.error}`)
            }
            return
          }

          try {
            // Fetch verified user profile directly from Google APIs (No manual email entry needed!)
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            })

            if (!userInfoRes.ok) {
              throw new Error('Failed to retrieve user profile from Google.')
            }

            const profile = await userInfoRes.json()

            if (!profile.email) {
              throw new Error('Google did not provide an email address.')
            }

            const googleUserData = {
              email: profile.email.toLowerCase().trim(),
              name: profile.name || profile.given_name || profile.email.split('@')[0],
              googleId: profile.sub,
              picture: profile.picture || '',
              role: defaultRole || 'user',
              // The server verifies this token with Google; it ignores the email above.
              accessToken: tokenResponse.access_token,
            }

            // If a custom handler is provided (e.g. on Registration page to auto-fill details)
            if (onGoogleSuccess) {
              onGoogleSuccess(googleUserData)
              setLoading(false)
              return
            }

            // Default flow for Login page
            const data = await googleLogin(googleUserData)

            if (data.isNewUser) {
              // Redirect to register with Google verified details pre-loaded
              navigate('/register', {
                state: { googleUser: data.googleUser || googleUserData },
                replace: true,
              })
              return
            }

            navigate(
              data.redirectTo ||
                (defaultRole === 'supplier' ? '/supplier/dashboard' : '/user/dashboard'),
              { replace: true },
            )
          } catch (err) {
            setError(getErrorMessage(err, 'Google Sign-In failed. Please try again.'))
          } finally {
            setLoading(false)
          }
        },
      })

      // Prompt Google Account Chooser
      client.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err, 'Could not open Google authentication popup.'))
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-fadeIn">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-900">Google Authentication Notice:</span>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loading}
        className={`relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-60 cursor-pointer ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            <span>Connecting to Google…</span>
          </>
        ) : (
          <>
            <GoogleIcon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  )
}
