/**
 * Card representation of a single data-table row, shown in place of
 * the `<table>` on small screens so list pages never need horizontal
 * scrolling on a phone. Pair with `DetailRow` for the field grid.
 */
function MobileCard({ title, subtitle, badge, actions, children }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {badge}
      </div>

      {children && <dl className="mt-3 grid grid-cols-2 gap-y-2.5 text-xs">{children}</dl>}

      {actions && <div className="mt-3 flex items-center gap-0.5 border-t border-slate-50 pt-3">{actions}</div>}
    </div>
  )
}

export default MobileCard
