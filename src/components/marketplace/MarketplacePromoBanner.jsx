import { Link } from 'react-router-dom'
import { ShieldCheck, Truck, RefreshCw, ArrowRight } from 'lucide-react'

function MarketplacePromoBanner() {
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
      {/* Shopping Made Easy Bar (eBay style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-3.5 gap-3">
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700">
          <span className="font-bold text-slate-900 text-sm">Sourcing made easy</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Verified B2B Suppliers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-blue-600" />
            <span>Automated 3PL Warehouse Fulfillment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4 text-purple-600" />
            <span>Escrow Wallet & Dispute Protection</span>
          </div>
        </div>

        <Link
          to="/register"
          className="shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition w-fit"
        >
          Start now
        </Link>
      </div>

      {/* Colorful Mid-page Promo Banner (eBay style) */}
      <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 p-8 sm:p-10 text-white shadow-md">
        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 h-48 w-48 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md">
              Special B2B Opportunity
            </span>
            <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              There's a deal for your business, too
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-orange-100 max-w-lg">
              Don't miss a chance to stock high-demand inventory at direct wholesale rates.
              Verified suppliers, barcode scanning, and multi-country logistics ready for your store.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/user/products"
              className="rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-orange-900 shadow-md hover:bg-orange-50 transition"
            >
              Explore Wholesale Deals
            </Link>
            <Link
              to="/register?role=supplier"
              className="rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 transition"
            >
              Become a Supplier
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketplacePromoBanner
