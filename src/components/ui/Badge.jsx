const TONE_CLASSES = {
  pending: 'bg-primary-50 text-primary',
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-rose-50 text-rose-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-500',
  solid: 'bg-primary text-white',
}

/**
 * Small status pill, e.g. the "Pending" badge shown in data tables.
 */
function Badge({ tone = 'pending', icon: Icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}

export default Badge
