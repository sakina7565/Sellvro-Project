import { useEffect, useState } from 'react'
import { X, Edit3, Building2, User, Lock, Mail, Phone, MapPin, DollarSign, Warehouse } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function EditAccountModal({ isOpen, onClose, onSuccess, account }) {
  const isStaff = account?.role === 'admin'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [status, setStatus] = useState('approved')
  const [adminRoleId, setAdminRoleId] = useState('super_admin')
  const [availableRoles, setAvailableRoles] = useState([])
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [walletBalance, setWalletBalance] = useState('0')
  const [newPassword, setNewPassword] = useState('')
  const [isWmsRegistered, setIsWmsRegistered] = useState(false)
  const [wmsClientId, setWmsClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (account) {
      setFullName(account.fullName || '')
      setEmail(account.email || '')
      setRole(account.role || 'user')
      setStatus(account.status || 'approved')
      setAdminRoleId(account.adminRoleId || 'super_admin')
      setWalletBalance(String(account.walletBalance ?? 0))
      setPhone(account.businessProfile?.businessPhone || '')
      setBusinessName(account.businessProfile?.businessName || '')
      setBusinessCategory(account.businessProfile?.businessCategory || '')
      setCity(account.businessProfile?.city || '')
      setCountry(account.businessProfile?.country || '')
      setIsWmsRegistered(Boolean(account.isWmsRegistered || account.wmsClientId || account.supplierType === 'wms'))
      setWmsClientId(account.wmsClientId || '')
      setNewPassword('')
      setError('')

      if (account.role === 'admin') {
        adminApi.roles()
          .then((res) => setAvailableRoles(res.data || []))
          .catch(() => setAvailableRoles([]))
      }
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

    if (!isStaff && walletBalance !== '' && parseFloat(walletBalance) < 0) {
      setError('Wallet balance cannot be negative.')
      return
    }

    setLoading(true)
    try {
      if (isStaff) {
        await adminApi.updateAccount(account.id, {
          fullName: fullName.trim(),
          email: email.trim(),
          status,
          adminRoleId: adminRoleId !== 'super_admin' ? adminRoleId : '',
          password: newPassword || undefined,
        })
      } else {
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
          isWmsRegistered,
          wmsClientId: isWmsRegistered ? wmsClientId.trim() : '',
        })
      }
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
            <h2 className="text-base font-bold text-slate-900">
              {isStaff ? 'Edit Staff Account' : 'Edit Account'}
            </h2>
            <p className="text-xs text-slate-500">
              {isStaff
                ? `Update staff role permissions, status, or reset credentials for ${account.fullName}`
                : `Update information, adjust status, or reset credentials for ${account.fullName}`}
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

          {isStaff ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                id="editStaffRole"
                label="Assigned Staff Role *"
                value={adminRoleId}
                onChange={(e) => setAdminRoleId(e.target.value)}
                required
              >
                <option value="super_admin">Super Admin (Full Root Privileges)</option>
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    Sub-Admin: {r.name} ({r.permissions?.length || 0} permissions)
                  </option>
                ))}
              </Select>
              <Select
                id="editStaffStatus"
                label="Account Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'approved', label: 'Approved (Active)' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
            </div>
          ) : (
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
          )}

          {isStaff ? (
            <div>
              <Input
                id="editNewPassword"
                label="Reset Password (leave empty to keep current password)"
                type="password"
                icon={Lock}
                placeholder="Enter min. 6 characters to reset"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          ) : (
            <>
              {role === 'supplier' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Supplier Origin / Channel
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWmsRegistered}
                        onChange={(e) => setIsWmsRegistered(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        WMS Warehouse Integrated
                      </span>
                    </label>
                  </div>

                  {isWmsRegistered ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1 border-t border-emerald-200/60">
                      <Input
                        id="editWmsClientId"
                        label="WMS Client ID"
                        placeholder="e.g. WMS-PAK1035"
                        value={wmsClientId}
                        onChange={(e) => setWmsClientId(e.target.value)}
                      />
                      <div className="flex flex-col justify-end text-[11px] text-emerald-800 pb-2">
                        <p className="font-semibold">✓ Connected with 3PL Central Hub</p>
                        <p className="text-slate-500">Orders auto-routed to WMS warehouse list.</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Currently configured as <strong>Marketplace Only</strong> vendor. Check above to connect with Sellvro WMS 3PL Fulfillment.
                    </p>
                  )}
                </div>
              )}

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
            </>
          )}

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
