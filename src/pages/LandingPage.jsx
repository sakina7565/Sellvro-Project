import { Link } from 'react-router-dom'
import { CheckCircle2, Image as ImageIcon } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PageFooter from '../components/layout/PageFooter.jsx'
import Button from '../components/ui/Button.jsx'

const FEATURES = [
  'Multi-vendor Reseller Model',
  'Advanced Warehouse (3PL) System',
  'Integrated Wallet & Payments',
]

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-bg">
      <PublicHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-xl2 bg-surface-card shadow-card md:grid-cols-2">
          <div className="flex flex-col justify-center px-10 py-12">
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900">
              Welcome to <span className="text-primary">EZONE</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              A smart B2B Marketplace and Warehouse Management solution designed for modern
              business growth. Manage your orders, inventory, and supply chain in one place.
            </p>

            <ul className="mt-6 space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button as={Link} to="/register" className="mt-8 w-fit">
              Create Free Account
            </Button>
          </div>

          <div className="m-3 flex items-center justify-center rounded-xl2 bg-primary md:m-4">
            <div className="flex flex-col items-center gap-2 text-primary-100/80">
              <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
              <span className="text-xs font-medium">EZONE Visual</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8">
        <PageFooter label="POWERED BY TEAMHAYVIRAL" />
      </footer>
    </div>
  )
}

export default LandingPage
