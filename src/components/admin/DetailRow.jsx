/**
 * Label/value pair used inside a `MobileCard`'s detail grid.
 */
function DetailRow({ label, value, full = false }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-600">{value}</dd>
    </div>
  )
}

export default DetailRow
