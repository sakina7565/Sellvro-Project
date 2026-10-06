import { Link } from 'react-router-dom'

const TONE_CLASSES = {
  yellow: 'bg-amber-50 text-amber-500',
  blue: 'bg-sky-50 text-sky-500',
  pink: 'bg-pink-50 text-pink-500',
  teal: 'bg-teal-50 text-teal-500',
  green: 'bg-emerald-50 text-emerald-500',
  red: 'bg-rose-50 text-rose-500',
  purple: 'bg-violet-50 text-violet-500',
}

/**
 * Small metric card used in the "Overview" / "Pending Tasks" grids on
 * the dashboard, and the summary rows on the Finance pages: icon chip
 * + label + value. `shape="circle"` renders a rounded-full icon chip.
 * `to` turns the card into a clickable navigation link with hover feedback.
 */
function StatCard({
  icon: Icon,
  tone = 'blue',
  label,
  value,
  shape = 'square',
  active = false,
  to,
  hint,
}) {
  const CardWrapper = to ? Link : 'div'

  return (
    <CardWrapper
      to={to}
      className={`group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all duration-200 ${
        to ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md' : ''
      } ${active ? 'border-2 border-primary-400' : ''}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center transition-transform group-hover:scale-105 ${
            shape === 'circle' ? 'rounded-full' : 'rounded-xl'
          } ${TONE_CLASSES[tone] || TONE_CLASSES.blue}`}
        >
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      {to && (
        <span className="shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 text-xs font-semibold text-primary">
          View &rarr;
        </span>
      )}
    </CardWrapper>
  )
}

export default StatCard
