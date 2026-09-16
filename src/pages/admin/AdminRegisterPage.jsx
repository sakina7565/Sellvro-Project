import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ShieldCheck, UserCog, ArrowLeft, Shield } from 'lucide-react'
import AuthLayout from '../../components/layout/AuthLayout.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { authApi, getErrorMessage } from '../../lib/api.js'

function AdminRegisterPage() {
  const navigate = useNavigate()
  const { adminRegister } = useAuth()

  const [adminType, setAdminType] = useState('super_admin') // 'super_admin' | 'subadmin'
  const [adminRoleId, setAdminRoleId] = useState('')
  const [availableRoles, setAvailableRoles] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    setLoadingRoles(true)
    authApi
      .getRoles()
      .then((res) => {
        if (active && res?.data) {
          setAvailableRoles(res.data)
          if (res.data.length > 0) {
            setAdminRoleId(res.data[0].id)
          }
        }
      })
      .catch(() => {
        // Fallback gracefully if roles cannot be retrieved
      })
      .finally(() => {
        if (active) setLoadingRoles(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

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
    if (adminType === 'subadmin' && availableRoles.length > 0 && !adminRoleId) {
      setError('Please select an assigned role for the sub-admin.')
      return
    }

    setSubmitting(true)

    try {
      const data = await adminRegister({
        fullName,
        email,
        password,
        confirmPassword,
        adminType,
        adminRoleId: adminType === 'subadmin' ? adminRoleId : null,
      })
      navigate(data.redirectTo || '/admin/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Admin registration failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout cardClassName="max-w-md border-t-4 border-t-primary">
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary shadow-sm ring-4 ring-primary-50/50">
          <Shield className="h-6 w-6" />
        </div>
        <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          Admin Onboarding
        </div>
        <h1 className="mt-2 text-center text-xl font-bold text-slate-900">Create Administrator</h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Register a new Super Admin or Sub-Admin staff account
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <p className="font-semibold">Registration Error</p>
            <p className="mt-0.5 text-xs text-rose-600">{error}</p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Admin Account Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdminType('super_admin')}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                adminType === 'super_admin'
                  ? 'border-primary bg-primary-50 text-primary ring-2 ring-primary/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4" />
                Super Admin
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">Unrestricted system access</p>
            </button>

            <button
              type="button"
              onClick={() => setAdminType('subadmin')}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                adminType === 'subadmin'
                  ? 'border-primary bg-primary-50 text-primary ring-2 ring-primary/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <UserCog className="h-4 w-4" />
                Sub-Admin
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">Assigned role & permissions</p>
            </button>
          </div>
        </div>

        {adminType === 'subadmin' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            {loadingRoles ? (
              <p className="text-xs text-slate-500">Loading available roles…</p>
            ) : availableRoles.length > 0 ? (
              <Select
                id="adminRole"
                name="adminRole"
                label="Assign Role"
                icon={UserCog}
                value={adminRoleId}
                onChange={(e) => setAdminRoleId(e.target.value)}
                required
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.description ? `(${role.description})` : ''}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-xs leading-relaxed text-amber-700">
                Notice: No custom roles have been created yet. This sub-admin will be granted default management
                access until specific roles are configured in Settings &gt; Roles.
              </p>
            )}
          </div>
        )}

        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          icon={User}
          placeholder="Admin Full Name"
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
          placeholder="admin@sellvro.com"
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
          placeholder="Min. 6 characters"
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
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Button type="submit" fullWidth disabled={submitting} className="mt-2">
          {submitting ? 'Creating Administrator…' : 'Register Administrator'}
        </Button>
      </form>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-center text-sm">
        <p className="text-slate-600">
          Already have an administrator account?{' '}
          <Link to="/admin/login" className="font-semibold text-primary hover:text-primary-700">
            Admin Sign In
          </Link>
        </p>
        <p>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Switch to Supplier / Reseller Registration
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default AdminRegisterPage
