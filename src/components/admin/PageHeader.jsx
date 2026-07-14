/**
 * Shared page heading used on every admin/supplier screen: small
 * eyebrow label (defaults to "Admin Panel", pass `eyebrow="Supplier
 * Panel"` etc for other panels), bold title, and an optional
 * right-aligned action (button, filter, etc).
 */
function PageHeader({ title, eyebrow = 'Admin Panel', action, className = '' }) {
  return (
    <div className={`mb-5 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      </div>
      {action}
    </div>
  )
}

export default PageHeader
