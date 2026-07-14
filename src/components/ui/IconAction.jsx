const TONE_CLASSES = {
  default: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
  primary: 'text-primary hover:bg-primary-50',
  info: 'text-sky-500 hover:bg-sky-50',
  warning: 'text-amber-500 hover:bg-amber-50',
  danger: 'text-rose-500 hover:bg-rose-50',
  success: 'text-emerald-500 hover:bg-emerald-50',
}

/**
 * Small icon-only button used for row actions in data tables
 * (edit, view, info, warn, delete, ...).
 */
function IconAction({ icon: Icon, tone = 'default', className = '', ...props }) {
  return (
    <button type="button" className={`rounded-md p-1.5 transition-colors ${TONE_CLASSES[tone]} ${className}`} {...props}>
      <Icon className="h-4 w-4" />
    </button>
  )
}

export default IconAction
