import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Checkbox from '../components/ui/Checkbox.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getErrorMessage } from '../lib/api.js'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    setSubmitting(true)

    try {
      const data = await login({ email, password })
      navigate(data.redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mt-3 text-center text-xl font-bold text-slate-900">Welcome Back</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Please sign in to your Ezone account</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
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

        <Checkbox id="remember" label="Remember me" />

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        New here?{' '}
        <Link to="/register" className="font-semibold text-primary hover:text-primary-700">
          Create Account
        </Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
