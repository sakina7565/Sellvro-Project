import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, UserCog, Mail, User, Sparkles } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
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

export default function GoogleSignInButton({ defaultRole = 'user', label = 'Continue with Google', className = '' }) {
  const navigate = useNavigate()
  const { googleLogin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState(defaultRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if real Google Client ID is configured
  const googleClientId = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GOOGLE_CLIENT_ID : null

  useEffect(() => {
    if (!googleClientId || !window.google?.accounts?.id) return

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (response?.credential) {
            setLoading(true)
            try {
              const data = await googleLogin({
                credential: response.credential,
                role,
              })
              navigate(data.redirectTo || '/user/dashboard', { replace: true })
            } catch (err) {
              setError(getErrorMessage(err, 'Google authentication failed.'))
            } finally {
              setLoading(false)
            }
          }
        },
      })
    } catch {
      //
    }
  }, [googleClientId, googleLogin, navigate, role])

  const handleClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt()
        return
      } catch {
        // Fallback to interactive modal
      }
    }
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please provide your Google email address.')
      return
    }

    setLoading(true)
    try {
      const data = await googleLogin({
        email: email.trim().toLowerCase(),
        name: name.trim() || email.split('@')[0],
        role,
      })
      setModalOpen(false)
      navigate(data.redirectTo || (role === 'supplier' ? '/supplier/dashboard' : '/user/dashboard'), {
        replace: true,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Google Sign In failed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-50 ${className}`}
      >
        <GoogleIcon className="h-4 w-4 shrink-0" />
        <span>{loading ? 'Authenticating with Google...' : label}</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                  <GoogleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sign in with Google</h3>
                  <p className="text-xs text-slate-500">Fast &amp; secure one-click authorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {error}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Select your account role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all ${
                      role === 'user'
                        ? 'border-primary bg-primary-50/50 text-primary ring-2 ring-primary-100'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span className="text-xs font-bold">Buyer / Reseller</span>
                    <span className="text-[10px] text-slate-400">Shop products</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('supplier')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all ${
                      role === 'supplier'
                        ? 'border-primary bg-primary-50/50 text-primary ring-2 ring-primary-100'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCog className="h-4 w-4" />
                    <span className="text-xs font-bold">Supplier</span>
                    <span className="text-[10px] text-slate-400">Sell &amp; manage stock</span>
                  </button>
                </div>
              </div>

              <Input
                id="googleEmail"
                label="Google Email Address"
                type="email"
                icon={Mail}
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="googleName"
                label="Your Name (Optional)"
                type="text"
                icon={User}
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="pt-2">
                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Signing in…' : `Continue as ${role === 'supplier' ? 'Supplier' : 'Customer'}`}
                </Button>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                By continuing, you agree to Sellvro Ezone Terms and Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
