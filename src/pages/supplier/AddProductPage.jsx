import { useState } from 'react'
import { Warehouse, Store } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import WmsInventoryProductForm from '../../components/products/WmsInventoryProductForm.jsx'
import AddProductForm from '../../components/products/AddProductForm.jsx'

function SupplierAddProductPage() {
  // 'wms' (default as requested) | 'direct' (self-fulfillment)
  const [activeChannel, setActiveChannel] = useState('wms')

  return (
    <SupplierLayout>
      <div className="mx-auto max-w-6xl">
        {/* ── Channel Switcher Bar ─────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Option 1: WMS Inventory (Default) */}
            <button
              type="button"
              onClick={() => setActiveChannel('wms')}
              className={`flex items-start gap-3.5 rounded-xl p-3.5 text-left transition-all cursor-pointer ${
                activeChannel === 'wms'
                  ? 'border-2 border-primary bg-primary-50/70 shadow-xs'
                  : 'border-2 border-transparent bg-slate-50 hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-2xs ${
                  activeChannel === 'wms'
                    ? 'bg-primary text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Warehouse className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Sell from WMS Inventory
                  </span>
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">
                    Default • Central Hub
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                  Select an existing WMS SKU from the warehouse API, inspect verified specs, and attach listing photos.
                </p>
              </div>
            </button>

            {/* Option 2: Supplier Direct */}
            <button
              type="button"
              onClick={() => setActiveChannel('direct')}
              className={`flex items-start gap-3.5 rounded-xl p-3.5 text-left transition-all cursor-pointer ${
                activeChannel === 'direct'
                  ? 'border-2 border-primary bg-primary-50/70 shadow-xs'
                  : 'border-2 border-transparent bg-slate-50 hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-2xs ${
                  activeChannel === 'direct'
                    ? 'bg-primary text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Sell Direct from My Facility
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    Marketplace Only
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                  Create a complete new product listing that you store, pack, and ship directly from your own shop.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Active Form Rendering ────────────────────────────────────────── */}
        {activeChannel === 'wms' ? (
          <WmsInventoryProductForm onSwitchToSelf={() => setActiveChannel('direct')} />
        ) : (
          <AddProductForm
            eyebrow="Supplier Panel • Direct Marketplace"
            panel="supplier"
            defaultFulfillBy="self"
            onSwitchToWms={() => setActiveChannel('wms')}
          />
        )}
      </div>
    </SupplierLayout>
  )
}

export default SupplierAddProductPage
