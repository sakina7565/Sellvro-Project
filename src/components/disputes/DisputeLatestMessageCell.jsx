import Badge from '../ui/Badge.jsx'
import { formatRoleLabel } from '../../lib/disputeHelpers.js'

function formatPreviewTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function DisputeLatestMessageCell({ dispute }) {
  const latest = dispute?.latestMessage
  if (!latest?.text) {
    return <span className="text-slate-400">—</span>
  }

  const sender = latest.senderName || formatRoleLabel(latest.role) || 'Staff'

  return (
    <div className="max-w-xs">
      <div className="flex items-center gap-2">
        {dispute.hasUnread ? (
          <Badge tone="warning" className="shrink-0">
            New reply
          </Badge>
        ) : null}
        <p className="truncate text-sm text-slate-700" title={latest.text}>
          <span className="font-medium text-slate-500">{sender}:</span> {latest.text}
        </p>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">{formatPreviewTime(latest.createdAt)}</p>
    </div>
  )
}

export function DisputeUnreadBadge({ dispute }) {
  if (!dispute?.hasUnread) return null
  return (
    <Badge tone="warning" className="shrink-0">
      {dispute.unreadCount > 1 ? `${dispute.unreadCount} new` : 'New reply'}
    </Badge>
  )
}
