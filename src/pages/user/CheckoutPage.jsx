import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
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

  const [product, setProduct] = useState(location.state?.product || null)
  const [loadingProduct, setLoadingProduct] = useState(!location.state?.product)
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance ?? 0)
  const [quantity, setQuantity] = useState(Number(location.state?.quantity) || 1)
  const [address, setAddress] = useState({
    ...EMPTY_ADDRESS,
    fullName: user?.fullName || '',
  })
  // Mandatory Shipping & Packaging Label Details
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
    if (product?.id === productId) {
      setLoadingProduct(false)
      return undefined
    }
    let active = true
    setLoadingProduct(true)
    productApi
      .marketplace()
      .then((data) => {
        if (!active) return
        const found = (data.data || []).find((item) => item.id === productId)
        if (!found) {
          setError('Product not found or unavailable.')
          setProduct(null)
        } else {
          setProduct(found)
        }
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
  }, [productId, product?.id])

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

    // Validate Address fields
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

    if (!orderLabelRef.trim()) {
      setError('Shipping & Packaging Label Reference is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!brandLabel.trim()) {
      setError('Merchant / Brand Label name is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!shippingLabelFile) {
      setError('Please upload the External Shipping Label / Airway Bill file (PDF, PNG, or JPG).')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Check wallet balance
    if ((walletBalance || 0) < total) {
      setError(
        `Insufficient wallet balance. You need $${total.toFixed(2)}, but your wallet only has $${Number(walletBalance || 0).toFixed(2)}. Please deposit funds to proceed.`,
      )
      return
    }

    setSubmitting(true)
    try {
      const data = await orderApi.create(
        {
          productId: product.id,
          quantity,
          shippingAddress: address,
          orderLabelRef: orderLabelRef.trim(),
          brandLabel: brandLabel.trim(),
          labelNotes: labelNotes.trim(),
        },
        shippingLabelFile,
      )
      if (typeof data.walletBalance === 'number') {
        updateUser({ ...user, walletBalance: data.walletBalance })
      }
      navigate(`/user/orders/confirmation/${data.order.id}`, {
        replace: true,
        state: { order: data.order, message: data.message },
      })
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not place order.')
      setError(msg)
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
          <Button as={Link} to="/user/products" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to products
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
          <Link to="/user/products" className="font-semibold text-primary">
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
                  <FormLabel htmlFor="state" required>
                    State / Province
                  </FormLabel>
                  <input
                    id="state"
                    required
                    value={address.state}
                    onChange={(e) => setField('state', e.target.value)}
                    className={FIELD}
                    placeholder="State or province"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="postalCode" required>
                    Postal code
                  </FormLabel>
                  <input
                    id="postalCode"
                    required
                    value={address.postalCode}
                    onChange={(e) => setField('postalCode', e.target.value)}
                    className={FIELD}
                    placeholder="Postal code / ZIP"
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

            {/* Card 2: Mandatory Shipping & Packaging Label Specification */}
            <Card className="border border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-indigo-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">Shipping & Packaging Label Details</h2>
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Essential parcel label printed by warehouse/supplier for order dispatch & tracking.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  Step 2: Label Spec
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel htmlFor="orderLabelRef" required>
                    Order / Label Reference ID
                  </FormLabel>
                  <input
                    id="orderLabelRef"
                    required
                    value={orderLabelRef}
                    onChange={(e) => setOrderLabelRef(e.target.value)}
                    className={FIELD}
                    placeholder="e.g. LBL-8F29KD or Shopify Order #"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Unique order reference code printed on the box.</p>
                </div>

                <div>
                  <FormLabel htmlFor="brandLabel" required>
                    Store / Brand Name
                  </FormLabel>
                  <input
                    id="brandLabel"
                    required
                    value={brandLabel}
                    onChange={(e) => setBrandLabel(e.target.value)}
                    className={FIELD}
                    placeholder="e.g. My Brand Store"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Brand identity displayed to your end customer.</p>
                </div>

                <div className="sm:col-span-2">
                  <FormLabel htmlFor="labelNotes">
                    Handling & Packaging Instructions (Optional)
                  </FormLabel>
                  <input
                    id="labelNotes"
                    value={labelNotes}
                    onChange={(e) => setLabelNotes(e.target.value)}
                    className={FIELD}
                    placeholder="e.g. Fragile glass item, double bubble-wrap, do not crush"
                  />
                </div>

                <div className="sm:col-span-2">
                  <FormLabel htmlFor="shippingLabelFile" required>
                    External Printable Shipping Label / Airway Bill (File Upload)
                  </FormLabel>

                  {!shippingLabelFile ? (
                    <label
                      htmlFor="shippingLabelFile"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50/60"
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
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mb-2">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Click to upload Shipping Label / Airway Bill
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Supported: <strong className="text-slate-700">PDF, JPG, PNG</strong> (Max 25MB)
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs">
                        Browse File
                      </span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs uppercase">
                          {shippingLabelFile.name.endsWith('.pdf') ? 'PDF' : <FileCheck className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {shippingLabelFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(shippingLabelFile.size / 1024).toFixed(1)} KB • Ready for WMS Fulfillment
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShippingLabelFile(null)}
                        className="ml-3 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Change / Remove
                      </button>
                    </div>
                  )}

                  <p className="mt-2 text-[11px] text-slate-500">
                    Mandatory for WMS dispatch. Upload the shipping label file generated by your courier or marketplace.
                  </p>
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
                  <img src={imageSrc} alt={product.name} className="h-full w-full object-contain" />
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

              <p className="mt-3 text-xs text-slate-400">
                Payment is deducted from your wallet balance upon placing the order.
              </p>

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
                  <Link
                    to="/user/wallet"
                    className="mt-2 inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    Deposit Funds in Wallet &rarr;
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                className="mt-4"
                disabled={submitting || walletBalance < total}
              >
                {submitting
                  ? 'Placing Order & Attaching Label…'
                  : walletBalance < total
                    ? `Top-up Wallet to Place Order ($${total.toFixed(2)})`
                    : 'Place Order & Attach Label'}
              </Button>
            </Card>
          </div>
        </form>
      )}
    </UserLayout>
  )
}

export default UserCheckoutPage
