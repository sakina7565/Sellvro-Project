/**
 * Simple labeled checkbox used for "Remember me" style options.
 */
function Checkbox({ label, id, className = '', ...props }) {
  return (
    <label htmlFor={id} className={`inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-200"
        {...props}
      />
      {label}
    </label>
  )
}

export default Checkbox
