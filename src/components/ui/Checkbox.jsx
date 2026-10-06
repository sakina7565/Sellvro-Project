/**
 * Simple labeled checkbox used for "Remember me" style options.
 */
function Checkbox({ label, id, className = '', onChange, ...props }) {
  return (
    <label className={`inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-200 cursor-pointer"
        onChange={onChange}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  )
}

export default Checkbox
