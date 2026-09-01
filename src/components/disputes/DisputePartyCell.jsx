import { formatAgainstLabel, formatRaisedByLabel } from '../../lib/disputeHelpers.js'

function RoleBadge({ role }) {
  if (!role) return null
  const tones = {
    user: 'bg-sky-50 text-sky-700',
    supplier: 'bg-violet-50 text-violet-700',
    admin: 'bg-amber-50 text-amber-700',
    platform: 'bg-amber-50 text-amber-700',
  }
  const tone = tones[role] || 'bg-slate-100 text-slate-600'
  const label =
    role === 'platform' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>
      {label}
    </span>
  )
}

export function DisputeRaisedByCell({ dispute }) {
  return (
    <div>
      <p className="font-medium text-slate-800">{formatRaisedByLabel(dispute)}</p>
      <RoleBadge role={dispute.fromRole || dispute.raisedBy?.role} />
    </div>
  )
}

export function DisputeAgainstCell({ dispute }) {
  return (
    <div>
      <p className="font-medium text-slate-700">{formatAgainstLabel(dispute)}</p>
      <RoleBadge role={dispute.toRole || dispute.against?.role || dispute.againstRole} />
    </div>
  )
}

export function DisputeOrderCell({ dispute }) {
  if (!dispute.orderId && (!dispute.order || dispute.order === '—')) {
    return <span className="text-slate-400">—</span>
  }
  return (
    <div>
      <p className="font-medium text-slate-700">{dispute.orderNo || dispute.order}</p>
      {dispute.orderId ? (
        <p className="text-[10px] text-slate-400" title={dispute.orderId}>
          ID: {dispute.orderId.slice(-8)}
        </p>
      ) : null}
    </div>
  )
}

export function DisputeProductCell({ dispute }) {
  if (!dispute.productId && (!dispute.product || dispute.product === '—')) {
    return <span className="text-slate-400">—</span>
  }
  return (
    <div>
      <p className="font-medium text-slate-700">{dispute.product}</p>
      {dispute.productId ? (
        <p className="text-[10px] text-slate-400" title={dispute.productId}>
          ID: {dispute.productId.slice(-8)}
        </p>
      ) : null}
    </div>
  )
}
