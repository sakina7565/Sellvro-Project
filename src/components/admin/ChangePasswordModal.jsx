import { useState } from 'react'
import { Lock, X, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setError('')
    setSuccess('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await adminApi.changePassword({ currentPassword, newPassword, confirmPassword })
      setSuccess('Your password has been changed successfully. Super Admin has been notified.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition-all">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500">Update your account login password</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="currentPassword"
            label="Current Password"
            type="password"
            icon={Lock}
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            id="newPassword"
            label="New Password"
            type="password"
            icon={Lock}
            placeholder="Min. 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            id="confirmNewPassword"
            label="Confirm New Password"
            type="password"
            icon={Lock}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <p className="text-[11px] text-slate-400">
            Note: For security reasons, Super Admin will be notified of all administrator and staff password
            changes.
          </p>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordModal
