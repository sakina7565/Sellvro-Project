import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCog, User, Mail, Lock, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
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
      setError('Please select a role (Admin, Supplier, or User).')
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
    <AuthLayout cardClassName="max-w-lg">
      <h1 className="mt-3 text-center text-xl font-bold text-slate-900">Create an Account</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Join Ezone to get started today</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        <Select
          id="role"
          name="role"
          label="Register as"
          icon={UserCog}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value="" disabled>
            Select Role
          </option>
          <option value="admin">Admin</option>
          <option value="supplier">Supplier</option>
          <option value="user">User</option>
        </Select>

        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          icon={User}
          placeholder="Enter full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
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
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            icon={Lock}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm"
            type="password"
            icon={ShieldCheck}
            placeholder="Confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register Now'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-700">
          Login
        </Link>
      </p>
    </AuthLayout>
  )
}

export default RegisterPage
