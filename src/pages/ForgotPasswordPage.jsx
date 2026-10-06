import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import { authApi, getErrorMessage } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()

  // Steps: 1 = Email, 2 = Enter Code, 3 = Reset Password, 4 = Success
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Step 1: Request Code
  const handleRequestCode = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() })
      setStep(2)
      setResendCooldown(60)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send verification code.'))
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify Code
  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError('')

    const cleanCode = code.trim().replace(/\D/g, '')
    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.')
      return
    }

    setLoading(true)
    try {
      await authApi.verifyResetCode({
        email: email.trim().toLowerCase(),
        code: cleanCode,
      })
      setStep(3)
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid or expired verification code.'))
    } finally {
      setLoading(false)
    }
  }

  // Resend Code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() })
      setResendCooldown(60)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resend code.'))
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const data = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim().replace(/\D/g, ''),
        newPassword,
        confirmPassword,
      })

      if (data.token) {
        localStorage.setItem('sellvro_token', data.token)
      }
      if (data.user) {
        updateUser(data.user)
      }

      setStep(4)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout cardClassName="max-w-md">
      {/* Back button */}
      <div className="mb-4">
        {step > 1 && step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        )}
      </div>

      {/* Progress Indicators */}
      {step < 4 && (
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-primary'
                  : s < step
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-slate-200'
              }`}
            />
          ))}
        </div>
      )}

      {/* STEP 1: Email Form */}
      {step === 1 && (
        <div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Forgot Password?</h1>
            <p className="mt-1 text-xs text-slate-500">
              Enter the email address associated with your account and we will send you a 6-digit recovery code.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleRequestCode}>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            )}

            <Input
              id="email"
              name="email"
              label="Account Email"
              type="email"
              icon={Mail}
              placeholder="e.g. user@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Sending verification code…' : 'Send Verification Code'}
            </Button>
          </form>
        </div>
      )}

      {/* STEP 2: Verify Code Form */}
      {step === 2 && (
        <div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Check Your Email</h1>
            <p className="mt-1 text-xs text-slate-500">
              We've sent a 6-digit verification code to <strong className="text-slate-800">{email}</strong>.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleVerifyCode}>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-slate-700">
                6-Digit Recovery Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white text-center font-mono text-2xl tracking-[0.4em] font-bold text-slate-900 placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
                autoFocus
                required
              />
            </div>

            <Button type="submit" fullWidth disabled={loading || code.length !== 6}>
              {loading ? 'Verifying code…' : 'Verify Code'}
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Set New Password */}
      {step === 3 && (
        <div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Set New Password</h1>
            <p className="mt-1 text-xs text-slate-500">
              Your identity has been verified. Choose a strong new password for your account.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            )}

            <Input
              id="newPassword"
              name="newPassword"
              label="New Password"
              type="password"
              icon={Lock}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />

            <Input
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              icon={Lock}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Saving new password…' : 'Save New Password & Sign In'}
            </Button>
          </form>
        </div>
      )}

      {/* STEP 4: Success State */}
      {step === 4 && (
        <div className="text-center py-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Password Reset Successful!</h1>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Your password has been changed securely. You can now use your new password to sign in.
          </p>

          <div className="mt-6">
            <Button
              type="button"
              fullWidth
              onClick={() => navigate('/login', { replace: true })}
            >
              Sign In to Your Account
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}

export default ForgotPasswordPage
