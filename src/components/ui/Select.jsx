import { ChevronDown } from 'lucide-react'

/**
 * Labeled select input with a leading icon and trailing chevron,
 * used for the "Register as" role picker.
 */
function Select({ label, icon: Icon, id, className = '', containerClassName = '', children, ...props }) {
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
        <select
          id={id}
          className={`h-11 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 transition-colors focus:border-primary-300 focus:bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-primary-100 ${
            Icon ? 'pl-10' : 'pl-3'
          } pr-9 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

export default Select
