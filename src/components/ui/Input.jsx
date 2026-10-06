/**
 * Labeled text input with a leading icon, shared across the entire app.
 * Automatically disallows negative numbers when type is "number" unless allowNegative is explicitly true.
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
          type={type}
          min={isNumeric && min === undefined ? '0' : min}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPaste={handlePaste}
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
