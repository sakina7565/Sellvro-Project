import { SlidersHorizontal } from 'lucide-react'
import Card from '../ui/Card.jsx'

const controlClasses =
  'h-10 min-w-[9rem] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

/**
 * Row of quick-filter controls + a trailing "Filter" action, used
 * above data tables (Products Listing, Suppliers, Users, Orders, ...).
 * Each filter defaults to a `select`, but can be `type: 'text'` or
 * `type: 'date'` for free-text / date-range filters (e.g. Orders).
 */
function FilterBar({ filters = [], onFilterClick = () => {} }) {
  return (
    <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => {
          if (filter.type === 'text') {
            return (
              <input
                key={filter.label}
                type="text"
                placeholder={filter.label}
                className={`${controlClasses} placeholder:text-slate-400`}
              />
            )
          }

          if (filter.type === 'date') {
            return <input key={filter.label} type="date" aria-label={filter.label} className={controlClasses} />
          }

          return (
            <select key={filter.label} defaultValue="" className={`appearance-none ${controlClasses}`}>
              <option value="" disabled>
                {filter.label}
              </option>
              {filter.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onFilterClick}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"
      >
        Filter
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </Card>
  )
}

export default FilterBar
