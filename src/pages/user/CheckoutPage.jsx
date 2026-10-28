import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileCheck,
  FileText,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Printer,
  ShieldCheck,
  Tag,
  UploadCloud,
  Warehouse,
  Wallet,
  X,
} from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FormLabel from '../../components/products/FormLabel.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { mediaUrl, orderApi, productApi, walletApi, getErrorMessage } from '../../lib/api.js'

const FIELD =
  'h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

function UserCheckoutPage() {
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

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
  const [address, setAddress] = useState({
    fullName: user?.fullName || 'Client Buyer',
    phone: user?.phone || '03001234567',
    addressLine: user?.address || 'House 14, Commercial Lane, Street 3',
    city: user?.city || 'Lahore',
    state: user?.state || 'Punjab',
    postalCode: user?.postalCode || '54000',
    country: user?.country || 'Pakistan',
  })
  // Packaging Label Details
  const [orderLabelRef, setOrderLabelRef] = useState(
    () => `LBL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  )
  const [brandLabel, setBrandLabel] = useState(
    () => user?.businessName || user?.storeName || (user?.fullName ? `${user.fullName}'s Store` : 'Sellvro Merchant'),
  )
  const [labelNotes, setLabelNotes] = useState('Standard Packaging - Handle with Care')
  const [shippingLabelFile, setShippingLabelFile] = useState(null)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creditingWallet, setCreditingWallet] = useState(false)

  const handleQuickTopup = async () => {
    setCreditingWallet(true)
    setError('')
    try {
      const needed = Math.max(500, Math.ceil(total - walletBalance + 50))
      const res = await walletApi.quickCredit(needed)
      const newBal = res.walletBalance ?? res.balance ?? (walletBalance + needed)
      setWalletBalance(newBal)
      if (user) {
        updateUser({ ...user, walletBalance: newBal })
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to credit test balance.'))
    } finally {
      setCreditingWallet(false)
    }
  }

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

  useEffect(() => {
    if (product && (product.id === productId || product._id === productId)) {
      setLoadingProduct(false)
      return undefined
    }
    let active = true
    setLoadingProduct(true)

    // 1. First attempt direct lookup by single product endpoint
    productApi
      .get(productId)
      .then((res) => {
        if (!active) return
        const prod = res.product || res.data || res
        if (prod && (prod.id || prod._id)) {
          setProduct({
            ...prod,
            id: prod.id || prod._id,
          })
          setError('')
        } else {
          throw new Error('Not found')
        }
      })
      .catch(() => {
        // 2. Fallback to marketplace list
        return productApi.marketplace().then((data) => {
          if (!active) return
          const found = (data.data || []).find(
            (item) => String(item.id) === String(productId) || String(item._id) === String(productId),
          )
          if (!found) {
            setError('Product not found or unavailable.')
            setProduct(null)
          } else {
            setProduct({ ...found, id: found.id || found._id })
            setError('')
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

  const setField = (key, value) => {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  const adjustQty = (delta) => {
    setQuantity((prev) => Math.min(maxQty, Math.max(1, prev + delta)))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!product) return
    setError('')

    // Verify token & authentication status before allowing order placement
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
    if (!token || !user) {
      navigate('/login', {
        state: {
          from: location.pathname,
          message: 'Please sign in to your client account before placing an order.',
        },
      })
      return
    }

    // Validate Essential Address fields
    if (!address.fullName?.trim()) {
      setError('Recipient full name is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!address.phone?.trim()) {
      setError('Recipient phone number is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!address.addressLine?.trim()) {
      setError('Recipient address line is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!address.city?.trim()) {
      setError('Recipient city is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!address.country?.trim()) {
      setError('Recipient country is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const cleanAddress = {
      fullName: address.fullName.trim(),
      phone: address.phone.trim(),
      addressLine: address.addressLine.trim(),
      city: address.city.trim(),
      country: address.country.trim(),
      state: address.state?.trim() || address.city.trim(),
      postalCode: address.postalCode?.trim() || '00000',
    }

    // Auto-generate reference and brand label if empty
    const finalOrderLabelRef =
      orderLabelRef?.trim() || `LBL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const finalBrandLabel =
      brandLabel?.trim() || user?.businessName || user?.storeName || user?.fullName || 'Sellvro Customer'

    // Check wallet balance
    if ((walletBalance || 0) < total) {
      setError(
        `Insufficient wallet balance. Total due is $${total.toFixed(2)}, but your Sellvro Wallet currently has $${Number(walletBalance || 0).toFixed(2)}. Please deposit funds to proceed.`,
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const actualProductId = product?.id || product?._id || productId

    setSubmitting(true)
    try {
      const data = await orderApi.create(
        {
          productId: actualProductId,
          quantity,
          shippingAddress: cleanAddress,
          orderLabelRef: finalOrderLabelRef,
          brandLabel: finalBrandLabel,
          labelNotes: labelNotes.trim(),
        },
        shippingLabelFile,
      )
      if (typeof data.walletBalance === 'number') {
        updateUser({ ...user, walletBalance: data.walletBalance })
      }
      const confirmedId = data.order?.id || data.order?._id || data.orderNo || 'confirmed'
      navigate(`/user/orders/confirmation/${confirmedId}`, {
        replace: true,
        state: { order: data.order, message: data.message },
      })
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not place order.')
      setError(msg)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UserLayout>
      <PageHeader
        eyebrow="User Panel"
        title="Checkout"
        action={
          <Button as={Link} to="/" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {loadingProduct ? (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">Loading product…</Card>
      ) : !product ? (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">
          Product unavailable.{' '}
          <Link to="/" className="font-semibold text-primary">
            Return to shop
          </Link>
        </Card>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            {/* Card 1: Destination Address */}
            <Card className="p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Destination Shipping Address</h2>
                    <p className="text-xs text-slate-500">Where this customer order should be delivered</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Step 1: Recipient
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel htmlFor="fullName" required>
                    Full name
                  </FormLabel>
                  <input
                    id="fullName"
                    required
                    value={address.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    className={FIELD}
                    placeholder="Recipient's full name"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="phone" required>
                    Phone
                  </FormLabel>
                  <input
                    id="phone"
                    required
                    value={address.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    className={FIELD}
                    placeholder="Recipient phone number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormLabel htmlFor="addressLine" required>
                    Address line
                  </FormLabel>
                  <input
                    id="addressLine"
                    required
                    value={address.addressLine}
                    onChange={(e) => setField('addressLine', e.target.value)}
                    className={FIELD}
                    placeholder="Street address, house/flat #, landmark"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="city" required>
                    City
                  </FormLabel>
                  <input
                    id="city"
                    required
                    value={address.city}
                    onChange={(e) => setField('city', e.target.value)}
                    className={FIELD}
                    placeholder="City"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="state">State / Province (Optional)</FormLabel>
                  <input
                    id="state"
                    value={address.state}
                    onChange={(e) => setField('state', e.target.value)}
                    className={FIELD}
                    placeholder="State or province (Optional)"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="postalCode">Postal code / ZIP (Optional)</FormLabel>
                  <input
                    id="postalCode"
                    value={address.postalCode}
                    onChange={(e) => setField('postalCode', e.target.value)}
                    className={FIELD}
                    placeholder="Postal code / ZIP (Optional)"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="country" required>
                    Country
                  </FormLabel>
                  <input
                    id="country"
                    required
                    value={address.country}
                    onChange={(e) => setField('country', e.target.value)}
                    className={FIELD}
                    placeholder="Country"
                  />
                </div>
              </div>
            </Card>

            {/* Card 2: Payment Method: Sellvro Prepaid Wallet */}
            <Card className="border border-emerald-200 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Payment: Sellvro Prepaid Wallet</h2>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Prepaid Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Aapka payment pehle se wallet mein mojood hai. Is order ki raqam direct aapke Sellvro Wallet se deduct hogi.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Step 2: Payment
                </span>
              </div>

              {/* Wallet Live Deduction Breakdown */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Your Available Wallet Balance
                    </span>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      ${Number(walletBalance || 0).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-emerald-700 font-medium">Verified Prepaid Balance</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Order Deduction
                    </span>
                    <p className="mt-1 text-lg font-black text-rose-600">
                      -${total.toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{quantity}x item(s) + fulfillment</p>
                  </div>

                  <div
                    className={`rounded-lg border p-3 shadow-2xs ${
                      walletBalance >= total
                        ? 'border-emerald-200 bg-white'
                        : 'border-rose-300 bg-rose-50/50'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Remaining After Order
                    </span>
                    <p
                      className={`mt-1 text-lg font-black ${
                        walletBalance >= total ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      ${Number(walletBalance - total).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {walletBalance >= total ? 'Sufficient balance' : 'Insufficient funds'}
                    </p>
                  </div>
                </div>

                {walletBalance < total ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <p>
                        Aapke wallet mein <strong>${Number(walletBalance || 0).toFixed(2)}</strong> hain aur order total <strong>${total.toFixed(2)}</strong> hai. Mazeed <strong>${(total - Number(walletBalance || 0)).toFixed(2)}</strong> deposit karein.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleQuickTopup}
                        disabled={creditingWallet}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        {creditingWallet ? 'Adding…' : '⚡ 1-Click Top-Up ($500)'}
                      </button>
                      <Link
                        to="/user/wallet"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 underline text-xs"
                      >
                        Wallet &rarr;
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Aapka wallet balance verified hai. Order place karte hi payment foran deduct ho jayegi.</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Card 3: Custom Dispatch Label & Notes (Optional) */}
            <Card className="border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-indigo-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">Custom Dispatch Label & Notes</h2>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Optional / Auto-Generated
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Standard dispatch label auto-generate ho jata hai. Agar aap apna store name ya external airway bill attach karna chahein to yahan add kar sakte hain.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  Step 3: Label (Optional)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel htmlFor="orderLabelRef">Order / Label Reference ID (Optional)</FormLabel>
                  <input
                    id="orderLabelRef"
                    value={orderLabelRef}
                    onChange={(e) => setOrderLabelRef(e.target.value)}
                    className={FIELD}
                    placeholder="e.g. LBL-8F29KD or Shopify Order #"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Order reference code printed on the box.</p>
                </div>

                <div>
                  <FormLabel htmlFor="brandLabel">Store / Brand Name (Optional)</FormLabel>
                  <input
                    id="brandLabel"
                    value={brandLabel}
                    onChange={(e) => setBrandLabel(e.target.value)}
                    className={FIELD}
                    placeholder="e.g. My Brand Store"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Brand identity displayed to your end customer.</p>
                </div>

                <div className="sm:col-span-2">
                  <FormLabel htmlFor="labelNotes">Handling & Packaging Instructions (Optional)</FormLabel>
                  <input
                    id="labelNotes"
                    value={labelNotes}
                    onChange={(e) => setLabelNotes(e.target.value)}
                    className={FIELD}
                    placeholder="e.g. Fragile glass item, double bubble-wrap, do not crush"
                  />
                </div>

                <div className="sm:col-span-2">
                  <FormLabel htmlFor="shippingLabelFile">
                    Attach External Airway Bill / Shipping Label (Optional)
                  </FormLabel>

                  {!shippingLabelFile ? (
                    <label
                      htmlFor="shippingLabelFile"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50/40"
                    >
                      <input
                        id="shippingLabelFile"
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setShippingLabelFile(file)
                        }}
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-1.5">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        Click to attach external Airway Bill / Courier Label (Optional)
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">PDF, JPG, PNG (Max 25MB)</p>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs uppercase">
                          {shippingLabelFile.name.endsWith('.pdf') ? 'PDF' : <FileCheck className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {shippingLabelFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(shippingLabelFile.size / 1024).toFixed(1)} KB • Attached
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShippingLabelFile(null)}
                        className="ml-3 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Card 3: Live Thermal Shipping Label Preview */}
            <Card className="overflow-hidden border border-slate-300 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Thermal Shipping Label Preview
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-500">STANDARD 4x6 INCH</span>
              </div>

              {/* Thermal Label Mock Box */}
              <div className="rounded-lg border-2 border-dashed border-slate-800 bg-slate-50/50 p-4 font-mono text-slate-900">
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">SELLVRO EXPRESS</h3>
                    <p className="text-[10px] text-slate-600">PRIORITY DOMESTIC / AIR DROPSHIP</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-indigo-700">
                      {product.inWarehouse || product.fulfillBy === 'warehouse' ? '🏢 WMS HUB' : '🏭 SUPPLIER'}
                    </p>
                    <p className="text-[10px] text-slate-500">REF: {orderLabelRef || 'PENDING'}</p>
                  </div>
                </div>

                {/* Custody Route */}
                <div className="grid grid-cols-2 gap-3 border-b-2 border-slate-800 py-2.5 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Origin Custody (Warehouse):
                    </p>
                    <p className="font-bold text-slate-900">
                      {product.inWarehouse || product.fulfillBy === 'warehouse'
                        ? 'Sellvro WMS Central Hub'
                        : 'Verified Supplier Facility'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      User: {user?.clientId || ('USR-' + (user?.id || user?._id || '').slice(-6).toUpperCase())}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Deliver To (Destination):
                    </p>
                    <p className="font-bold text-slate-900">{address.fullName || '[Recipient Name]'}</p>
                    <p className="text-[11px] text-slate-700">{address.addressLine || '[Address Line]'}</p>
                    <p className="text-[11px] text-slate-700">
                      {address.city || '[City]'}, {address.state || '[State]'} {address.postalCode || '[Zip]'}
                    </p>
                    <p className="text-[10px] text-slate-500">{address.country || '[Country]'} · Ph: {address.phone || '—'}</p>
                  </div>
                </div>

                {/* SKU & Item Spec */}
                <div className="py-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Product SKU</p>
                      <p className="font-black text-indigo-800">{product.sku || 'SKU-PENDING'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Quantity</p>
                      <p className="font-bold">{quantity} Unit(s)</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Brand / Merchant</p>
                      <p className="font-bold truncate">{brandLabel || 'Merchant Store'}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 truncate text-[11px] font-semibold text-slate-800">
                    Item: {product.name}
                  </p>
                  {labelNotes && (
                    <p className="mt-1 text-[10px] italic text-slate-600">Note: {labelNotes}</p>
                  )}
                </div>

                {/* Simulated Barcode */}
                <div className="border-t-2 border-slate-800 pt-2 text-center">
                  <div className="flex h-9 items-center justify-center gap-[2px] bg-white px-2 py-1">
                    <span className="h-full w-1 bg-black"></span>
                    <span className="h-full w-0.5 bg-black"></span>
                    <span className="h-full w-1.5 bg-black"></span>
                    <span className="h-full w-0.5 bg-black"></span>
                    <span className="h-full w-1 bg-black"></span>
                    <span className="h-full w-2 bg-black"></span>
                    <span className="h-full w-0.5 bg-black"></span>
                    <span className="h-full w-1 bg-black"></span>
                    <span className="h-full w-0.5 bg-black"></span>
                    <span className="h-full w-1.5 bg-black"></span>
                    <span className="h-full w-1 bg-black"></span>
                    <span className="h-full w-2 bg-black"></span>
                    <span className="h-full w-0.5 bg-black"></span>
                    <span className="h-full w-1.5 bg-black"></span>
                    <span className="h-full w-0.5 bg-black"></span>
                    <span className="h-full w-1 bg-black"></span>
                  </div>
                  <p className="mt-1 text-[9px] tracking-widest text-slate-600">
                    *{orderLabelRef || 'SLV-SAMPLE'}*
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Order Summary & Warehouse Custody Status */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="h-fit p-5 shadow-soft">
              <h2 className="text-base font-semibold text-slate-900">Order Summary</h2>

              <div className="mt-4 flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-white">
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                    {(product.inWarehouse || product.fulfillBy === 'warehouse') ? (
                      <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-amber-400">
                        WMS
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                        Supplier Direct
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">${unitPrice.toFixed(2)} each</p>
                  {product.sku ? (
                    <p className="text-xs font-mono font-semibold text-indigo-700">SKU: {product.sku}</p>
                  ) : null}
                </div>
              </div>

              {/* Warehouse Custody Status Box */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2">
                  {product.inWarehouse || product.fulfillBy === 'warehouse' ? (
                    <Warehouse className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Building2 className="h-4 w-4 text-blue-600" />
                  )}
                  <p className="text-xs font-bold text-slate-800">
                    {product.inWarehouse || product.fulfillBy === 'warehouse'
                      ? 'Stock Custody: WMS Central Hub'
                      : 'Stock Custody: Supplier Warehouse'}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {product.inWarehouse || product.fulfillBy === 'warehouse'
                    ? 'Physical stock is stored in the Central WMS Hub. Automated labeling & priority dispatch will execute immediately.'
                    : 'Physical stock is with the verified Supplier. Order & shipping label will be routed directly to the supplier.'}
                </p>
              </div>

              <div className="mt-4">
                <FormLabel>Quantity</FormLabel>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQty(-1)}
                    disabled={quantity <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
                      if (!Number.isFinite(next)) return
                      setQuantity(Math.min(maxQty, Math.max(1, Math.floor(next))))
                    }}
                    className="h-10 w-16 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm font-medium text-slate-800 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQty(1)}
                    disabled={quantity >= maxQty}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-400">{maxQty} in stock</span>
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Wallet balance</span>
                  <span>${Number(walletBalance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900">
                  <span>Total due</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-900">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Prepaid Order Payment
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  Total due will be deducted directly from your verified Sellvro Wallet.
                </p>
              </div>

              {/* Error display directly above submit button */}
              {error && (
                <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  ⚠️ {error}
                </div>
              )}

              {/* Insufficient wallet balance alert with direct top-up link */}
              {walletBalance < total && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-bold text-amber-900">⚠️ Insufficient Wallet Balance</p>
                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                    Total due is <strong>${total.toFixed(2)}</strong>, but your wallet has <strong>${Number(walletBalance || 0).toFixed(2)}</strong>. You are short by <strong>${(total - Number(walletBalance || 0)).toFixed(2)}</strong>.
                  </p>
                </div>
              )}

              {walletBalance < total ? (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleQuickTopup}
                    disabled={creditingWallet}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-500 active:scale-[0.99] transition disabled:opacity-50"
                  >
                    <span>{creditingWallet ? 'Adding Balance…' : '⚡ Top-Up Wallet ($500 Credit)'}</span>
                  </button>
                  <Button
                    as={Link}
                    to="/user/wallet"
                    variant="outline"
                    fullWidth
                    size="sm"
                  >
                    Go to Wallet Deposit Page &rarr;
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  className="mt-4"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Processing Prepaid Order…'
                    : `Pay from Wallet & Place Order ($${total.toFixed(2)})`}
                </Button>
              )}
            </Card>
          </div>
        </form>
      )}
    </UserLayout>
  )
}

export default UserCheckoutPage
