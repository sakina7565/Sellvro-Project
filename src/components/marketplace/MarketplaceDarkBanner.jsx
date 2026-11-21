import { Link } from 'react-router-dom'
import { QrCode, Warehouse, Wallet, ArrowRight, ShieldCheck } from 'lucide-react'

function MarketplaceDarkBanner() {
  return (
    <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 sm:p-12 text-white shadow-xl border border-slate-800">
        {/* Glow Effects */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Text */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">
              <Warehouse className="h-3.5 w-3.5" />
              <span>3PL Warehouse & Fulfillment Network</span>
            </span>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Endless Inventory. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                Zero Warehouse Burden.
              </span>
            </h2>

            <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
              Store bulk products in Sellvro warehouses with full barcode tracking. When a reseller
              sells your product, our team picks, packs, and dispatches it immediately with automated
              tracking.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/register?role=supplier"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md hover:bg-slate-100 transition"
              >
                <span>Become a Verified Supplier</span>
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </Link>
              <Link
                to="/register?role=user"
                className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Join Reseller Network
              </Link>
            </div>
          </div>

          {/* Right Floating Cards Visuals */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Automated Barcode WMS</p>
                <p className="text-[11px] text-slate-400">
                  Every product unit scanned, mapped to warehouse bin & location.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Escrow Wallet Protection</p>
                <p className="text-[11px] text-slate-400">
                  Instant balance updates, secure payouts, and dispute-backed funds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Admin-Vetted Accounts</p>
                <p className="text-[11px] text-slate-400">
                  Zero unauthorized sellers. All supplier profiles verified by administration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketplaceDarkBanner
