import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Wallet,
  Tag,
  CheckCircle2,
  XCircle,
  FileBadge,
  ShieldCheck,
  ExternalLink,
  Eye,
  LogIn,
  Truck,
  Landmark,
  BadgeCheck,
} from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { mediaUrl } from '../../lib/api.js'
import { formatIbanSpaces } from '../../utils/ibanValidator.js'

function getUserDisplayId(user) {
  if (user?.clientId) return user.clientId
  if (user?.id) {
    const hex = String(user.id)
    return `USR-${hex.slice(-6).toUpperCase()}`
  }
  return 'USR-1001'
}

export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onImpersonate,
  onToggleStatus,
  actionLoading = false,
}) {
  const [showFullIdCard, setShowFullIdCard] = useState(false)

  if (!isOpen || !user) return null

  const name = user.fullName || user.ownerName || 'Unnamed User'
  const email = user.email || user.ownerEmail || '—'
  const companyName = user.companyName || user.businessName || name
  const companyEmail = user.companyEmail || user.businessEmail || email
  const companyPhone = user.companyPhone || user.businessPhone || user.phone || '—'
  const companyAddress = user.companyAddress || user.businessAddress || '—'
  const businessCategory = user.businessCategory || user.category || 'General Wholesale & Retail'
  const registrationEntity = user.registrationEntity || '—'
  const registrationNo = user.registrationNo || '—'

  const ownerName = user.ownerName || user.fullName || name
  const ownerEmail = user.ownerEmail || user.email || email
  const ownerPhone = user.ownerPhone || user.phone || '—'
  const ownerAddress = user.ownerAddress || '—'

  const bankName = user.bankName || '—'
  const accountHolderName = user.accountHolderName || ownerName
  const accountNumberOrIban = user.accountNumberOrIban || user.accNumber || '—'

  const idCardUrl = user.idCardUrl || ''
  const idCardNumber = user.idCardNumber || '—'
  const isImageId = idCardUrl && /\.(jpe?g|png|webp)($|\?)/i.test(idCardUrl)

  const joined = user.joined || (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—')
  const wallet = typeof user.walletBalance === 'number' ? `$${user.walletBalance.toFixed(2)}` : (user.wallet || '$0.00')
  const status = user.status || 'approved'

  const statusTone =
    status === 'approved' ? 'success' : status === 'suspended' ? 'danger' : 'warning'

  return (
    <>
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{name}</h3>
                  <Badge tone="info">Customer / User</Badge>
                  <Badge tone={statusTone} className="capitalize">
                    {status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {email} &bull; ID: <span className="font-mono font-bold text-indigo-600">{getUserDisplayId(user)}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> User ID
                </span>
                <p className="mt-1 text-sm font-bold font-mono text-indigo-700">
                  {getUserDisplayId(user)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined Date
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-800">{joined}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" /> Wallet Balance
                </span>
                <p className="mt-1 text-sm font-bold text-emerald-600">{wallet}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" /> Account Status
                </span>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                  {status}
                </p>
              </div>
            </div>

            {/* ── Section 1: Company Details ── */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Company Details</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-400 font-medium">Name of Company</dt>
                  <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {companyName}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 font-medium">Email of Company</dt>
                  <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`mailto:${companyEmail}`} className="text-indigo-600 hover:underline">
                      {companyEmail}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 font-medium">Official Phone Number</dt>
                  <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {companyPhone}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 font-medium">Business Category</dt>
                  <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    {businessCategory}
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

                <div className="col-span-1 sm:col-span-2">
                  <dt className="text-xs text-slate-400 font-medium">Address of Company</dt>
                  <dd className="mt-1 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {companyAddress}
                  </dd>
                </div>
              </div>
            </div>

            {/* ── Section 2: Owner Details ── */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="h-4 w-4 text-sky-600" />
                <h4 className="text-sm font-bold text-slate-900">Owner Details</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-400 font-medium">Owner Full Name</dt>
                  <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {ownerName}
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

                <div>
                  <dt className="text-xs text-slate-400 font-medium">Owner Phone</dt>
                  <dd className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {ownerPhone}
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
                <Landmark className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-bold text-slate-900">Bank & Settlement Details</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-400 font-medium">Bank Name</dt>
                  <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-slate-400" />
                    {bankName}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 font-medium">Account Holder Name</dt>
                  <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {accountHolderName}
                  </dd>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <dt className="text-xs text-slate-400 font-medium">Account Number / IBAN</dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 select-all">
                    {formatIbanSpaces(accountNumberOrIban) || accountNumberOrIban}
                  </dd>
                </div>
              </div>
            </div>

            {/* ── Section 4: Extracted ID Card Number & Verification Photo ── */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Verification & ID Card</h4>
                </div>
                {idCardUrl && (
                  <a
                    href={mediaUrl(idCardUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Open Original</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <dt className="text-xs text-slate-400 font-medium">Extracted ID Card / CNIC Number</dt>
                  <dd className="mt-1 inline-flex items-center gap-2 font-mono text-sm font-bold text-slate-900 bg-indigo-50/60 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    {idCardNumber}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 font-medium mb-1.5">Uploaded ID Card Photo Preview</dt>
                  {idCardUrl ? (
                    <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 max-w-sm">
                      {isImageId ? (
                        <>
                          <img
                            src={mediaUrl(idCardUrl)}
                            alt="Uploaded ID Card"
                            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFullIdCard(true)}
                            className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1.5 cursor-pointer backdrop-blur-[2px]"
                          >
                            <Eye className="h-4 w-4" />
                            Click to View Full Size
                          </button>
                        </>
                      ) : (
                        <div className="p-4 flex items-center justify-between">
                          <span className="text-xs text-slate-600 font-medium">Uploaded Document (PDF / File)</span>
                          <a
                            href={mediaUrl(idCardUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 underline"
                          >
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      No ID Card photo uploaded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2">
              {onImpersonate && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onImpersonate(user)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-2xs cursor-pointer"
                  title={`Log in as ${name}`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Login As User</span>
                </button>
              )}

              <Link
                to={`/admin/users/reporting?userId=${user.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Live Tracking & Report</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {onToggleStatus && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onToggleStatus(user)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                    status === 'suspended'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                      : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white'
                  }`}
                >
                  {status === 'suspended' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Reinstate User</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Suspend User</span>
                    </>
                  )}
                </button>
              )}

              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Full Size Modal */}
      {showFullIdCard && idCardUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowFullIdCard(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFullIdCard(false)}
              className="absolute top-4 right-4 z-10 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={mediaUrl(idCardUrl)}
              alt="Full Size ID Card"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </>
  )
}

