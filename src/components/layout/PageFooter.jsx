/**
 * Small centered footer text. Used as "POWERED BY TEAMHAYVIRAL" on the
 * landing page and "DEVELOPED BY HAYVIRAL AI SAAS" on auth screens.
 */
function PageFooter({ label, className = '' }) {
  return (
    <p className={`text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${className}`}>
      {label}
    </p>
  )
}

export default PageFooter
