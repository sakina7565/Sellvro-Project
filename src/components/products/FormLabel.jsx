function FormLabel({ icon: Icon, htmlFor, children, required = false }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      <span>
        {children}
        {required && <span className="text-rose-500"> *</span>}
      </span>
    </label>
  )
}

export default FormLabel
