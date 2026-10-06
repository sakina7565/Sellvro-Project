import { useState } from 'react'
import { X, UserPlus, Building2, User, Lock, Mail, Phone, MapPin, DollarSign, Sparkles } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function AddAccountModal({ isOpen, onClose, onSuccess, initialRole = 'user' }) {
  const [role, setRole] = useState(initialRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('approved')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [walletBalance, setWalletBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleClose = () => {
    setError('')
    setFullName('')
    setEmail('')
    setPassword('')
    setPhone('')
    setBusinessName('')
    setBusinessCategory('')
    setCity('')
    setCountry('')
    setWalletBalance('0')
    setStatus('approved')
    onClose()
  }

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(pwd)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (walletBalance !== '' && parseFloat(walletBalance) < 0) {
      setError('Wallet balance cannot be negative.')
      return
    }

    setLoading(true)
    try {
      await adminApi.createAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        status,
        businessPhone: phone.trim(),
        businessName: role === 'supplier' ? (businessName.trim() || fullName.trim()) : undefined,
        businessCategory: role === 'supplier' ? businessCategory.trim() : undefined,
        city: city.trim(),
        country: country.trim(),
        walletBalance: parseFloat(walletBalance) || 0,
      })
      handleClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create account.'))
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Create New Account</h2>
            <p className="text-xs text-slate-500">Add a verified supplier or customer user to the platform</p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="mt-4 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              role === 'user'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Customer / User</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('supplier')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              role === 'supplier'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Supplier</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="accountFullName"
              label="Full Name *"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              id="accountEmail"
              label="Email Address *"
              type="email"
              icon={Mail}
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="accountPassword">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate
                </button>
              </div>
              <Input
                id="accountPassword"
                type="text"
                icon={Lock}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Select
              id="accountStatus"
              label="Account Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'approved', label: 'Approved (Active)' },
                { value: 'pending_approval', label: 'Pending Approval' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          </div>

          {role === 'supplier' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <Input
                id="businessName"
                label="Business Name"
                icon={Building2}
                placeholder="e.g. Acme Supplies Ltd"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <Input
                id="businessCategory"
                label="Business Category"
                placeholder="e.g. Electronics, Clothing"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="accountPhone"
              label="Phone Number"
              icon={Phone}
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              id="accountCity"
              label="City"
              icon={MapPin}
              placeholder="e.g. New York"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              id="accountCountry"
              label="Country"
              placeholder="e.g. United States"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          {role === 'user' && (
            <div className="sm:w-1/2">
              <Input
                id="walletBalance"
                label="Initial Wallet Balance ($)"
                type="number"
                min="0"
                step="any"
                icon={DollarSign}
                placeholder="0.00"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Creating…' : `Create ${role === 'supplier' ? 'Supplier' : 'Customer'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddAccountModal
