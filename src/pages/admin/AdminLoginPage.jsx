import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ShieldCheck, ArrowLeft } from 'lucide-react'
import AuthLayout from '../../components/layout/AuthLayout.jsx'
import Input from '../../components/ui/Input.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getErrorMessage } from '../../lib/api.js'

function AdminLoginPage() {
  const navigate = useNavigate()
  const { adminLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Admin email and password are required.')
      return
    }

    setSubmitting(true)

    try {
      const data = await adminLogin({ email, password })
      navigate(data.redirectTo || '/admin/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Admin login failed. Please verify your credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout cardClassName="max-w-md border-t-4 border-t-primary">
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary shadow-sm ring-4 ring-primary-50/50">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          Admin & Staff Portal
        </div>
        <h1 className="mt-2 text-center text-xl font-bold text-slate-900">Administrator Sign In</h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Sign in to access platform controls, inventory, payouts & dispute management
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <p className="font-semibold">Authentication Error</p>
            <p className="mt-0.5 text-xs text-rose-600">{error}</p>
          </div>
        )}

        <Input
          id="adminEmail"
          name="email"
          label="Admin Email Address"
          type="email"
          icon={Mail}
          placeholder="admin@sellvro.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <Input
          id="adminPassword"
          name="password"
          label="Password"
          type="password"
          icon={Lock}
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox id="rememberAdmin" label="Remember this device" />
        </div>

        <Button type="submit" fullWidth disabled={submitting} className="mt-2">
          {submitting ? 'Authenticating…' : 'Access Admin Dashboard'}
        </Button>
      </form>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-center text-sm">
        <p className="text-slate-600">
          Need an administrator account?{' '}
          <Link to="/admin/register" className="font-semibold text-primary hover:text-primary-700">
            Register as Admin / Staff
          </Link>
        </p>
        <p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Switch to Supplier / Reseller Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default AdminLoginPage
