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
 * + label + value. `shape="circle"` renders a rounded-full icon chip
 * (Finance summary cards) instead of the default rounded-lg square.
 * `active` adds a highlighted border, used for the selected/callout
 * card on Supplier Payouts.
 */
function StatCard({ icon: Icon, tone = 'blue', label, value, shape = 'square', active = false }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl2 bg-surface-card p-4 shadow-soft ${
        active ? 'border-2 border-primary-300' : ''
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center ${
          shape === 'circle' ? 'rounded-full' : 'rounded-lg'
        } ${TONE_CLASSES[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default StatCard
