import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, ShieldAlert, Warehouse } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Checkbox from '../components/ui/Checkbox.jsx'
import Button from '../components/ui/Button.jsx'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getErrorMessage } from '../lib/api.js'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isAdminError, setIsAdminError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsAdminError(false)

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    setSubmitting(true)

    try {
      const data = await login({ email, password })
      const role = data.user?.role

      if (role === 'supplier') {
        navigate('/supplier/dashboard', { replace: true })
      } else if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        // Client / User role goes to landing page '/' unless completing an order checkout
        const destination =
          location.state?.from && location.state.from.startsWith('/user/checkout')
            ? location.state.from
            : '/'
        navigate(destination, { replace: true })
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Login failed. Please try again.')
      // Detect the admin-blocked error and show a special UI
      const isAdminBlocked =
        msg.toLowerCase().includes('admin') &&
        (msg.toLowerCase().includes('/admin/login') ||
          msg.toLowerCase().includes('public portal') ||
          msg.toLowerCase().includes('admin portal') ||
          err?.status === 403)
      if (isAdminBlocked) {
        setIsAdminError(true)
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-xl font-bold text-slate-900">Welcome Back</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Please sign in to your Ezone account</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {/* Important Notice for WMS Suppliers */}
        <div className="rounded-xl border border-primary-200 bg-linear-to-r from-primary-50/90 via-sky-50/70 to-primary-50/90 p-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-2xs mt-0.5">
              <Warehouse className="h-4 w-4" />
            </div>
            <div className="text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-primary-950 block text-[12px]">
                Important Notice for WMS Suppliers:
              </span>
              <p className="mt-0.5 text-slate-700">
                If you are a registered <strong>WMS (Warehouse)</strong> supplier, please log in using your <strong>identical WMS email and password</strong>. Logging in with different credentials will prevent your warehouse products and inventory details from syncing.
              </p>
            </div>
          </div>
        </div>

        {/* Info message if redirected from an order/checkout action */}
        {location.state?.message && !error && !isAdminError && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900 font-medium">
            <Lock className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{location.state.message}</span>
          </div>
        )}

        {/* Regular error */}
        {error && !isAdminError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        {/* Admin restriction alert */}
        {isAdminError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Admin Portal Required</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Admin accounts must sign in through the dedicated Admin Portal only.
                </p>
                <Link
                  to="/admin/login"
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700"
                >
                  Go to Admin Sign In →
                </Link>
              </div>
            </div>
          </div>
        )}

        <Input
          id="email"
          name="email"
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          icon={Lock}
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox id="remember" label="Remember me" />
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-primary hover:text-primary-700 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 font-semibold text-slate-400">Or continue with</span>
        </div>
      </div>

      <GoogleSignInButton label="Sign in with Google" />

      <div className="mt-5 space-y-2 text-center text-sm text-slate-500">
        <p>
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-700">
            Create Account
          </Link>
        </p>
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
          Admin or Staff member?{' '}
          <Link to="/admin/login" className="font-semibold text-slate-600 hover:text-slate-900">
            Admin Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default LoginPage

