import { Link } from 'react-router-dom'
import { Globe, ChevronDown } from 'lucide-react'

function MarketplaceFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white text-xs text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
          {/* Column 1: Buy */}
          <div>
            <h4 className="font-bold text-slate-900">Buy</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/register" className="hover:text-blue-600 hover:underline">
                  Registration
                </Link>
              </li>
              <li>
                <Link to="/user/products" className="hover:text-blue-600 hover:underline">
                  B2B Bulk Sourcing
                </Link>
              </li>
              <li>
                <Link to="/user/products" className="hover:text-blue-600 hover:underline">
                  Verified Stores
                </Link>
              </li>
              <li>
                <Link to="/user/products" className="hover:text-blue-600 hover:underline">
                  3PL In-Stock Inventory
                </Link>
              </li>
              <li>
                <Link to="/user/disputes" className="hover:text-blue-600 hover:underline">
                  Buyer Protection Guarantee
                </Link>
              </li>
              <li>
                <Link to="/user/products" className="hover:text-blue-600 hover:underline">
                  Wholesale Clearance Lots
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Sell */}
          <div>
            <h4 className="font-bold text-slate-900">Sell</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/register?role=supplier" className="hover:text-blue-600 hover:underline">
                  Start Selling as Supplier
                </Link>
              </li>
              <li>
                <Link to="/register?role=user" className="hover:text-blue-600 hover:underline">
                  Become a Reseller
                </Link>
              </li>
              <li>
                <Link to="/register?role=supplier" className="hover:text-blue-600 hover:underline">
                  3PL Warehouse Storage
                </Link>
              </li>
              <li>
                <Link to="/register?role=supplier" className="hover:text-blue-600 hover:underline">
                  Barcode Labeling & Dispatch
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 hover:underline">
                  Supplier Portal Access
                </Link>
              </li>
              <li>
                <Link to="/user/disputes" className="hover:text-blue-600 hover:underline">
                  Escrow Payout Policies
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Sellvro Ecosystem */}
          <div>
            <h4 className="font-bold text-slate-900">Sellvro Ecosystem</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-slate-500">Global Hubs</span>
              </li>
              <li>
                <span className="text-slate-500">Multi-Warehouse Network</span>
              </li>
              <li>
                <span className="text-slate-500">Automated WMS Logistics</span>
              </li>
              <li>
                <span className="text-slate-500">Escrow Wallet Services</span>
              </li>
            </ul>

            <h4 className="mt-6 font-bold text-slate-900">Stay Connected</h4>
            <ul className="mt-2 space-y-2">
              <li>
                <a href="#facebook" className="hover:text-blue-600 hover:underline">
                  Facebook
                </a>
              </li>
              <li>
                <a href="#twitter" className="hover:text-blue-600 hover:underline">
                  X (Twitter)
                </a>
              </li>
              <li>
                <a href="#linkedin" className="hover:text-blue-600 hover:underline">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: About Sellvro */}
          <div>
            <h4 className="font-bold text-slate-900">About Sellvro</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-slate-500">Company Info</span>
              </li>
              <li>
                <span className="text-slate-500">News & Announcements</span>
              </li>
              <li>
                <span className="text-slate-500">Supplier Quality Standards</span>
              </li>
              <li>
                <span className="text-slate-500">Policies & Terms</span>
              </li>
              <li>
                <span className="text-slate-500">Security & Privacy</span>
              </li>
              <li>
                <span className="text-slate-500">Product Safety Guidelines</span>
              </li>
            </ul>
          </div>

          {/* Column 5: Help & Contact */}
          <div>
            <h4 className="font-bold text-slate-900">Help & Contact</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/user/disputes" className="hover:text-blue-600 hover:underline">
                  Resolution Center
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 hover:underline">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/user/disputes" className="hover:text-blue-600 hover:underline">
                  Sellvro Money Back Guarantee
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 hover:underline">
                  Admin Verification Status
                </Link>
              </li>
            </ul>

            <div className="mt-6">
              <h4 className="font-bold text-slate-900">Sellvro Sites</h4>
              <button
                type="button"
                className="mt-2 flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-400"
              >
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <span>United States (USD)</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Legal Notice */}
        <div className="mt-12 border-t border-slate-200 pt-6 text-[11px] text-slate-500">
          <p>
            Copyright © 2026 Sellvro Inc. All Rights Reserved. Powered by TeamHayviral.
            Accessibility, User Agreement, Privacy, Payments Terms of Use, Cookies and AdChoice.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default MarketplaceFooter
