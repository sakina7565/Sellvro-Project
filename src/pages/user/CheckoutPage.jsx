import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Minus, Plus } from 'lucide-react'
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
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState({
    ...EMPTY_ADDRESS,
    fullName: user?.fullName || '',
  })
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
    setSubmitting(true)
    try {
      const data = await orderApi.create({
        productId: product.id,
        quantity,
        shippingAddress: address,
      })
      if (typeof data.walletBalance === 'number') {
        updateUser({ ...user, walletBalance: data.walletBalance })
      }
      navigate(`/user/orders/confirmation/${data.order.id}`, {
        replace: true,
        state: { order: data.order, message: data.message },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not place order.'))
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <Card className="p-5 shadow-soft lg:col-span-3">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Shipping address</h2>
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
                  placeholder="Full name"
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
                  placeholder="Phone number"
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
                  placeholder="Street address, apartment, suite"
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
                  placeholder="Postal code"
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

          <Card className="h-fit p-5 shadow-soft lg:col-span-2">
            <h2 className="text-base font-semibold text-slate-900">Order summary</h2>

            <div className="mt-4 flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-white">
                <img src={imageSrc} alt={product.name} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">${unitPrice.toFixed(2)} each</p>
                {product.sku ? <p className="text-xs text-slate-400">SKU: {product.sku}</p> : null}
              </div>
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
              Payment is deducted from your wallet balance when you place the order.
            </p>

            <Button type="submit" fullWidth className="mt-5" disabled={submitting}>
              {submitting ? 'Placing order…' : 'Place order'}
            </Button>
          </Card>
        </form>
      )}
    </UserLayout>
  )
}

export default UserCheckoutPage
