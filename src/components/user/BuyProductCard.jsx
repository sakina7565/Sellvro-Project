import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { mediaUrl } from '../../lib/api.js'

/**
 * Product card on User Panel "Buy Products" grid.
 * Buy now navigates to checkout (address + qty) instead of placing immediately.
 */
function BuyProductCard({ product }) {
  const navigate = useNavigate()
  const isActive = product.status === 'active' || !product.status

  const imageSrc =
    mediaUrl(product.image) ||
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'

  const handleBuy = () => {
    navigate(`/user/checkout/${product.id}`, { state: { product } })
  }

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-surface-card">
      <div className="relative bg-white p-4 pt-5">
        <div className="absolute left-3 top-3 z-10 flex h-6 items-center rounded-full bg-slate-900 px-2.5">
          <Logo size="sm" className="!h-3.5 brightness-0 invert" />
        </div>
        <div className="flex aspect-square items-center justify-center">
          <img src={imageSrc} alt={product.name} className="h-full w-full object-contain" />
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
        <button
          type="button"
          disabled={!isActive}
          onClick={handleBuy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <ShoppingCart className="h-4 w-4" />
          {isActive ? 'Buy now' : 'Unavailable'}
        </button>
        <p className="mt-3 text-center text-sm text-slate-500">{product.name}</p>
        <p className="mt-1 text-center text-base font-bold text-slate-900">
          ${Number(product.price || 0).toFixed(2)}
        </p>
      </div>
    </article>
  )
}

export default BuyProductCard
