import { useEffect, useState, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Building2,
  User,
  Landmark,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Loader2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileBadge,
  Check,
  X,
  FileText,
  Clock,
  XCircle,
  Briefcase,
  Globe,
  Zap,
} from 'lucide-react'
import OnboardingLayout from '../../components/layout/OnboardingLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { businessApi, categoryApi, mediaUrl, ApiError } from '../../lib/api.js'
import { validateImageQuality, extractIdCardNumber } from '../../utils/idCardScanner.js'
import { validateIban, formatIbanSpaces, POPULAR_BANKS } from '../../utils/ibanValidator.js'

function UserBusinessDetailsPage() {
  const { user: authUser, updateUser } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Account details state
  const [accountUser, setAccountUser] = useState(null)
  const [businessProfile, setBusinessProfile] = useState(null)

  // Form field states
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [businessCategoriesList, setBusinessCategoriesList] = useState([])
  const [registrationEntity, setRegistrationEntity] = useState('Sole Proprietorship')
  const [registrationNo, setRegistrationNo] = useState('')

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')

  const [bankName, setBankName] = useState('')
  const [selectedBankId, setSelectedBankId] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumberOrIban, setAccountNumberOrIban] = useState('')
  const [swiftOrBic, setSwiftOrBic] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [payoutCurrency, setPayoutCurrency] = useState('PKR')
  const [ibanValidation, setIbanValidation] = useState({ isValid: null, error: '', bankName: '' })

  const [idCardFile, setIdCardFile] = useState(null)
  const [idCardNumber, setIdCardNumber] = useState('')
  const [idCardPreview, setIdCardPreview] = useState('')
  const [scanningId, setScanningId] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [idCardError, setIdCardError] = useState('')
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  const fileInputRef = useRef(null)

  const loadDetails = async () => {
    try {
      setLoading(true)
      const data = await businessApi.getMine()
      const u = data.user || {}
      const p = data.profile || {}
      setAccountUser(u)
      setBusinessProfile(p)
      updateUser(u)

      // Initialize form fields
      setCompanyName(u.companyName || p.businessName || '')
      setCompanyEmail(u.companyEmail || p.businessEmail || u.email || '')
      setCompanyPhone(u.companyPhone || p.businessPhone || '')
      setCompanyAddress(u.companyAddress || p.businessAddress || '')
      setBusinessCategory(p.businessCategory || u.businessCategory || '')
      setRegistrationEntity(u.registrationEntity || p.registrationEntity || 'Sole Proprietorship')
      setRegistrationNo(u.registrationNo || p.registrationNo || '')

      setOwnerName(u.ownerName || p.ownerName || u.fullName || '')
      setOwnerEmail(u.ownerEmail || p.ownerEmail || u.email || '')
      setOwnerPhone(u.ownerPhone || p.ownerPhone || '')
      setOwnerAddress(u.ownerAddress || p.ownerAddress || '')

      const rawBank = u.bankName || p.bankName || p.paymentProvider || ''
      const rawAcc = u.accountNumberOrIban || p.accountNumberOrIban || p.accNumber || ''
      setBankName(rawBank)
      setAccountHolderName(u.accountHolderName || p.accountHolderName || u.ownerName || u.fullName || '')
      setAccountNumberOrIban(rawAcc)
      setSwiftOrBic(u.swiftOrBic || p.swiftOrBic || '')
      setBankBranch(u.bankBranch || p.bankBranch || p.city || '')
      setPayoutCurrency(u.payoutCurrency || p.payoutCurrency || (rawBank.toLowerCase().includes('wise') || rawBank.toLowerCase().includes('payoneer') ? 'USD' : 'PKR'))

      if (rawAcc) {
        setIbanValidation(validateIban(rawAcc))
      }

      setIdCardNumber(u.idCardNumber || p.idCardNumber || '')
      if (u.idCardUrl || p.idCardUrl) {
        setIdCardPreview(mediaUrl(u.idCardUrl || p.idCardUrl))
      }

      if (u.status === 'pending_details') {
        setIsEditing(true)
      } else {
        setIsEditing(false)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load business details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetails()
    const fetchCats = async () => {
      try {
        const res = await categoryApi.businessCategories()
        if (Array.isArray(res.data)) setBusinessCategoriesList(res.data)
      } catch (err) {
        console.warn('Failed to load business categories:', err)
      }
    }
    fetchCats()
  }, [])

  // Handle ID Card file selection & auto quality/OCR scan
  const handleIdCardChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIdCardError('')
    setError('')
    setScanSuccess(false)
    setScanningId(true)
    setScanProgress(15)

    try {
      // 1. Image Quality Validation (Blur, Glare, Resolution)
      const quality = await validateImageQuality(file)
      if (!quality.isValid) {
        setIdCardFile(null)
        setIdCardPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setIdCardError(quality.error)
        setError(quality.error)
        setScanningId(false)
        return
      }

      setScanProgress(35)

      // 2. OCR ID Card Number Extraction & Pakistani CNIC Validation
      const ocrResult = await extractIdCardNumber(file, (p) => {
        setScanProgress(35 + Math.round(p * 0.45))
      })

      // Strict document check: reject unrelated pictures, blurry images, non-CNIC
      if (!ocrResult.found || !ocrResult.isValidCnic || !ocrResult.idNumber) {
        setIdCardFile(null)
        setIdCardPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        const rejectMsg =
          ocrResult.error ||
          'Ghalat tasveer! Ye valid Pakistani CNIC / National ID card ki image nahi hai ya blurry hai. System aam photo ya doosray documents accept nahi karta. Baraye meherbani sirf apna asal aur saaf CNIC upload karein.'
        setIdCardError(rejectMsg)
        setError(rejectMsg)
        setScanningId(false)
        return
      }

      setScanProgress(80)

      // 3. CNIC Number Uniqueness Verification (Backend check before allowing upload)
      try {
        const verifyRes = await businessApi.verifyCnic(ocrResult.idNumber)
        if (verifyRes && verifyRes.available === false) {
          setIdCardFile(null)
          setIdCardPreview(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
          const dupMsg =
            verifyRes.message ||
            'Ye CNIC number pehle se kisi doosre account ke sath registered hai. Ek CNIC se sirf ek hi account register ho sakta hai.'
          setIdCardError(dupMsg)
          setError(dupMsg)
          setScanningId(false)
          return
        }
      } catch (dupErr) {
        const dupMsg = dupErr?.data?.message || dupErr?.message
        if (dupErr?.status === 409 || (dupMsg && dupMsg.includes('already registered'))) {
          setIdCardFile(null)
          setIdCardPreview(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
          const conflictMsg = dupMsg || 'Ye CNIC number pehle se registered hai. Ek CNIC se sirf ek account ban sakta hai.'
          setIdCardError(conflictMsg)
          setError(conflictMsg)
          setScanningId(false)
          return
        }
      }

      // 4. All checks passed: Auto-populate CNIC Number and lock
      setIdCardFile(file)
      setIdCardPreview(URL.createObjectURL(file))
      setIdCardNumber(ocrResult.idNumber)
      setScanSuccess(true)
      setScanProgress(100)
    } catch (scanErr) {
      console.warn('ID Card scanning notice:', scanErr)
      setIdCardFile(null)
      setIdCardPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      const failMsg =
        'CNIC tasveer verify karne mein masla aaya. Baraye meherbani saaf aur clear CNIC tasveer upload karein.'
      setIdCardError(failMsg)
      setError(failMsg)
      setScanSuccess(false)
    } finally {
      setScanningId(false)
    }
  }

  const handleBankSelect = (bankId) => {
    setSelectedBankId(bankId)
    const found = POPULAR_BANKS.find((b) => b.id === bankId)
    if (found) {
      if (found.id !== 'other') {
        setBankName(found.name)
        if (found.country === 'PK') {
          setPayoutCurrency('PKR')
        } else if (['US', 'INTL', 'CRYPTO'].includes(found.country)) {
          setPayoutCurrency('USD')
        }
      }
      if (accountNumberOrIban) {
        setIbanValidation(validateIban(accountNumberOrIban, found.code))
      }
    }
  }

  const handleIbanInput = (val) => {
    setAccountNumberOrIban(val)
    if (!val || !val.trim()) {
      setIbanValidation({ isValid: null, error: '', bankName: '' })
      return
    }
    const currentBankObj = POPULAR_BANKS.find((b) => b.name === bankName || b.id === selectedBankId)
    const result = validateIban(val, currentBankObj?.code || '')
    setIbanValidation(result)
    if (result.isValid && result.bankName && (!bankName || bankName === 'Other Bank / Financial Institution')) {
      setBankName(result.bankName)
    }
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    // ── 1. Validate Bank & International Account Details ──
    if (!bankName.trim()) {
      setError('Bank / Financial Institution Name enter karna lazmi hai.')
      return
    }

    if (!accountHolderName.trim()) {
      setError('Bank Account Holder Name enter karna lazmi hai.')
      return
    }

    if (!accountNumberOrIban.trim()) {
      setError('Bank Account Number ya IBAN enter karna lazmi hai.')
      return
    }

    const ibanCheck = validateIban(accountNumberOrIban)
    if (!ibanCheck.isValid) {
      setError(ibanCheck.error || 'Invalid IBAN format. Baraye meherbani durust aur valid IBAN enter karein.')
      return
    }

    // ── 2. Validate CNIC format and presence ──
    if (!idCardNumber || !/^[1-7]\d{4}-\d{7}-\d{1}$/.test(idCardNumber.trim())) {
      setError('Valid 13-digit Pakistani CNIC number lazmi hai (format: XXXXX-XXXXXXX-X). Baraye meherbani apna CNIC upload karein.')
      return
    }

    if (!idCardFile && !idCardPreview) {
      setError('Asal Pakistani CNIC / ID Card ki photo upload karna lazmi hai.')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        registrationEntity,
        registrationNo,
        ownerName,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
        accountNumberOrIban: ibanCheck.cleanIban || accountNumberOrIban.trim(),
        swiftOrBic: swiftOrBic.trim(),
        bankBranch: bankBranch.trim(),
        payoutCurrency,
        idCardNumber,
        businessCategory: businessCategory || 'General Wholesale & Retail',
      }

      await businessApi.submit(payload, idCardFile)
      setSuccessMsg('Your business details have been submitted successfully and are now awaiting admin approval.')
      setIsEditing(false)
      await loadDetails()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit business details.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authUser?.status === 'approved') {
    return <Navigate to="/user/dashboard" replace />
  }

  if (loading) {
    return (
      <OnboardingLayout topbarName={authUser?.fullName || 'User'}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading business details…</p>
        </div>
      </OnboardingLayout>
    )
  }

  const currentStatus = accountUser?.status || 'pending_details'
  const isPendingApproval = currentStatus === 'pending_approval'
  const isApproved = currentStatus === 'approved'
  const isRejected = currentStatus === 'rejected'

  const displayCompanyName = companyName || businessProfile?.businessName || accountUser?.companyName || 'Not Provided'
  const displayCompanyEmail = companyEmail || businessProfile?.businessEmail || accountUser?.companyEmail || 'Not Provided'
  const displayCompanyPhone = companyPhone || businessProfile?.businessPhone || accountUser?.companyPhone || 'Not Provided'
  const displayCompanyAddress = companyAddress || businessProfile?.businessAddress || accountUser?.companyAddress || 'Not Provided'
  const displayBusinessCategory = businessCategory || businessProfile?.businessCategory || accountUser?.businessCategory || 'General Merchandise'
  const displayRegistrationEntity = registrationEntity || businessProfile?.registrationEntity || accountUser?.registrationEntity || 'Sole Proprietorship'
  const displayRegistrationNo = registrationNo || businessProfile?.registrationNo || accountUser?.registrationNo || 'Not Provided'

  const displayOwnerName = ownerName || businessProfile?.ownerName || accountUser?.ownerName || accountUser?.fullName || 'Not Provided'
  const displayOwnerEmail = ownerEmail || businessProfile?.ownerEmail || accountUser?.ownerEmail || accountUser?.email || 'Not Provided'
  const displayOwnerPhone = ownerPhone || businessProfile?.ownerPhone || accountUser?.ownerPhone || 'Not Provided'
  const displayOwnerAddress = ownerAddress || businessProfile?.ownerAddress || accountUser?.ownerAddress || 'Not Provided'

  const displayBankName = bankName || businessProfile?.bankName || businessProfile?.paymentProvider || accountUser?.bankName || 'Not Provided'
  const displayAccountHolderName = accountHolderName || businessProfile?.accountHolderName || accountUser?.accountHolderName || displayOwnerName || 'Not Provided'
  const displayAccountNumberOrIban = accountNumberOrIban || businessProfile?.accountNumberOrIban || businessProfile?.accNumber || accountUser?.accountNumberOrIban || 'Not Provided'

  const displayIdCardNumber = idCardNumber || businessProfile?.idCardNumber || accountUser?.idCardNumber || 'Not Provided'
  const displayIdCardUrl = idCardPreview || (accountUser?.idCardUrl ? mediaUrl(accountUser.idCardUrl) : '') || (businessProfile?.idCardUrl ? mediaUrl(businessProfile.idCardUrl) : '')

  return (
    <OnboardingLayout topbarName={authUser?.fullName || 'User'}>
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Buyer Business Details
            </h1>
            <p className="text-xs text-slate-500">
              Official company registration, owner identity, bank details & verification documents
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isApproved && (
              <Badge tone="success" className="gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Approved & Active
              </Badge>
            )}
            {isPendingApproval && (
              <Badge tone="warning" className="gap-1.5 px-3 py-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Pending Admin Approval
              </Badge>
            )}
            {isRejected && (
              <Badge tone="danger" className="gap-1.5 px-3 py-1">
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Rejected
              </Badge>
            )}
            {currentStatus === 'pending_details' && (
              <Badge tone="info" className="gap-1.5 px-3 py-1">
                <AlertCircle className="h-3.5 w-3.5 text-sky-600" />
                Pending Submission
              </Badge>
            )}
          </div>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Status Announcement Banner */}
        {isPendingApproval && !isEditing && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    Verification Pending — Waiting for Admin Approval
                  </h3>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Your company details, bank account, and CNIC/ID verification documents are under review by the Sellvro Admin team.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="shrink-0 gap-1.5 border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100/60"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Submitted Details
              </Button>
            </div>
          </div>
        )}

        {/* MAIN BODY: VIEW MODE OR EDIT FORM */}
        {!isEditing ? (
          /* VIEW MODE: All 4 Sections Shown Together */
          <div className="space-y-6">
            {/* Section 1: Company Details */}
            <Card className="overflow-hidden border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Company Details</h2>
                    <p className="text-[11px] text-slate-400">Registered business entity and corporate address</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Name of Company</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {displayCompanyName}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Email of Company</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {displayCompanyEmail}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Official Phone Number</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {displayCompanyPhone}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Business Category</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Briefcase className="h-3.5 w-3.5 text-teal-600" />
                    {displayBusinessCategory}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Registration Entity</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <FileBadge className="h-3.5 w-3.5 text-slate-400" />
                    <span className="capitalize">{displayRegistrationEntity}</span>
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Registration No</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-800">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {displayRegistrationNo}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 sm:col-span-2 lg:col-span-1">
                  <dt className="text-xs font-medium text-slate-400">Address of Company</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {displayCompanyAddress}
                  </dd>
                </div>
              </div>
            </Card>

            {/* Section 2: Owner Details */}
            <Card className="overflow-hidden border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Owner Details</h2>
                  <p className="text-[11px] text-slate-400">Proprietor or primary business representative</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Owner Full Name</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {displayOwnerName}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Owner Email</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {displayOwnerEmail}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Owner Phone Number</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {displayOwnerPhone}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Owner Personal Address</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {displayOwnerAddress}
                  </dd>
                </div>
              </div>
            </Card>

            {/* Section 3: Bank Details & International Client Account */}
            <Card className="overflow-hidden border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Bank Details & International Client Account
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Official verified account for sales disbursements, payouts & wallet settlements
                    </p>
                  </div>
                </div>
                <Badge tone="success" className="gap-1 text-[10px] font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  IBAN Verified
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Financial Institution</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Landmark className="h-3.5 w-3.5 text-purple-500" />
                    {displayBankName}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Account Holder Title</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {displayAccountHolderName}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Account Number / IBAN</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-slate-800 select-all">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {formatIbanSpaces(displayAccountNumberOrIban) || displayAccountNumberOrIban}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <dt className="text-xs font-medium text-slate-400">Payout Currency</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <Globe className="h-3.5 w-3.5 text-emerald-600" />
                    {payoutCurrency || 'PKR / USD'}
                  </dd>
                </div>
              </div>
            </Card>

            {/* Section 4: Verification Upload & Extracted ID */}
            <Card className="overflow-hidden border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">ID Card Verification & Document Preview</h2>
                  <p className="text-[11px] text-slate-400">Government issued National ID Card (CNIC / Passport)</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-slate-400">Extracted ID / CNIC Number</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-base font-bold tracking-wider text-slate-900">
                          {displayIdCardNumber}
                        </span>
                        {displayIdCardNumber !== 'Not Provided' && (
                          <Badge tone="success" className="gap-1 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Extracted
                          </Badge>
                        )}
                      </dd>
                    </div>

                    <p className="text-xs text-slate-500">
                      This ID number was verified against blur, glare, and extracted automatically using OCR during onboarding.
                    </p>
                  </div>

                  {displayIdCardUrl && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewModalOpen(true)}
                        className="w-full gap-2 text-xs font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Full Size ID Card Photo
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
                    <span>Uploaded ID Document</span>
                    {displayIdCardUrl && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" /> Document Uploaded
                      </span>
                    )}
                  </div>

                  {displayIdCardUrl ? (
                    <div
                      onClick={() => setPreviewModalOpen(true)}
                      className="group relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <img
                        src={displayIdCardUrl}
                        alt="Uploaded ID Card"
                        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow">
                          <Eye className="h-3.5 w-3.5 text-teal-600" /> Click to Zoom
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-4 text-center">
                      <FileBadge className="h-8 w-8 text-slate-400" />
                      <p className="mt-2 text-xs font-medium text-slate-500">No ID Card uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* EDIT / FORM MODE: 4 Full Interactive Form Sections */
          <Card className="border border-slate-200/80 bg-white p-6 shadow-soft md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {currentStatus === 'pending_approval' ? 'Edit Business Details' : 'Submit Business Details'}
                </h2>
                <p className="text-xs text-slate-500">
                  Fill in all 4 sections accurately. Your submission will be verified by the admin.
                </p>
              </div>

              {currentStatus === 'pending_approval' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Company Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Section 1: Company Details
                    </h3>
                    <p className="text-[11px] text-slate-500">Official business registration information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    id="companyName"
                    label="Name of Company"
                    placeholder="e.g. Apex Global Supplies"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />

                  <Input
                    id="companyEmail"
                    label="Email of Company"
                    type="email"
                    placeholder="e.g. info@apexsupplies.com"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    required
                  />

                  <Input
                    id="companyPhone"
                    label="Official Phone Number"
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    required
                  />

                  <Select
                    id="businessCategory"
                    label="Business Category"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Business Category</option>
                    {businessCategoriesList.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {businessCategoriesList.length === 0 && (
                      <>
                        <option value="Mechanical & Automotive Parts">Mechanical & Automotive Parts</option>
                        <option value="Shoes & Footwear">Shoes & Footwear</option>
                        <option value="Clothing & Apparel">Clothing & Apparel</option>
                        <option value="Consumer Electronics & Gadgets">Consumer Electronics & Gadgets</option>
                        <option value="Beauty, Health & Personal Care">Beauty, Health & Personal Care</option>
                        <option value="Home, Kitchen & Furniture">Home, Kitchen & Furniture</option>
                        <option value="General Wholesale & Retail">General Wholesale & Retail</option>
                      </>
                    )}
                  </Select>

                  <Select
                    id="registrationEntity"
                    label="Registration Entity"
                    value={registrationEntity}
                    onChange={(e) => setRegistrationEntity(e.target.value)}
                    required
                  >
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                    <option value="Public Limited">Public Limited</option>
                    <option value="LLC / LLP">LLC / LLP</option>
                    <option value="Other">Other</option>
                  </Select>

                  <Input
                    id="registrationNo"
                    label="Registration No / NTN"
                    placeholder="e.g. 1234567-8"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    required
                  />

                  <Input
                    id="companyAddress"
                    label="Address of Company"
                    placeholder="Plot / Office Address, City"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Section 2: Owner Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Section 2: Owner Details
                    </h3>
                    <p className="text-[11px] text-slate-500">Identity details of the business owner</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    id="ownerName"
                    label="Owner Full Name"
                    placeholder="e.g. Muhammad Ali"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />

                  <Input
                    id="ownerEmail"
                    label="Owner Email"
                    type="email"
                    placeholder="e.g. owner@gmail.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                  />

                  <Input
                    id="ownerPhone"
                    label="Owner Phone Number"
                    type="tel"
                    placeholder="+92 321 9876543"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    required
                  />

                  <Input
                    id="ownerAddress"
                    label="Owner Address"
                    placeholder="Owner residential or contact address"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Section 3: Bank Details & International Client Account */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Section 3: Bank Details & International Client Account <span className="text-rose-500">* (Required)</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Official bank account & international payout channels for wallet settlements, disbursements & verified transactions
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                    <ShieldCheck className="h-3 w-3" /> IBAN Validated
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Bank Selection Dropdown */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Financial Institution <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      id="selectedBank"
                      value={selectedBankId}
                      onChange={(e) => handleBankSelect(e.target.value)}
                    >
                      <option value="">-- Choose Bank / Channel --</option>
                      <optgroup label="Pakistani Domestic Banks">
                        {POPULAR_BANKS.filter((b) => b.type === 'local').map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="International Wire & Digital Accounts">
                        {POPULAR_BANKS.filter((b) => b.type === 'international' || b.type === 'crypto').map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </optgroup>
                      <option value="other">Other Bank / Financial Institution</option>
                    </Select>
                  </div>

                  {/* Bank Name Text Input */}
                  <div className="sm:col-span-2">
                    <Input
                      id="bankName"
                      label="Bank / Financial Institution Name *"
                      placeholder="e.g. Meezan Bank Ltd / Habib Bank Limited / Wise"
                      value={bankName}
                      onChange={(e) => {
                        setBankName(e.target.value)
                        if (accountNumberOrIban) {
                          setIbanValidation(validateIban(accountNumberOrIban))
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    id="accountHolderName"
                    label="Bank Account Holder / Title *"
                    placeholder="Must match official company name or owner name"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    required
                  />

                  {/* Payout Currency */}
                  <Select
                    id="payoutCurrency"
                    label="Account / Payout Currency *"
                    value={payoutCurrency}
                    onChange={(e) => setPayoutCurrency(e.target.value)}
                    required
                  >
                    <option value="PKR">PKR (₨) — Pakistani Rupee</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </Select>
                </div>

                {/* Account Number or IBAN with real-time validation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Bank Account Number / IBAN (International Bank Account Number) <span className="text-rose-500">*</span>
                    </label>
                    {ibanValidation.isValid === true && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Valid IBAN ({ibanValidation.bankName || ibanValidation.country})
                      </span>
                    )}
                  </div>
                  <input
                    id="accountNumberOrIban"
                    type="text"
                    placeholder="e.g. PK36 MEZN 0001 0203 0405 0607"
                    value={accountNumberOrIban}
                    onChange={(e) => handleIbanInput(e.target.value)}
                    className={`w-full font-mono text-sm tracking-wider uppercase rounded-xl border p-2.5 transition focus:outline-none focus:ring-2 ${
                      ibanValidation.isValid === true
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950 focus:ring-emerald-400'
                        : ibanValidation.isValid === false
                          ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-400'
                          : 'border-slate-300 bg-white text-slate-800 focus:ring-purple-400'
                    }`}
                    required
                  />

                  {/* IBAN Feedback Helper */}
                  {ibanValidation.isValid === false && ibanValidation.error && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {ibanValidation.error}
                    </p>
                  )}
                  {ibanValidation.isValid === true && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <Check className="h-3 w-3" />
                      ISO 13616 Modulo 97 Checksum Passed &bull; Format: {ibanValidation.formattedIban}
                    </p>
                  )}
                  {ibanValidation.isValid === null && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Pakistani IBAN must be 24 characters starting with PK. International accounts use country standard length & SWIFT format.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    id="swiftOrBic"
                    label="SWIFT / BIC / Branch Routing Code (Optional for domestic IBFT, Required for International Wire)"
                    placeholder="e.g. MEZNPKKA or CHASUS33"
                    value={swiftOrBic}
                    onChange={(e) => setSwiftOrBic(e.target.value)}
                  />

                  <Input
                    id="bankBranch"
                    label="Branch Name & City"
                    placeholder="e.g. Main Branch, Karachi / Lahore"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 4: Verification Upload & ID Extraction */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Section 4: Upload : ID Card for Verification
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Upload clear photo of ID card (Auto blur check + auto ID number extraction)
                    </p>
                  </div>
                </div>

                {idCardError && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{idCardError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Upload ID Card Photo (Front Side) <span className="text-rose-500">*</span>
                    </label>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center cursor-pointer transition hover:border-teal-500 hover:bg-teal-50/20"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleIdCardChange}
                        className="hidden"
                      />

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 transition group-hover:scale-110">
                        <Upload className="h-5 w-5" />
                      </div>

                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        {idCardFile ? idCardFile.name : 'Click to select or drop ID card photo'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG, WEBP (Max 10MB). Image is auto-checked for blur and glare.
                      </p>
                    </div>

                    {scanningId && (
                      <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3">
                        <div className="flex items-center justify-between text-xs font-medium text-teal-800">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                            Checking image quality & extracting CNIC number…
                          </span>
                          <span>{scanProgress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-teal-200">
                          <div
                            className="h-full bg-teal-600 transition-all duration-300"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between space-y-3">
                    <Input
                      id="idCardNumber"
                      label="Extracted CNIC / ID Card Number"
                      placeholder="e.g. 42101-1234567-1 (Auto-extracted from photo)"
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      readOnly={Boolean(scanSuccess && idCardNumber)}
                      className={scanSuccess ? 'bg-emerald-50/50 font-mono font-bold text-emerald-950 border-emerald-300' : 'font-mono'}
                      required
                      helperText={
                        scanSuccess ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Automatically extracted from verified Pakistani CNIC card!
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Upload a sharp Pakistani CNIC image above to automatically extract and verify your CNIC number.
                          </span>
                        )
                      }
                    />

                    {idCardPreview && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                          <span>Document Preview:</span>
                          <button
                            type="button"
                            onClick={() => setPreviewModalOpen(true)}
                            className="text-teal-600 hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="h-3 w-3" /> Zoom
                          </button>
                        </div>
                        <div className="h-28 w-full overflow-hidden rounded bg-slate-100">
                          <img
                            src={idCardPreview}
                            alt="ID Card Preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {currentStatus === 'pending_approval' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={submitting || scanningId}
                  className="gap-2 bg-teal-600 text-white hover:bg-teal-700 px-6 py-2.5 font-semibold shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting Details…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save & Submit for Approval
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ID Photo Zoom Modal */}
        {previewModalOpen && displayIdCardUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={() => setPreviewModalOpen(false)}
          >
            <div
              className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-sm font-bold text-slate-800">
                  ID Document Photo — {displayOwnerName} ({displayIdCardNumber})
                </span>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-2">
                <img
                  src={displayIdCardUrl}
                  alt="Full ID Card Preview"
                  className="max-h-[72vh] w-auto object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}

export default UserBusinessDetailsPage
