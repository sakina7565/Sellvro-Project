import { Link } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'
import Button from '../ui/Button.jsx'

/**
 * Top navigation bar shown on the public landing page.
 */
function PublicHeader() {
  return (
    <header className="bg-surface-card">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Button as={Link} to="/register" size="sm">
            Get Started
          </Button>
        </nav>
      </div>
    </header>
  )
}

export default PublicHeader
