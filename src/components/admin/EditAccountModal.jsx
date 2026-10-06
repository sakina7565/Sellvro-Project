import { useEffect, useState } from 'react'
import { X, Edit3, Building2, User, Lock, Mail, Phone, MapPin, DollarSign } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function EditAccountModal({ isOpen, onClose, onSuccess, account }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [status, setStatus] = useState('approved')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [walletBalance, setWalletBalance] = useState('0')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (account) {
      setFullName(account.fullName || '')
      setEmail(account.email || '')
      setRole(account.role || 'user')
      setStatus(account.status || 'approved')
      setWalletBalance(String(account.walletBalance ?? 0))
      setPhone(account.businessProfile?.businessPhone || '')
      setBusinessName(account.businessProfile?.businessName || '')
      setBusinessCategory(account.businessProfile?.businessCategory || '')
      setCity(account.businessProfile?.city || '')
      setCountry(account.businessProfile?.country || '')
      setNewPassword('')
      setError('')
    }
  }, [account])

  if (!isOpen || !account) return null

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (walletBalance !== '' && parseFloat(walletBalance) < 0) {
      setError('Wallet balance cannot be negative.')
      return
    }

    setLoading(true)
    try {
      await adminApi.updateAccount(account.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        status,
        businessPhone: phone.trim(),
        businessName: businessName.trim(),
        businessCategory: businessCategory.trim(),
        city: city.trim(),
        country: country.trim(),
        walletBalance: parseFloat(walletBalance) || 0,
        password: newPassword || undefined,
      })
      handleClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Edit3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Account</h2>
            <p className="text-xs text-slate-500">
              Update information, adjust status, or reset credentials for {account.fullName}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="editFullName"
              label="Full Name *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              id="editEmail"
              label="Email Address *"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              id="editRole"
              label="Account Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'user', label: 'Customer / User' },
                { value: 'supplier', label: 'Supplier' },
              ]}
            />
            <Select
              id="editStatus"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'approved', label: 'Approved (Active)' },
                { value: 'pending_approval', label: 'Pending Approval' },
                { value: 'pending_details', label: 'Pending Details' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <Input
              id="editBusinessName"
              label="Business Name"
              icon={Building2}
              placeholder="Business or store name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <Input
              id="editBusinessCategory"
              label="Category / Industry"
              placeholder="e.g. Fashion, Electronics"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="editPhone"
              label="Phone Number"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              id="editCity"
              label="City"
              icon={MapPin}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              id="editCountry"
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="editWalletBalance"
              label="Wallet Balance ($)"
              type="number"
              min="0"
              step="any"
              icon={DollarSign}
              value={walletBalance}
              onChange={(e) => setWalletBalance(e.target.value)}
            />
            <Input
              id="editNewPassword"
              label="Reset Password (leave empty to keep current)"
              type="password"
              icon={Lock}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving Changes…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditAccountModal
