/**
 * "Showing X to Y of Z entries" footer with Prev / page / Next
 * controls, shared by every paginated data table. `page` of `0`
 * hides the page-number pill (used for empty-state tables). Some
 * screens label the buttons "Previous" instead of "Prev", or say
 * "results" instead of "entries" — override with `prevLabel` /
 * `nextLabel` / `resultsLabel`. Pass `pages` (array of numbers) to
 * render a numbered page list (e.g. 1 2 3 4) with a solid primary
 * highlight on `page`, instead of the default single dark pill.
 */
function Pagination({
  from,
  to,
  total,
  page = 1,
  pages,
  prevLabel = 'Prev',
  nextLabel = 'Next',
  resultsLabel = 'entries',
  onPrev = () => {},
  onNext = () => {},
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
      <p>
        Showing {from} to {to} of {total} {resultsLabel}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          {prevLabel}
        </button>
        {pages
          ? pages.map((number) => (
              <button
                key={number}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  number === page
                    ? 'bg-primary text-white'
                    : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {number}
              </button>
            ))
          : page > 0 && (
              <button type="button" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white">
                {page}
              </button>
            )}
        <button
          type="button"
          onClick={onNext}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

export default Pagination
