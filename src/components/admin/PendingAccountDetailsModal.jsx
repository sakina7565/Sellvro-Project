import { useState } from 'react'
import {
  X,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  FileText,
  Briefcase,
  Layers,
} from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

function PendingAccountDetailsModal({
  isOpen,
  onClose,
  account,
  onApprove,
  onReject,
  actionLoading = false,
}) {
  const [rejectConfirm, setRejectConfirm] = useState(false)

  if (!isOpen || !account) return null

  const isSupplier = account.role === 'supplier' || Boolean(account.supplier)
  const name = account.fullName || account.supplier || 'Unnamed User'
  const email = account.email || account.businessEmail || '—'
  const businessName = account.businessName || '—'
  const businessCategory = account.businessCategory || account.category || '—'
  const businessDescription = account.businessDescription || 'No description provided by applicant.'
  const phone = account.businessPhone || account.phone || 'Not provided'
  const address = account.businessAddress || 'Not provided'
  const city = account.city || ''
  const country = account.country || ''
  const location = account.location || [city, country].filter(Boolean).join(', ') || 'Not specified'
  const orderType = account.orderType || 'Standard'
  const paymentProvider = account.paymentProvider || 'Not configured'
  const accNumber = account.accNumber || '—'
  const cardDate = account.cardDate || '—'
  const joined = account.joined || '—'
  const wallet = account.wallet || (account.walletBalance !== undefined ? `$${account.walletBalance}` : '$0')

  const handleModalClose = () => {
    setRejectConfirm(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-4 ring-teal-50/50">
              {isSupplier ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{name}</h3>
                <Badge tone={isSupplier ? 'primary' : 'info'}>
                  {isSupplier ? 'Supplier' : 'Buyer / User'}
                </Badge>
                <Badge tone="warning">Pending Review</Badge>
              </div>
              <p className="text-xs text-slate-500">{email} &bull; Account ID: {account.id?.slice(-8) || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-medium text-slate-400">Account Type</span>
              <p className="mt-1 text-sm font-semibold text-slate-800 capitalize">
                {isSupplier ? 'Supplier / Vendor' : 'Customer / Buyer'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-medium text-slate-400">Joined Date</span>
              <p className="mt-1 text-sm font-semibold text-slate-800">{joined}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-medium text-slate-400">Location</span>
              <p className="mt-1 text-sm font-semibold text-slate-800 truncate" title={location}>
                {location}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-medium text-slate-400">{isSupplier ? 'Payment' : 'Wallet'}</span>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {isSupplier ? paymentProvider : wallet}
              </p>
            </div>
          </div>

          {/* Business & Profile Details */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Briefcase className="h-4 w-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-800">Business & Organization Profile</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400 font-medium">Business / Company Name</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {businessName}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Category / Industry</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  {businessCategory}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Fulfillment / Order Type</dt>
                <dd className="mt-1 text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  {orderType}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Application Status</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Awaiting Admin Approval
                  </span>
                </dd>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <dt className="text-xs text-slate-400 font-medium">Business Description</dt>
                <dd className="mt-1 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 border border-slate-100">
                  {businessDescription}
                </dd>
              </div>
            </div>
          </div>

          {/* Contact & Physical Address */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="h-4 w-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-800">Contact & Geographic Location</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400 font-medium">Contact Email</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`mailto:${email}`} className="text-teal-600 hover:underline">
                    {email}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Phone Number</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {phone !== 'Not provided' ? (
                    <a href={`tel:${phone}`} className="text-teal-600 hover:underline">
                      {phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">{phone}</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Country / Region</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  {country || 'Not specified'}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">City</dt>
                <dd className="mt-1 text-slate-800">{city || 'Not specified'}</dd>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <dt className="text-xs text-slate-400 font-medium">Registered Physical Address</dt>
                <dd className="mt-1 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs">
                  {address}
                </dd>
              </div>
            </div>
          </div>

          {/* Payment & Payout Setup */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="h-4 w-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-800">Financial & Payment Setup</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400 font-medium">Payment Provider</dt>
                <dd className="mt-1 font-semibold text-slate-800">{paymentProvider}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Account / Card Number</dt>
                <dd className="mt-1 font-mono text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded inline-block">
                  {accNumber}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Expiry / Onboarding Date</dt>
                <dd className="mt-1 text-slate-700">{cardDate}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          {rejectConfirm ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                Are you sure you want to reject this account application?
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectConfirm(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(account.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleModalClose} disabled={actionLoading}>
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setRejectConfirm(true)}
                  disabled={actionLoading}
                  className="gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onApprove(account.id)}
                  disabled={actionLoading}
                  className="gap-1.5 !bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {actionLoading ? 'Approving…' : 'Approve Application'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PendingAccountDetailsModal
