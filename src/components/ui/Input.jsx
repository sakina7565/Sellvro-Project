import { AlertCircle } from 'lucide-react'

/**
 * Labeled text input with a leading icon, shared across the entire app.
 * Automatically disallows negative numbers when type is "number" unless allowNegative is explicitly true.
 * Supports error prop with red highlight and inline error message.
 */
function Input({
  label,
  icon: Icon,
  id,
  type = 'text',
  min,
  allowNegative = false,
  className = '',
  containerClassName = '',
  error,
  helperText,
  onKeyDown,
  onChange,
  onPaste,
  ...props
}) {
  const isNumeric = type === 'number'
  const blockNegative = isNumeric && !allowNegative

  const handleKeyDown = (e) => {
    if (blockNegative && (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault()
    }
    if (onKeyDown) onKeyDown(e)
  }

  const handleChange = (e) => {
    if (blockNegative) {
      let val = e.target.value
      if (val.includes('-')) {
        val = val.replace(/-/g, '')
        e.target.value = val
      }
      if (Number(val) < 0) {
        return
      }
    }
    if (onChange) onChange(e)
  }

  const handlePaste = (e) => {
    if (blockNegative) {
      const text = e.clipboardData?.getData('text') || ''
      if (text.includes('-') || (!Number.isNaN(Number(text)) && Number(text) < 0)) {
        e.preventDefault()
        const clean = text.replace(/-/g, '')
        document.execCommand('insertText', false, clean)
        return
      }
    }
    if (onPaste) onPaste(e)
  }

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
        <input
          id={id}
          type={type}
          min={isNumeric && min === undefined ? '0' : min}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPaste={handlePaste}
          className={`h-11 w-full rounded-lg border text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-400 bg-rose-50/40 text-rose-950 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-200 bg-slate-50 focus:border-primary-300 focus:bg-primary-50/40 focus:ring-primary-100'
          } ${Icon ? 'pl-10 pr-3' : 'px-3'} ${className}`}
          {...props}
        />
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

export default Input
