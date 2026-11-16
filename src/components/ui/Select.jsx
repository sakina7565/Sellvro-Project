import { ChevronDown, AlertCircle } from 'lucide-react'

/**
 * Labeled select input with a leading icon and trailing chevron.
 * Supports both children (<option>) and options array [{ label, value }].
 * Supports error prop with red border and inline error message.
 */
function Select({
  label,
  icon: Icon,
  id,
  className = '',
  containerClassName = '',
  children,
  options,
  error,
  helperText,
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={`mb-1.5 block text-sm font-medium ${error ? 'text-rose-700' : 'text-slate-700'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${error ? 'text-rose-400' : 'text-slate-400'}`} />
        )}
        <select
          id={id}
          className={`h-11 w-full appearance-none rounded-lg border text-sm text-slate-800 transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-400 bg-rose-50/40 text-rose-950 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-200 bg-slate-50 focus:border-primary-300 focus:bg-primary-50/40 focus:ring-primary-100'
          } ${Icon ? 'pl-10' : 'pl-3'} pr-9 ${className}`}
          {...props}
        >
          {Array.isArray(options) && options.length > 0
            ? options.map((opt, idx) => {
                const isObj = opt && typeof opt === 'object'
                const val = isObj ? (opt.value !== undefined ? opt.value : opt.label) : opt
                const lbl = isObj ? (opt.label !== undefined ? opt.label : opt.value) : opt
                return (
                  <option key={idx} value={val} disabled={opt?.disabled}>
                    {lbl}
                  </option>
                )
              })
            : children}
        </select>
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${error ? 'text-rose-400' : 'text-slate-400'}`} />
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-fadeIn">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  )
}

export default Select
