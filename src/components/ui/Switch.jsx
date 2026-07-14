/**
 * Small pill toggle switch, e.g. the "Is Warehouse" option on the
 * Add Product form.
 */
function Switch({ checked = false, onChange = () => {}, label, className = '' }) {
  return (
    <label className={`inline-flex select-none items-center gap-2 text-sm text-slate-500 ${className}`}>
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export default Switch
