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
  FileBadge,
  ShieldCheck,
  ExternalLink,
  Eye,
  Edit3,
} from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { mediaUrl } from '../../lib/api.js'
import { formatIbanSpaces } from '../../utils/ibanValidator.js'

function PendingAccountDetailsModal({
  isOpen,
  onClose,
  account,
  onApprove,
  onReject,
  onEdit,
  actionLoading = false,
}) {
  const [rejectConfirm, setRejectConfirm] = useState(false)

  if (!isOpen || !account) return null

  const isSupplier = account.role === 'supplier' || Boolean(account.supplier)
  const name = account.fullName || account.supplier || 'Unnamed User'
  const email = account.email || account.businessEmail || '—'
  const businessName = account.companyName || account.businessName || '—'
  const businessCategory = account.businessCategory || account.category || '—'
  const businessDescription = account.businessDescription || 'No description provided by applicant.'
  const phone = account.companyPhone || account.businessPhone || account.phone || 'Not provided'
  const address = account.companyAddress || account.businessAddress || 'Not provided'
  const city = account.city || ''
  const country = account.country || ''
  const location = account.location || [city, country].filter(Boolean).join(', ') || 'Not specified'
  const orderType = account.orderType || 'Standard'
  const paymentProvider = account.paymentProvider || 'Not configured'
  const accNumber = account.accNumber || '—'
  const cardDate = account.cardDate || '—'
  const joined = account.joined || '—'
  const wallet = account.wallet || (account.walletBalance !== undefined ? `$${account.walletBalance}` : '$0')
  const registrationEntity = account.registrationEntity || '—'
  const registrationNo = account.registrationNo || '—'
  const ownerName = account.ownerName || account.fullName || '—'
  const ownerEmail = account.ownerEmail || account.email || '—'
  const ownerPhone = account.ownerPhone || '—'
  const ownerAddress = account.ownerAddress || '—'
  const idCardUrl = account.idCardUrl || ''
  const idCardNumber = account.idCardNumber || '—'
  const bankName = account.bankName || account.paymentProvider || '—'
  const accountHolderName = account.accountHolderName || account.ownerName || account.fullName || '—'
  const accountNumberOrIban = account.accountNumberOrIban || account.accNumber || '—'
  const isImageId = idCardUrl && /\.(jpe?g|png|webp)($|\?)/i.test(idCardUrl)

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

          {/* ── Section 1: Company Details ── */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="h-4 w-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-800">Company Details</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400 font-medium">Name of Company</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {businessName}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Official Phone Number</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {phone}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Email of Company</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`mailto:${account.companyEmail || email}`} className="text-teal-600 hover:underline">
                    {account.companyEmail || email}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Registration Entity</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileBadge className="h-3.5 w-3.5 text-slate-400" />
                  {registrationEntity}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Registration No (NTN / SECP)</dt>
                <dd className="mt-1 font-mono text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded inline-block border border-slate-200">
                  {registrationNo}
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
                <dt className="text-xs text-slate-400 font-medium">Address of Company</dt>
                <dd className="mt-1 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {address}
                </dd>
              </div>
            </div>
          </div>

          {/* ── Section 2: Owner Details ── */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-sky-600" />
              <h4 className="text-sm font-bold text-slate-800">Owner Details</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400 font-medium">Owner Name</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {ownerName}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Owner Phone</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {ownerPhone}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Owner Email (Account Login)</dt>
                <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`mailto:${ownerEmail}`} className="text-sky-600 hover:underline">
                    {ownerEmail}
                  </a>
                </dd>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <dt className="text-xs text-slate-400 font-medium">Owner Personal Address</dt>
                <dd className="mt-1 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {ownerAddress}
                </dd>
              </div>
            </div>
          </div>

          {/* ── Section 3: Bank & Settlement Details ── */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="h-4 w-4 text-primary-600" />
              <h4 className="text-sm font-bold text-slate-800">Bank & Settlement Account</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400 font-medium">Bank Name</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {bankName}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Account Holder Name</dt>
                <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {accountHolderName}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 font-medium">Account Number / IBAN</dt>
                <dd className="mt-1 font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded inline-block border border-slate-200 select-all">
                  {formatIbanSpaces(accountNumberOrIban) || accountNumberOrIban}
                </dd>
              </div>
            </div>
          </div>

          {/* ── Section 4: ID Card for Verification ── */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-800">ID Card for Verification</h4>
            </div>

            {idCardNumber && idCardNumber !== '—' && (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 flex items-center justify-between">
                <div>
                  <dt className="text-xs text-emerald-800 font-medium">Extracted CNIC / ID Card Number</dt>
                  <dd className="mt-0.5 text-base font-bold font-mono text-emerald-950 tracking-wider">
                    {idCardNumber}
                  </dd>
                </div>
                <Badge tone="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              </div>
            )}

            {idCardUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs uppercase">
                      ID
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">ID Document Uploaded</p>
                      <p className="text-[11px] text-emerald-700">CNIC / Passport verification document submitted</p>
                    </div>
                  </div>
                  <a
                    href={mediaUrl(idCardUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View ID Card
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {isImageId && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="bg-slate-100/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                      ID Preview:
                    </div>
                    <div className="p-2 flex justify-center bg-slate-900/5">
                      <img
                        src={mediaUrl(idCardUrl)}
                        alt="ID Card Verification"
                        className="max-h-64 rounded-lg object-contain shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No ID document file was uploaded for this account.
              </div>
            )}
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
                {Boolean(onEdit) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => onEdit(account)}
                    disabled={actionLoading}
                    className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                    title="Edit user information and business details before approval"
                  >
                    <Edit3 className="h-4 w-4 text-slate-600" />
                    Edit Details
                  </Button>
                )}
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
