import AdminTopbar from './AdminTopbar.jsx'

/**
 * Shell used by pre-dashboard onboarding flows (Supplier/User Business
 * Details -> Verification Pending): just the shared topbar above
 * centered page content, with no sidebar since the account isn't
 * approved yet.
 */
function OnboardingLayout({ children, topbarName = 'sakina' }) {
  return (
    <div className="min-h-screen bg-surface-bg">
      <AdminTopbar name={topbarName} showMenuButton={false} />
      <main className="px-4 py-8 md:px-8">{children}</main>
    </div>
  )
}

export default OnboardingLayout
