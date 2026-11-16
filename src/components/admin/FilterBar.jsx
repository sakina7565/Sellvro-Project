import { SlidersHorizontal } from 'lucide-react'
import Card from '../ui/Card.jsx'

const controlClasses =
  'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-auto sm:min-w-[9rem]'

/**
 * Row of quick-filter controls + a trailing "Filter" action, used
 * above data tables (Products Listing, Suppliers, Users, Orders, ...).
 * Each filter defaults to a `select`, but can be `type: 'text'` or
 * `type: 'date'` for free-text / date-range filters (e.g. Orders).
 */
function FilterBar({ filters = [], onFilterClick = () => {}, children }) {
  return (
    <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter) => {
          if (filter.render) {
            return <div key={filter.key || filter.label}>{filter.render()}</div>
          }

          if (filter.type === 'custom') {
            return <div key={filter.key || filter.label}>{filter.component}</div>
          }

          if (filter.type === 'text') {
            return (
              <input
                key={filter.label}
                type="text"
                placeholder={filter.label}
                value={filter.value ?? ''}
                onChange={filter.onChange}
                className={`${controlClasses} placeholder:text-slate-400`}
              />
            )
          }

          if (filter.type === 'number') {
            return (
              <input
                key={filter.label}
                type="number"
                min={filter.min ?? '0'}
                step={filter.step ?? 'any'}
                placeholder={filter.placeholder || filter.label}
                value={filter.value ?? ''}
                onChange={filter.onChange}
                className={`${controlClasses} placeholder:text-slate-400`}
              />
            )
          }

          if (filter.type === 'date') {
            return <input key={filter.label} type="date" aria-label={filter.label} className={controlClasses} />
          }

          if (filter.options?.length) {
            if (filter.onChange) {
              return (
                <select
                  key={filter.label}
                  value={filter.value ?? (typeof filter.options[0] === 'object' ? filter.options[0].value : filter.options[0])}
                  onChange={filter.onChange}
                  className={`appearance-none ${controlClasses}`}
                >
                  {filter.options.map((option) => {
                    const val = typeof option === 'object' ? option.value : option
                    const label = typeof option === 'object' ? option.label : option
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              )
            }

            return (
              <select key={filter.label} defaultValue="" className={`appearance-none ${controlClasses}`}>
                <option value="" disabled>
                  {filter.label}
                </option>
                {filter.options.map((option) => {
                  const val = typeof option === 'object' ? option.value : option
                  const label = typeof option === 'object' ? option.label : option
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  )
                })}
              </select>
            )
          }

          return (
            <select key={filter.label} defaultValue="" className={`appearance-none ${controlClasses}`}>
              <option value="" disabled>
                {filter.label}
              </option>
            </select>
          )
        })}
        {children}
      </div>
      <button
        type="button"
        onClick={onFilterClick}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary cursor-pointer"
      >
        Filter
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </Card>
  )
}

export default FilterBar
