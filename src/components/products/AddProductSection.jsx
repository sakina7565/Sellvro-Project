/**
 * Numbered section card used on the Add Product form.
 */
function AddProductSection({ step, title, children, className = '' }) {
  return (
    <section className={`rounded-xl2 border border-slate-200 bg-white p-5 shadow-soft sm:p-6 ${className}`}>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
          {step}
        </span>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default AddProductSection
