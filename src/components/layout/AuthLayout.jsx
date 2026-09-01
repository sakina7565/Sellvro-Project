import Card from '../ui/Card.jsx'
import Logo from '../ui/Logo.jsx'
import PageFooter from './PageFooter.jsx'

/**
 * Centered card layout shared by the Login and Register pages: full
 * height beige background, white rounded card, logo and footer note.
 */
function AuthLayout({ children, cardClassName = 'max-w-md', footerLabel = 'DEVELOPED BY HAYVIRAL AI SAAS' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Card className={`w-full border border-slate-100 ${cardClassName} p-6 sm:p-8`}>
        <div className="mb-4 flex justify-center">
          <Logo size="md" />
        </div>
        {children}
      </Card>
      <PageFooter label={footerLabel} className="mt-6" />
    </div>
  )
}

export default AuthLayout
