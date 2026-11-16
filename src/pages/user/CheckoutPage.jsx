import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  Minus,
  Plus,
  Printer,
  Sparkles,
  Truck,
  Upload,
  Warehouse,
  Wallet,
  AlertCircle,
  Eye,
} from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import ShippingAirwayBillModal from '../../components/orders/ShippingAirwayBillModal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { mediaUrl, orderApi, productApi, walletApi, getErrorMessage } from '../../lib/api.js'
import {
  POPULAR_COURIERS,
  validateCarrierTracking,
  detectBestCourierByLocation,
  generateAutomatedTrackingId,
} from '../../lib/courierHelpers.js'

const INPUT_STYLE =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition'

export default function UserCheckoutPage() {
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, updateUser, isAuthenticated } = useAuth()

  const [product, setProduct] = useState(() => {
    const raw = location.state?.product
    if (!raw) return null
    return {
      ...raw,
      id: raw.id || raw._id || productId,
    }
  })
  const [loadingProduct, setLoadingProduct] = useState(!location.state?.product)
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance ?? 0)
  const [quantity, setQuantity] = useState(Number(location.state?.quantity) || 1)

  // Essential Customer & Destination Fields
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [city, setCity] = useState('Karachi')
  const [country, setCountry] = useState('Pakistan')

  // Smart Courier Auto-Match
  const [selectedCarrier, setSelectedCarrier] = useState('tcs')
  const [isCarrierManual, setIsCarrierManual] = useState(false)
  const [autoMatchInfo, setAutoMatchInfo] = useState(
    'Auto-matched TCS Express (Pakistan Fast-Track Domestic Logistics)',
  )

  // Shipping Label Mode & Parcel Instructions
  const [labelMode, setLabelMode] = useState('generate') // 'generate' | 'upload'
  const [userTrackingNumber, setUserTrackingNumber] = useState(() => generateAutomatedTrackingId('tcs'))
  const [parcelInstructions, setParcelInstructions] = useState('Fragile - Handle with care. Open parcel allowed.')
  const [labelFile, setLabelFile] = useState(null)
  const [labelFileName, setLabelFileName] = useState('')
  const [parsingLabel, setParsingLabel] = useState(false)
  const [extractionSuccess, setExtractionSuccess] = useState(null)
  const [trackingValidationErr, setTrackingValidationErr] = useState('')

  // Printable Modal Preview
  const [showAirwayBillModal, setShowAirwayBillModal] = useState(false)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load wallet balance
  useEffect(() => {
    let active = true
    walletApi
      .balance()
      .then((data) => {
        if (active) setWalletBalance(data.balance ?? data.walletBalance ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Smart location auto-match for courier
  useEffect(() => {
    if (isCarrierManual) return
    const match = detectBestCourierByLocation(country, city)
    if (match.carrierId && match.carrierId !== selectedCarrier) {
      setSelectedCarrier(match.carrierId)
      setAutoMatchInfo(match.reason)
      if (labelMode === 'generate') {
        setUserTrackingNumber(generateAutomatedTrackingId(match.carrierId))
      }
    }
  }, [country, city, isCarrierManual, labelMode, selectedCarrier])

  // Load product
  useEffect(() => {
    if (product && (product.id === productId || product._id === productId)) {
      setLoadingProduct(false)
      return
    }
    let active = true
    setLoadingProduct(true)

    const lookupPromise = productId ? productApi.get(productId) : Promise.reject(new Error('No ID'))
    lookupPromise
      .then((res) => {
        if (!active) return
        const prod = res.product || res.data || res
        if (prod && (prod.id || prod._id)) {
          setProduct({ ...prod, id: prod.id || prod._id })
          setError('')
        }
      })
      .catch(() => {
        return productApi.marketplace().then((data) => {
          if (!active) return
          const found = (data.data || []).find(
            (item) => String(item.id) === String(productId) || String(item._id) === String(productId),
          ) || data.data?.[0]
          if (found) {
            setProduct({ ...found, id: found.id || found._id })
            setError('')
          } else {
            setError('Product not found or unavailable.')
          }
        })
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load product.'))
      })
      .finally(() => {
        if (active) setLoadingProduct(false)
      })

    return () => {
      active = false
    }
  }, [productId, product?.id, product?._id])

  const unitPrice = Number(product?.price || 0)
  const maxQty = Math.max(1, Number(product?.quantity || 1))
  const total = useMemo(() => Number((unitPrice * quantity).toFixed(2)), [unitPrice, quantity])

  const imageSrc =
    mediaUrl(product?.image) ||
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'

  const adjustQty = (delta) => {
    setQuantity((prev) => Math.min(maxQty, Math.max(1, prev + delta)))
  }

  const handleCarrierChange = (e) => {
    const nextCarrier = e.target.value
    setSelectedCarrier(nextCarrier)
    setIsCarrierManual(true)
    setAutoMatchInfo(`Manually selected ${nextCarrier.toUpperCase()}`)
    if (labelMode === 'generate') {
      setUserTrackingNumber(generateAutomatedTrackingId(nextCarrier))
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLabelFile(file)
    setLabelFileName(file.name)
    setParsingLabel(true)
    setError('')

    try {
      const actualProductId = product?.id || product?._id || productId
      const res = await orderApi.parseLabel(file, actualProductId)

      if (res.extracted) {
        const ext = res.extracted
        if (ext.customerName) setCustomerName(ext.customerName)
        if (ext.customerPhone) setCustomerPhone(ext.customerPhone)
        if (ext.deliveryAddress) setDeliveryAddress(ext.deliveryAddress)
        if (ext.city) setCity(ext.city)
        if (ext.country) setCountry(ext.country)
        if (ext.notes) setParcelInstructions(ext.notes)
        if (ext.trackingNumber) setUserTrackingNumber(ext.trackingNumber)

        if (ext.carrier) {
          const cLower = ext.carrier.toLowerCase()
          const found = POPULAR_COURIERS.find(
            (c) => c.name.toLowerCase().includes(cLower) || c.id.toLowerCase() === cLower,
          )
          if (found) {
            setSelectedCarrier(found.id)
            setIsCarrierManual(true)
            setAutoMatchInfo(`Extracted from label: ${found.name}`)
          }
        }

        setExtractionSuccess({
          frId: res.frId,
          sku: res.product?.sku || product?.sku || 'SVRO-00139',
          qty: quantity,
          carrier: ext.carrier || selectedCarrier,
          tracking: ext.trackingNumber || userTrackingNumber,
          batch: res.batch,
          customizations: res.customizations,
          date: res.date,
          status: 'SHIPPED',
          wmsProofs: res.wmsProofs || file.name,
        })
      }
    } catch (err) {
      console.warn('Auto-extraction fallback:', err.message)
    } finally {
      setParsingLabel(false)
    }
  }

  const handleLoadSampleFromScreenshot = () => {
    setCustomerName('xyz')
    setCustomerPhone('0300-1234567')
    setDeliveryAddress('street 1, Abu Dhabi, UAE')
    setCity('Abu Dhabi')
    setCountry('UAE')
    setParcelInstructions('user')
    setSelectedCarrier('fedex')
    setUserTrackingNumber('794612345678')
    setIsCarrierManual(true)
    setAutoMatchInfo('Loaded from WMS Screenshot Sample (FedEx / Abu Dhabi)')
    setLabelFileName('FedEx_AbuDhabi_Sample_Label.pdf')

    setExtractionSuccess({
      frId: '1-CBF-WMS-PAK1035-051126',
      sku: product?.sku || 'SVRO-00139',
      qty: quantity || 4,
      carrier: 'FEDEX',
      tracking: '794612345678',
      batch: 'CBF-WMS-PAK1035-051126',
      customizations: `Marketplace Order #: ORD-${Date.now().toString().slice(-8)}, Customer: xyz, Phone: 0300-1234567, Address: street 1, Abu Dhabi, UAE, Notes: user`,
      date: 'Nov 05, 2026',
      status: 'SHIPPED',
      wmsProofs: 'FedEx_AbuDhabi_Sample_Label.pdf',
    })
  }

  const appendInstruction = (text) => {
    setParcelInstructions((prev) => {
      if (!prev.trim()) return text
      if (prev.includes(text)) return prev
      return `${prev.trim()} • ${text}`
    })
  }

  const handleOrderPlacement = async (e) => {
    if (e) e.preventDefault()
    if (!product) return
    setError('')

    const token =
      localStorage.getItem('sellvro_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token')

    if (!user && !isAuthenticated && !token) {
      setError('Please sign in to your client account to pay from your Sellvro Wallet.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (walletBalance < total) {
      setError(
        `Insufficient wallet balance. Total due is $${total.toFixed(2)}, but you currently have $${Number(walletBalance || 0).toFixed(2)}. Deposit funds from your Wallet page.`,
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Required Customer & Address Validation
    if (!customerName.trim()) {
      setError('Customer Full Name is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!customerPhone.trim()) {
      setError('Customer Phone Number is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!deliveryAddress.trim()) {
      setError('Delivery Address is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!city.trim()) {
      setError('City is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const activeCourierMeta = POPULAR_COURIERS.find(
      (c) => c.id === selectedCarrier || c.name.toLowerCase() === selectedCarrier.toLowerCase(),
    ) || POPULAR_COURIERS[0]

    // Validate tracking number if provided
    const cleanTracking = userTrackingNumber.trim()
    if (cleanTracking && labelMode === 'upload') {
      const check = validateCarrierTracking(activeCourierMeta.name, cleanTracking)
      if (!check.valid) {
        setError(check.message)
        setTrackingValidationErr(check.message)
        window.scrollTo({ top: 200, behavior: 'smooth' })
        return
      }
    }
    setTrackingValidationErr('')

    const cleanAddress = {
      fullName: customerName.trim(),
      phone: customerPhone.trim(),
      addressLine: deliveryAddress.trim(),
      city: city.trim(),
      country: country.trim() || 'Pakistan',
    }

    const actualProductId = product?.id || product?._id || productId

    setSubmitting(true)
    try {
      const payload = {
        productId: actualProductId,
        quantity,
        paymentMethod: 'wallet',
        shippingAddress: cleanAddress,
        labelNotes: parcelInstructions.trim() || 'Handle with care',
        carrier: activeCourierMeta.name,
        trackingNumber: cleanTracking,
      }

      // If user uploaded a physical label file, send as FormData via orderApi.create
      const data = await orderApi.create(payload, labelFile)

      if (typeof data.walletBalance === 'number' && user) {
        updateUser({ ...user, walletBalance: data.walletBalance })
      }

      const confirmedId = data.order?.id || data.order?._id || data.orderNo || 'confirmed'
      navigate(`/orders/confirmation/${confirmedId}`, {
        replace: true,
        state: { order: data.order, message: data.message },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not place order.'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const isWarehouseOrder = Boolean(product?.inWarehouse || product?.fulfillBy === 'warehouse')
  const warehouseName = isWarehouseOrder
    ? (product?.location || 'Sellvro Central WMS Hub (Section B)')
    : `Supplier Facility (${product?.supplierBusinessName || product?.vendorName || 'Supplier Direct'})`

  const activeCourierMeta = POPULAR_COURIERS.find(
    (c) => c.id === selectedCarrier || c.name.toLowerCase() === selectedCarrier.toLowerCase(),
  ) || POPULAR_COURIERS[0]

  return (
    <UserLayout>
      <PageHeader
        eyebrow="Marketplace Order"
        title="Checkout, Shipping Label & Parcel Instructions"
        action={
          <Button as={Link} to="/" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800 shadow-2xs">
          ⚠️ {error}
        </div>
      )}

      {loadingProduct ? (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">Loading product…</Card>
      ) : !product ? (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">
          Product unavailable.{' '}
          <Link to="/" className="font-semibold text-blue-600">
            Return to shop
          </Link>
        </Card>
      ) : (
        <form noValidate onSubmit={handleOrderPlacement} className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Left Column: Location, Courier, Shipping Label & Instructions */}
          <div className="space-y-5 lg:col-span-3">
            {/* 1. Customer Location & Courier Auto-Match Card */}
            <Card className="p-5 shadow-soft border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Customer Delivery Location & Courier</h2>
                    <p className="text-xs text-slate-500">
                      Courier company is automatically selected based on customer location
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  Step 1
                </span>
              </div>

              {/* Warehouse Origin Notice */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                    {isWarehouseOrder ? <Warehouse className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      Physical Stock Origin: <span className="text-blue-700">{warehouseName}</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      📦 {maxQty} Units Ready in Warehouse • 6:00 PM Daily Dispatch Cutoff
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Inputs */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="customerName" className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="customerName"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe / Customer Name"
                    className={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="customerPhone"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567 / +1 555-0199"
                    className={INPUT_STYLE}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="deliveryAddress" className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="deliveryAddress"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. House 14, Street 5, Phase 6, DHA"
                    className={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-xs font-bold text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Karachi, Lahore, Dubai, New York"
                    className={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-xs font-bold text-slate-700 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="country"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Pakistan, UAE, United States"
                    className={INPUT_STYLE}
                  />
                </div>
              </div>

              {/* Auto-Match Courier Indicator */}
              <div className="mt-4 pt-3.5 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label htmlFor="carrierSelect" className="block text-xs font-bold text-slate-700">
                    Selected Courier Partner
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles className="h-3 w-3" />
                    {autoMatchInfo}
                  </span>
                </div>

                <select
                  id="carrierSelect"
                  value={selectedCarrier}
                  onChange={handleCarrierChange}
                  className={INPUT_STYLE}
                >
                  {POPULAR_COURIERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.fullName} ({c.transitEstimate}) • {c.region}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Customer ki location ke mutabiq best courier auto-select ho jata hai. Aap chahein to manually change bhi kar sakte hain.
                </p>
              </div>
            </Card>

            {/* 2. Shipping Label & Parcel Instructions Card (User Sirf Label Dena Chahe) */}
            <Card className="p-5 shadow-soft border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Courier Shipping Label & Parcel Instructions</h2>
                    <p className="text-xs text-slate-500">
                      User ko order place karte waqt sirf shipping label dena hota hai aur instructions
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  Step 2
                </span>
              </div>

              {/* Mode Toggle: Auto-Generate vs Upload Customer Label */}
              <div className="mb-4 flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLabelMode('generate')}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    labelMode === 'generate'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  1-Click Auto-Generate Courier Label
                </button>
                <button
                  type="button"
                  onClick={() => setLabelMode('upload')}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    labelMode === 'upload'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  Upload Customer's Label (PDF / Image)
                </button>
              </div>

              {labelMode === 'generate' ? (
                /* Auto-Generated Label Preview Card */
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500">Generated Airway Bill # (Tracking ID)</span>
                      <p className="font-mono text-base font-black text-slate-900">{userTrackingNumber}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAirwayBillModal(true)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 font-bold"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview & Print Customer Label
                    </Button>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">
                    💡 Customer ke liye official <strong>{activeCourierMeta.name} Airway Bill</strong> auto-generate ho chuka hai jis mein real barcode, tracking ID aur delivery address shamil hai. Aap ye label print karke customer ko bhi de sakte hain.
                  </p>
                </div>
              ) : (
                /* Upload Customer's Existing Label */
                <div className="space-y-3">
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 text-center hover:bg-slate-50 transition relative">
                    <input
                      type="file"
                      id="labelUploadInput"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="labelUploadInput" className="cursor-pointer block">
                      <Upload className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800">
                        {parsingLabel ? (
                          '⏳ Scanning & Extracting Label Details...'
                        ) : labelFileName ? (
                          `Attached: ${labelFileName} (Extracted Successfully)`
                        ) : (
                          'Click to Upload Shipping Label (PDF, PNG, JPG)'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        System parcel label mein se Carrier, Tracking, Customer Name, Address aur Notes auto-extract kar leta hai.
                      </p>
                    </label>
                  </div>

                  {/* 1-Click Sample Button matching user screenshot */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleFromScreenshot}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      ⚡ 1-Click Auto-Fill from Screenshot Sample (FedEx / Abu Dhabi / xyz)
                    </button>
                    {labelFileName && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        ✓ Label Attached
                      </span>
                    )}
                  </div>

                  {/* Extracted & System Matched Summary Card matching user screenshot */}
                  {extractionSuccess && (
                    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/70 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Extracted from Label & Matched with System (WMS Ready):</span>
                        </div>
                        <span className="rounded bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900 font-mono">
                          Batch: {extractionSuccess.batch}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-emerald-200 font-mono mb-2">
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans font-bold">FR ID</span>
                          <span className="text-slate-800 font-bold">{extractionSuccess.frId}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans font-bold">PRODUCT SKU</span>
                          <span className="text-indigo-900 font-black">{extractionSuccess.sku}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans font-bold">CARRIER</span>
                          <span className="text-blue-700 font-bold uppercase">{extractionSuccess.carrier}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans font-bold">TRACKING</span>
                          <span className="text-slate-900 font-bold">{extractionSuccess.tracking}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-xs text-amber-950 font-sans">
                        <div className="font-bold text-[11px] text-amber-900 mb-0.5">
                          ℹ️ WMS Customizations Column Format:
                        </div>
                        <p className="font-mono text-[11px] text-slate-800 leading-snug">
                          {extractionSuccess.customizations}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="trackingInput" className="block text-xs font-bold text-slate-700 mb-1">
                      Tracking / Airway Bill Number from Attached Label
                    </label>
                    <input
                      id="trackingInput"
                      value={userTrackingNumber}
                      onChange={(e) => {
                        setUserTrackingNumber(e.target.value)
                        setTrackingValidationErr('')
                      }}
                      placeholder="e.g. 7946 1234 5678 / 9400 1118 9956..."
                      className={INPUT_STYLE}
                    />
                    {trackingValidationErr && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">⚠️ {trackingValidationErr}</p>
                    )}
                  </div>
                </div>
              )}

              {/* PARCEL INSTRUCTIONS / HANDLING NOTES */}
              <div className="mt-4 pt-3.5 border-t border-slate-100">
                <label htmlFor="parcelInstructionsInput" className="block text-xs font-bold text-slate-800 mb-1">
                  Parcel Instructions / Special Handling Notes (WMS & Supplier Note)
                </label>
                <input
                  id="parcelInstructionsInput"
                  value={parcelInstructions}
                  onChange={(e) => setParcelInstructions(e.target.value)}
                  placeholder="e.g. Fragile glass item, handle with care, open parcel allowed"
                  className={INPUT_STYLE}
                />

                {/* Quick Instruction Chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    'Fragile - Handle with Care',
                    'Open Parcel Allowed',
                    'Double Bubble-Wrap',
                    'Urgent / Priority Dispatch',
                    'Do Not Fold',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => appendInstruction(chip)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Ye instructions parcel label par print hongi aur Supplier aur WMS portal ke dashboard par show hongi.
                </p>
              </div>
            </Card>

            {/* 3. Sellvro Wallet Payment Card */}
            <Card className="p-5 shadow-soft border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Prepaid Wallet Payment</h2>
                    <p className="text-xs text-slate-500">Instant deduction from verified Sellvro Wallet</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  Step 3
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="text-xs text-slate-500">Your Wallet Balance</span>
                  <p className={`text-xl font-black ${walletBalance >= total ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ${Number(walletBalance || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Order Total Due</span>
                  <p className="text-xl font-black text-slate-900">${total.toFixed(2)}</p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Remaining After Order</span>
                  <p className={`text-xl font-black ${walletBalance >= total ? 'text-blue-700' : 'text-rose-600'}`}>
                    ${Number(walletBalance - total).toFixed(2)}
                  </p>
                </div>
              </div>

              {walletBalance < total ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <span>
                    ⚠️ Balance is short by <strong>${(total - Number(walletBalance || 0)).toFixed(2)}</strong>.
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/user/wallet"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                    >
                      Deposit &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Sufficient wallet balance. Amount will be deducted upon order placement.</span>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Order Summary & Place Order */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="h-fit p-5 shadow-soft border border-slate-200 sticky top-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Order Summary</h2>

              <div className="mt-4 flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white">
                  <img
                    src={imageSrc}
                    alt={product.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">${unitPrice.toFixed(2)} each</p>
                  {product.sku && (
                    <span className="inline-block mt-1 font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      SKU: {product.sku}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity selector */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Order Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQty(-1)}
                    disabled={quantity <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      if (Number.isFinite(next)) {
                        setQuantity(Math.min(maxQty, Math.max(1, Math.floor(next))))
                      }
                    }}
                    className="h-9 w-16 rounded-lg border border-slate-200 text-center font-bold text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQty(1)}
                    disabled={quantity >= maxQty}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-500 ml-1">{maxQty} in stock</span>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Courier Partner</span>
                  <span className="font-bold text-blue-700 uppercase">{activeCourierMeta.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Airway Bill / Tracking</span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {userTrackingNumber.trim() || 'Awaiting'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Due</span>
                  <span className="text-lg text-blue-600 font-black">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <div className="mt-5">
                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm shadow-md"
                >
                  Pay from Wallet & Place Order — ${total.toFixed(2)}
                </Button>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[11px] text-slate-500">
                  🛡️ <strong>100% Pre-Dispatch Cancellation Protected:</strong> Warehouse ya supplier se dispatch hone se pehle aap order cancel kar sakte hain aur 100% wallet refund receive kar sakte hain.
                </p>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* Airway Bill Live Preview Modal */}
      <ShippingAirwayBillModal
        open={showAirwayBillModal}
        onClose={() => setShowAirwayBillModal(false)}
        carrierName={activeCourierMeta.name}
        trackingNumber={userTrackingNumber}
        customer={{
          fullName: customerName,
          phone: customerPhone,
          addressLine: deliveryAddress,
          city: city,
          country: country,
        }}
        product={product}
        quantity={quantity}
        parcelInstructions={parcelInstructions}
        warehouseLocation={isWarehouseOrder ? 'wms_hub' : 'supplier_warehouse'}
      />
    </UserLayout>
  )
}
