import { ShoppingCart } from 'lucide-react'
import Logo from '../ui/Logo.jsx'

/**
 * Product card used on the User Panel "Buy Products" grid: brand
 * badge, product image, Add to Cart button, name and price.
 */
function BuyProductCard({ product }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-surface-card">
      <div className="relative bg-white p-4 pt-5">
        <div className="absolute left-3 top-3 z-10 flex h-6 items-center rounded-full bg-slate-900 px-2.5">
          <Logo size="sm" className="!h-3.5 brightness-0 invert" />
        </div>
        <div className="flex aspect-square items-center justify-center">
          <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </button>
        <p className="mt-3 text-center text-sm text-slate-500">{product.name}</p>
        <p className="mt-1 text-center text-base font-bold text-slate-900">${product.price.toFixed(2)}</p>
      </div>
    </article>
  )
}

export default BuyProductCard
