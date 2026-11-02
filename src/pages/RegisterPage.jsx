import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCog, User, Mail, Lock, ShieldCheck, Warehouse } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getErrorMessage } from '../lib/api.js'

function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [role, setRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!role) {
      setError('Please select a role (Supplier or User).')
      return
    }
    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    if (!email.trim()) {
      setError('Email address is required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const data = await register({ fullName, email, password, confirmPassword, role })
      navigate(data.redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout cardClassName="max-w-md">
      <h1 className="text-center text-xl font-bold text-slate-900">Create an Account</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Join Ezone to get started today</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <Select
          id="role"
          name="role"
          label="Register as"
          icon={UserCog}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className={!role ? 'text-slate-400' : ''}
        >
          <option value="" disabled>
            Select Role
          </option>
          <option value="supplier">Supplier (Manufacturer)</option>
          <option value="user">User (Reseller / Buyer)</option>
        </Select>

        {role === 'supplier' && (
          <div className="rounded-xl border border-primary-200 bg-linear-to-r from-primary-50/90 via-sky-50/70 to-primary-50/90 p-3.5 shadow-2xs text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-2xs mt-0.5">
                <Warehouse className="h-4 w-4" />
              </div>
              <div className="leading-relaxed">
                <span className="font-bold text-primary-950 block text-[12px]">
                  Notice for WMS Suppliers:
                </span>
                <p className="mt-0.5 text-slate-700">
                  If you are already registered on the <strong>WMS (Warehouse)</strong> platform, you do not need to register a new account. Go directly to the{' '}
                  <Link to="/login" className="font-bold text-primary underline underline-offset-2 hover:text-primary-800">
                    Sign In page
                  </Link>{' '}
                  and log in using your <strong>same WMS email and password</strong> so your warehouse inventory details sync automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          icon={User}
          placeholder="Enter full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          required
        />

        <Input
          id="email"
          name="email"
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          icon={Lock}
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          icon={ShieldCheck}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Button type="submit" fullWidth disabled={submitting} className="mt-2">
          {submitting ? 'Creating account…' : 'Register Now'}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 font-semibold text-slate-400">Or register with</span>
        </div>
      </div>

      <GoogleSignInButton defaultRole={role || 'user'} label="Sign up with Google" />

      <div className="mt-5 space-y-2 text-center text-sm text-slate-500">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-700">
            Login
          </Link>
        </p>
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
          Admin or Staff member?{' '}
          <Link to="/admin/login" className="font-semibold text-slate-600 hover:text-slate-900">
            Admin Sign In
          </Link>
          {' · '}
          <Link to="/admin/register" className="font-semibold text-slate-600 hover:text-slate-900">
            Register Admin
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default RegisterPage
