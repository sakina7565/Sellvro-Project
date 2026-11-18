import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  UserCog,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Warehouse,
  Building2,
  Phone,
  MapPin,
  Upload,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  CreditCard,
  Landmark,
  BadgeCheck,
  Briefcase,
  AlertCircle,
} from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getErrorMessage, categoryApi } from '../lib/api.js'
import { validateImageQuality, extractIdCardNumber } from '../utils/idCardScanner.js'

function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()
  const fileInputRef = useRef(null)

  // Google OAuth connected state
  const [googleUser, setGoogleUser] = useState(location.state?.googleUser || null)

  const [role, setRole] = useState(googleUser ? 'user' : '')

  // Company Details
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  // const [registrationEntity, setRegistrationEntity] = useState('')
  // const [registrationNo, setRegistrationNo] = useState('')

  // Business categories list from database
  const [businessCategoriesList, setBusinessCategoriesList] = useState([])

  // Owner Details
  const [ownerName, setOwnerName] = useState(googleUser?.name || '')
  const [ownerEmail, setOwnerEmail] = useState(googleUser?.email || '')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')

  // Bank & Settlement Details
  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState(googleUser?.name || '')
  const [accountNumberOrIban, setAccountNumberOrIban] = useState('')

  // Verification Upload & OCR State
  const [idCardFile, setIdCardFile] = useState(null)
  const [idCardNumber, setIdCardNumber] = useState('')
  const [idCardError, setIdCardError] = useState('')
  const [scanningId, setScanningId] = useState(false)
  const [scanSuccess, setScanSuccess] = useState('')
  const [scanProgress, setScanProgress] = useState(0)

  // Passwords
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Error & Validation States
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Load active business categories dynamically
  useEffect(() => {
    let active = true
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.businessCategories()
        if (active && Array.isArray(res.data)) {
          setBusinessCategoriesList(res.data)
        }
      } catch (err) {
        console.warn('Failed to load business categories:', err)
      }
    }
    fetchCategories()
    return () => {
      active = false
    }
  }, [])

  // Sync state if redirected with Google user
  useEffect(() => {
    if (location.state?.googleUser) {
      const gUser = location.state.googleUser
      setGoogleUser(gUser)
      setOwnerEmail(gUser.email || '')
      setOwnerName(gUser.name || '')
      setAccountHolderName((prev) => prev || gUser.name || '')
      setRole((prev) => prev || 'user')
    }
  }, [location.state])

  // Clear specific field error as user types
  const clearFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const copy = { ...prev }
        delete copy[fieldName]
        return copy
      })
    }
    if (error && Object.keys(fieldErrors).length <= 1) {
      setError('')
    }
  }

  const handleGoogleSuccess = (gUser) => {
    setGoogleUser(gUser)
    setOwnerEmail(gUser.email || '')
    setOwnerName(gUser.name || '')
    if (!accountHolderName) setAccountHolderName(gUser.name || '')
    if (!role) setRole('user')
    clearFieldError('ownerEmail')
    clearFieldError('ownerName')
    clearFieldError('role')
    setError('')
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIdCardError('')
    setScanSuccess('')
    setError('')
    clearFieldError('idCardFile')

    // 10MB file limit
    if (file.size > 10 * 1024 * 1024) {
      setIdCardError('File size too large. Please select a file smaller than 10 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setIdCardError('Invalid file format. Please upload JPG, PNG, WEBP or PDF.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // PDF documents skip image pixel analysis
    if (file.type === 'application/pdf') {
      setIdCardFile(file)
      return
    }

    // Step 1: Image Quality Inspection (Blur, Overexposure, Glare)
    setScanningId(true)
    setScanProgress(15)

    try {
      const quality = await validateImageQuality(file)
      if (!quality.isValid) {
        setIdCardFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setIdCardError(quality.error)
        setFieldErrors((prev) => ({ ...prev, idCardFile: quality.error }))
        setError(quality.error)
        setScanningId(false)
        return
      }

      // Quality passed! Set the file
      setIdCardFile(file)
      setScanProgress(35)

      // Step 2: OCR ID Card Number Extraction
      const ocrResult = await extractIdCardNumber(file, (p) => {
        setScanProgress(35 + Math.round(p * 0.6))
      })

      if (ocrResult.found && ocrResult.idNumber) {
        setIdCardNumber(ocrResult.idNumber)
        clearFieldError('idCardNumber')
        setScanSuccess(`ID Card Number detected: ${ocrResult.idNumber}`)
      }
    } catch (err) {
      console.warn('ID Card scan notice:', err)
      setIdCardFile(file)
    } finally {
      setScanningId(false)
    }
  }

  const removeFile = () => {
    setIdCardFile(null)
    setIdCardError('')
    setScanSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Validate all fields
  const validateForm = () => {
    const errs = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!role) {
      errs.role = 'Please select whether you want to register as a Supplier or User.'
    }

    // Section 1: Company Details
    if (!companyName.trim()) {
      errs.companyName = 'Name of Company is required.'
    }
    if (!companyEmail.trim()) {
      errs.companyEmail = 'Email of Company is required.'
    } else if (!emailRegex.test(companyEmail.trim())) {
      errs.companyEmail = 'Please enter a valid company email address.'
    }
    if (!companyPhone.trim()) {
      errs.companyPhone = 'Official Phone Number is required.'
    }
    if (!companyAddress.trim()) {
      errs.companyAddress = 'Address of Company is required.'
    }
    if (!businessCategory) {
      errs.businessCategory = 'Please select a Business Category.'
    }
    // if (!registrationEntity) {
    //   errs.registrationEntity = 'Please select a Registration Entity type.'
    // }
    // if (!registrationNo.trim()) {
    //   errs.registrationNo = 'Registration No / NTN is required.'
    // }

    // Section 2: Owner Details
    if (!ownerName.trim()) {
      errs.ownerName = 'Owner Full Name is required.'
    }
    if (!ownerEmail.trim()) {
      errs.ownerEmail = 'Owner Email is required.'
    } else if (!emailRegex.test(ownerEmail.trim())) {
      errs.ownerEmail = 'Please enter a valid owner email address.'
    }
    if (!ownerPhone.trim()) {
      errs.ownerPhone = 'Owner Phone Number is required.'
    }
    if (!ownerAddress.trim()) {
      errs.ownerAddress = 'Owner Address is required.'
    }

    // Section 3: Bank Details
    if (!bankName.trim()) {
      errs.bankName = 'Bank Name is required.'
    }
    if (!accountHolderName.trim()) {
      errs.accountHolderName = 'Account Holder Name is required.'
    }
    if (!accountNumberOrIban.trim()) {
      errs.accountNumberOrIban = 'Account Number or IBAN is required.'
    }

    // Section 4: Verification Upload & ID
    if (!idCardFile) {
      errs.idCardFile = 'Please upload your ID Card photo for verification.'
    }
    if (!idCardNumber.trim()) {
      errs.idCardNumber = 'ID Card / CNIC Number is required.'
    }

    // Section 5: Password
    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm Password is required.'
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      const count = Object.keys(validationErrors).length
      setError(`Please fill in all ${count} required field(s) highlighted in red below.`)

      // Smooth scroll directly to the first invalid field
      const firstKey = Object.keys(validationErrors)[0]
      const el = document.getElementById(firstKey) || document.querySelector(`[name="${firstKey}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus?.()
      }
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('role', role)
      formData.append('companyName', companyName.trim())
      formData.append('companyEmail', companyEmail.toLowerCase().trim())
      formData.append('companyPhone', companyPhone.trim())
      formData.append('companyAddress', companyAddress.trim())
      formData.append('businessCategory', businessCategory)
      // formData.append('registrationEntity', registrationEntity)
      // formData.append('registrationNo', registrationNo.trim())
      formData.append('ownerName', ownerName.trim())
      formData.append('ownerEmail', ownerEmail.toLowerCase().trim())
      formData.append('ownerPhone', ownerPhone.trim())
      formData.append('ownerAddress', ownerAddress.trim())
      formData.append('bankName', bankName.trim())
      formData.append('accountHolderName', accountHolderName.trim())
      formData.append('accountNumberOrIban', accountNumberOrIban.trim())
      formData.append('idCardNumber', idCardNumber.trim())
      formData.append('password', password)
      formData.append('confirmPassword', confirmPassword)
      if (googleUser?.googleId) {
        formData.append('googleId', googleUser.googleId)
      }
      if (idCardFile) {
        formData.append('idCard', idCardFile)
      }

      const data = await register(formData)
      navigate(data.redirectTo, { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err, 'Registration failed. Please try again.')
      setError(msg)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const errorCount = Object.keys(fieldErrors).length

  return (
    <AuthLayout cardClassName="max-w-2xl transition-all duration-300">
      <h1 className="text-center text-xl font-bold text-slate-900">
        {role === 'supplier'
          ? 'Supplier Registration'
          : role === 'user'
            ? 'User Registration'
            : 'Create an Account'}
      </h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        {role === 'supplier'
          ? 'Register your company and start selling on Sellvro & WMS'
          : role === 'user'
            ? 'Register your business and start buying on Sellvro Marketplace'
            : 'Select your role below to get started'}
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        {/* Top Summary Alert */}
        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-start gap-2.5 shadow-sm animate-fadeIn">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950 text-sm">{error}</p>
              {errorCount > 0 && (
                <p className="mt-0.5 text-rose-700">
                  Please review the highlighted fields in red below and fill them in accurately.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Google Connected Status Card */}
        {googleUser && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-emerald-950 block text-[13px]">Google Account Connected</span>
                <span className="font-mono text-emerald-800">{googleUser.email}</span>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300">
              ✓ Verified via Google
            </span>
          </div>
        )}

        {/* Fast Sign Up with Google Button if not yet connected */}
        {/* {!googleUser && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Fast Registration:</span>
              <span className="text-[11px] text-slate-400">1-click Google connect</span>
            </div>
            <GoogleSignInButton
              defaultRole={role || 'user'}
              label="Sign up with Google"
              onGoogleSuccess={handleGoogleSuccess}
            />
          </div>
        )} */}

        {/* Role Selector */}
        <Select
          id="role"
          name="role"
          label="Register as *"
          icon={UserCog}
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            clearFieldError('role')
          }}
          error={fieldErrors.role}
          required
          className={!role ? 'text-slate-400' : ''}
        >
          <option value="" disabled>
            Select Role (Supplier or User)
          </option>
          <option value="supplier">Supplier (Manufacturer / Brand)</option>
          <option value="user">User (Reseller / Buyer)</option>
        </Select>

        {role === 'supplier' && (
          <div className="rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50/90 via-sky-50/70 to-primary-50/90 p-3.5 shadow-2xs text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-2xs mt-0.5">
                <Warehouse className="h-4 w-4" />
              </div>
              <div className="leading-relaxed">
                <span className="font-bold text-primary-950 block text-[12px]">
                  Notice for Existing WMS Suppliers:
                </span>
                <p className="mt-0.5 text-slate-700">
                  If you already have an account on <strong>WMS (wmsbysellvro.com)</strong>, you do not need to register again. Simply visit the{' '}
                  <Link to="/login" className="font-bold text-primary underline underline-offset-2 hover:text-primary-800">
                    Sign In page
                  </Link>{' '}
                  and log in with your existing WMS credentials.
                </p>
              </div>
            </div>
          </div>
        )}

        {role === 'user' && (
          <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-sky-50/90 p-3.5 shadow-2xs text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs mt-0.5">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="leading-relaxed">
                <span className="font-bold text-sky-950 block text-[12px]">
                  Business Verification for Resellers:
                </span>
                <p className="mt-0.5 text-slate-700">
                  Please submit your verified company and owner details below. Once registered, your application will be reviewed and activated by the Sellvro Admin.
                </p>
              </div>
            </div>
          </div>
        )}

        {role ? (
          <div className="space-y-5">
            {/* ── Section 1: Company Details ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-100 text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Section 1: Company Details
                </h3>
              </div>

              <Input
                id="companyName"
                name="companyName"
                label="Name of Company *"
                icon={Building2}
                placeholder="e.g. Apex Industrial Manufacturing Pvt Ltd"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  clearFieldError('companyName')
                }}
                error={fieldErrors.companyName}
                required
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  id="companyEmail"
                  name="companyEmail"
                  label="Email of Company *"
                  type="email"
                  icon={Mail}
                  placeholder="official@company.com"
                  value={companyEmail}
                  onChange={(e) => {
                    setCompanyEmail(e.target.value)
                    clearFieldError('companyEmail')
                  }}
                  error={fieldErrors.companyEmail}
                  required
                />
                <Input
                  id="companyPhone"
                  name="companyPhone"
                  label="Official Phone Number *"
                  type="tel"
                  icon={Phone}
                  placeholder="+92 300 1234567"
                  value={companyPhone}
                  onChange={(e) => {
                    setCompanyPhone(e.target.value)
                    clearFieldError('companyPhone')
                  }}
                  error={fieldErrors.companyPhone}
                  required
                />
              </div>

              <Input
                id="companyAddress"
                name="companyAddress"
                label="Address of Company *"
                icon={MapPin}
                placeholder="Industrial Area, Factory / Office Address"
                value={companyAddress}
                onChange={(e) => {
                  setCompanyAddress(e.target.value)
                  clearFieldError('companyAddress')
                }}
                error={fieldErrors.companyAddress}
                required
              />

              {/* Dynamic Business Category Dropdown */}
              <Select
                id="businessCategory"
                name="businessCategory"
                label="Business Category *"
                icon={Briefcase}
                value={businessCategory}
                onChange={(e) => {
                  setBusinessCategory(e.target.value)
                  clearFieldError('businessCategory')
                }}
                error={fieldErrors.businessCategory}
                required
              >
                <option value="" disabled>
                  Select Business Category
                </option>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* <Select
                  id="registrationEntity"
                  name="registrationEntity"
                  label="Registration Entity *"
                  icon={FileBadge}
                  value={registrationEntity}
                  onChange={(e) => {
                    setRegistrationEntity(e.target.value)
                    clearFieldError('registrationEntity')
                  }}
                  error={fieldErrors.registrationEntity}
                  required
                >
                  <option value="" disabled>
                    Select Entity Type
                  </option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Private Limited Company (Pvt Ltd)">Private Limited Company (Pvt Ltd)</option>
                  <option value="Public Limited Company (Ltd)">Public Limited Company (Ltd)</option>
                  <option value="Limited Liability Company (LLC)">Limited Liability Company (LLC)</option>
                  <option value="Partnership / AOP">Partnership / AOP</option>
                  <option value="Other">Other</option>
                </Select>

                <Input
                  id="registrationNo"
                  name="registrationNo"
                  label="Registration No / NTN *"
                  icon={FileBadge}
                  placeholder="e.g. NTN / SECP / Reg #"
                  value={registrationNo}
                  onChange={(e) => {
                    setRegistrationNo(e.target.value)
                    clearFieldError('registrationNo')
                  }}
                  error={fieldErrors.registrationNo}
                  required
                /> */}
              </div>
            </div>

            {/* ── Section 2: Owner Details ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <User className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Section 2: Owner Details
                </h3>
              </div>

              <Input
                id="ownerName"
                name="ownerName"
                label="Owner Full Name *"
                icon={User}
                placeholder="Full name of owner"
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value)
                  clearFieldError('ownerName')
                }}
                error={fieldErrors.ownerName}
                required
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  id="ownerEmail"
                  name="ownerEmail"
                  label="Owner Email (Account Login) *"
                  type="email"
                  icon={Mail}
                  placeholder="owner@example.com"
                  value={ownerEmail}
                  onChange={(e) => {
                    setOwnerEmail(e.target.value)
                    clearFieldError('ownerEmail')
                  }}
                  error={fieldErrors.ownerEmail}
                  required
                  readOnly={Boolean(googleUser)}
                  helperText={googleUser ? '✓ Verified with your Google Account' : ''}
                />
                <Input
                  id="ownerPhone"
                  name="ownerPhone"
                  label="Owner Phone Number *"
                  type="tel"
                  icon={Phone}
                  placeholder="+92 321 7654321"
                  value={ownerPhone}
                  onChange={(e) => {
                    setOwnerPhone(e.target.value)
                    clearFieldError('ownerPhone')
                  }}
                  error={fieldErrors.ownerPhone}
                  required
                />
              </div>

              <Input
                id="ownerAddress"
                name="ownerAddress"
                label="Owner Personal / Residential Address *"
                icon={MapPin}
                placeholder="Residential or Personal Address of Owner"
                value={ownerAddress}
                onChange={(e) => {
                  setOwnerAddress(e.target.value)
                  clearFieldError('ownerAddress')
                }}
                error={fieldErrors.ownerAddress}
                required
              />
            </div>

            {/* ── Section 3: Bank Details ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
                  <Landmark className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Section 3: Bank Details
                </h3>
              </div>

              <Input
                id="bankName"
                name="bankName"
                label="Bank Name *"
                icon={Landmark}
                placeholder="e.g. Meezan Bank, HBL, Allied Bank, Standard Chartered"
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value)
                  clearFieldError('bankName')
                }}
                error={fieldErrors.bankName}
                required
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  id="accountHolderName"
                  name="accountHolderName"
                  label="Account Holder Name *"
                  icon={User}
                  placeholder="Title of account / Account holder"
                  value={accountHolderName}
                  onChange={(e) => {
                    setAccountHolderName(e.target.value)
                    clearFieldError('accountHolderName')
                  }}
                  error={fieldErrors.accountHolderName}
                  required
                />
                <Input
                  id="accountNumberOrIban"
                  name="accountNumberOrIban"
                  label="Account Number or IBAN *"
                  icon={CreditCard}
                  placeholder="PK00 MEZN 0000 0000 0000 0000 or Account #"
                  value={accountNumberOrIban}
                  onChange={(e) => {
                    setAccountNumberOrIban(e.target.value)
                    clearFieldError('accountNumberOrIban')
                  }}
                  error={fieldErrors.accountNumberOrIban}
                  required
                />
              </div>
            </div>

            {/* ── Section 4: Verification Upload & ID Extraction ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Upload className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Section 4: Upload : ID Card for Verification
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">
                  Please upload a clear front photo of your CNIC / National ID Card or Passport (Max 10 MB). System automatically inspects image quality (blur & glare) and extracts your ID number.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="idCardFile"
                  name="idCardFile"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Quality / Glare / Blur Error Message */}
                {idCardError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/95 p-3.5 text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-bold block text-rose-900 text-[13px]">Image Quality Error:</span>
                      <p className="mt-0.5 text-rose-800 leading-relaxed">{idCardError}</p>
                    </div>
                  </div>
                )}

                {/* Scanning & Progress Indicator */}
                {scanningId && (
                  <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-3.5 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-primary-900 font-semibold">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                        Scanning ID card quality & extracting ID number…
                      </span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-100">
                      <div
                        className="h-full bg-primary-600 transition-all duration-300 rounded-full"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Extracted CNIC Success Banner */}
                {scanSuccess && !scanningId && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-950">ID Number Extracted:</span>{' '}
                        <span className="font-mono font-bold text-emerald-900">{idCardNumber}</span>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  </div>
                )}

                {!idCardFile ? (
                  <button
                    type="button"
                    disabled={scanningId}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors ${fieldErrors.idCardFile
                      ? 'border-rose-400 bg-rose-50/50 hover:bg-rose-50'
                      : 'border-slate-300 bg-white hover:border-primary-400 hover:bg-primary-50/30'
                      }`}
                  >
                    <Upload className={`h-7 w-7 ${fieldErrors.idCardFile ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span className={`mt-2 text-xs font-semibold ${fieldErrors.idCardFile ? 'text-rose-700' : 'text-slate-700'}`}>
                      Click to choose ID Card photo *
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-400">
                      JPG, PNG, WEBP, or PDF up to 10 MB (Clear & sharp photo required)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      <div className="truncate text-left">
                        <p className="truncate text-xs font-semibold text-emerald-950">
                          {idCardFile.name}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          {(idCardFile.size / 1024).toFixed(1)} KB · Quality verified & attached
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="ml-2 rounded p-1 text-slate-400 hover:bg-emerald-100 hover:text-rose-600 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {fieldErrors.idCardFile && !idCardFile && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.idCardFile}</span>
                  </p>
                )}

                {/* ID Card / CNIC Number Field */}
                <div className="pt-1">
                  <Input
                    id="idCardNumber"
                    name="idCardNumber"
                    label="ID Card / CNIC Number *"
                    icon={CreditCard}
                    placeholder="e.g. 42101-1234567-1 or Passport Number"
                    value={idCardNumber}
                    onChange={(e) => {
                      setIdCardNumber(e.target.value)
                      clearFieldError('idCardNumber')
                    }}
                    error={fieldErrors.idCardNumber}
                    required
                    helperText="Auto-filled from ID photo, or verify / adjust manually if needed."
                  />
                </div>
              </div>
            </div>

            {/* ── Section 5: Account Password ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Section 5: Account Password (Direct Email Login)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Set a password so you can also log in directly using your email and password.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  id="password"
                  name="password"
                  label="Password *"
                  type="password"
                  icon={Lock}
                  placeholder="Create password (min 6 chars)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearFieldError('password')
                  }}
                  error={fieldErrors.password}
                  autoComplete="new-password"
                  required
                />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password *"
                  type="password"
                  icon={ShieldCheck}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    clearFieldError('confirmPassword')
                  }}
                  error={fieldErrors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Please select whether you want to register as a <strong>Supplier</strong> or a <strong>User</strong> above to view the registration form.
          </div>
        )}

        {/* Bottom Error Summary Box (Right above submit button) */}
        {errorCount > 0 && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/95 p-4 text-xs font-semibold text-rose-800 flex items-start gap-3 shadow-sm animate-fadeIn">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950 text-sm">
                Cannot submit: Please fill in {errorCount} required field(s) highlighted in red:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                {Object.values(fieldErrors).slice(0, 4).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
                {errorCount > 4 && <li>...and {errorCount - 4} other field(s)</li>}
              </ul>
              <p className="text-[11px] text-rose-600 font-normal pt-1">
                Click on any highlighted input above to complete it.
              </p>
            </div>
          </div>
        )}

        <Button type="submit" fullWidth disabled={submitting || !role} className="mt-2 text-sm font-bold py-2.5">
          {submitting
            ? 'Creating account…'
            : role === 'supplier'
              ? 'Register as Supplier'
              : role === 'user'
                ? 'Register as User'
                : 'Select Role to Continue'}
        </Button>
      </form>

      {role !== 'supplier' && !googleUser && (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 font-semibold text-slate-400">Or register with</span>
            </div>
          </div>

          <GoogleSignInButton
            defaultRole={role || 'user'}
            label="Sign up with Google"
            onGoogleSuccess={handleGoogleSuccess}
          />
        </>
      )}

      <div className="mt-5 space-y-2 text-center text-sm text-slate-500">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-700">
            Login
          </Link>
        </p>
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
          Admin or Staff member?{' '}
          <Link to="/admin/login" className="font-semibold text-slate-600 hover:text-slate-900">
            Admin Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default RegisterPage
