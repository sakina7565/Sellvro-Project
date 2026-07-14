/**
 * Labeled text input with a leading icon, shared by the login and
 * register forms. Pass any lucide-react icon component via `icon`.
 */
function Input({ label, icon: Icon, id, className = '', containerClassName = '', ...props }) {
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <input
          id={id}
          className={`h-11 w-full rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-primary-100 ${
            Icon ? 'pl-10 pr-3' : 'px-3'
          } ${className}`}
          {...props}
        />
      </div>
    </div>
  )
}

export default Input
