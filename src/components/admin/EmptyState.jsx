/**
 * Plain "No X found." row shown inside a table/card list when a
 * filtered data set has zero results (e.g. Pending Users).
 */
function EmptyState({ message = 'No results found.', colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-6 text-sm text-slate-500">
        {message}
      </td>
    </tr>
  )
}

export default EmptyState
