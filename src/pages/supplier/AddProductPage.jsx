import { useState } from 'react'
import { Warehouse, Store, AlertTriangle, ShieldCheck } from 'lucide-react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import WmsInventoryProductForm from '../../components/products/WmsInventoryProductForm.jsx'
import AddProductForm from '../../components/products/AddProductForm.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function SupplierAddProductPage() {
  const { user } = useAuth()
  const isWmsRegistered = Boolean(user?.isWmsRegistered)

  // If WMS registered: default to 'wms'. If not registered on WMS: 'direct' only.
  const [activeChannel, setActiveChannel] = useState(isWmsRegistered ? 'wms' : 'direct')

  return (
    <SupplierLayout>
      <div className="mx-auto max-w-6xl">
        {isWmsRegistered ? (
          /* ── Channel Switcher Bar (Shown ONLY to WMS-Registered Suppliers) ── */
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
            <div className="mb-2 px-3 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  WMS Connected Account: {user?.wmsClientId || user?.fullName || 'Verified'}
                </span>
              </span>
              <span className="text-slate-500">
                Select your preferred selling channel below
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Option 1: WMS Inventory */}
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
                      WMS Connected
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                    Select an existing WMS SKU from your warehouse stock, load live verified specs, customize retail price, and publish.
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
        ) : (
          /* ── Informational Notice for Non-WMS Suppliers ── */
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-2xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-950">
                Direct Seller Fulfillment Mode (Non-WMS Account)
              </p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Your account is not registered on the Sellvro WMS Warehouse system. As a direct marketplace supplier, you can create new product listings to store, pack, and fulfill directly from your own store. WMS SKU selection is disabled because your stock is not in the central warehouse.
              </p>
            </div>
          </div>
        )}

        {/* ── Active Form Rendering ────────────────────────────────────────── */}
        {isWmsRegistered && activeChannel === 'wms' ? (
          <WmsInventoryProductForm onSwitchToSelf={() => setActiveChannel('direct')} />
        ) : (
          <AddProductForm
            eyebrow="Supplier Panel • Direct Marketplace"
            panel="supplier"
            defaultFulfillBy="self"
            allowWms={isWmsRegistered}
            onSwitchToWms={isWmsRegistered ? () => setActiveChannel('wms') : undefined}
          />
        )}
      </div>
    </SupplierLayout>
  )
}

export default SupplierAddProductPage
