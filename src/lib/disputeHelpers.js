const ROLE_LABELS = {
  user: 'User',
  supplier: 'Supplier',
  admin: 'Admin',
  platform: 'Platform Admin',
}

export function formatRoleLabel(role) {
  if (!role) return ''
  return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1)
}

export function formatPartyLabel(name, role) {
  if (!name || name === '—') return formatRoleLabel(role) || '—'
  const roleLabel = formatRoleLabel(role)
  return roleLabel ? `${name} (${roleLabel})` : name
}

export function formatAgainstLabel(dispute) {
  if (!dispute) return '—'
  if (dispute.toLabel) return dispute.toLabel
  if (dispute.against?.label) return dispute.against.label
  if (dispute.to && dispute.to !== '—') {
    return formatPartyLabel(dispute.to, dispute.againstRole)
  }
  if (dispute.againstRole === 'admin' || dispute.againstRole === 'platform') {
    return 'Platform Admin'
  }
  return formatRoleLabel(dispute.againstRole) || '—'
}

export function formatRaisedByLabel(dispute) {
  if (!dispute) return '—'
  if (dispute.fromLabel) return dispute.fromLabel
  if (dispute.raisedBy?.label) return dispute.raisedBy.label
  return formatPartyLabel(dispute.from, dispute.fromRole)
}

export function formatPartySummary(dispute) {
  if (dispute?.partySummary) return dispute.partySummary
  const from = formatRaisedByLabel(dispute)
  const to = formatAgainstLabel(dispute)
  return `${from} → complained against → ${to}`
}

export function getDisputeStatusMeta(status) {
  if (status === 'resolved') return { tone: 'success', label: 'Resolved' }
  if (status === 'rejected') return { tone: 'danger', label: 'Rejected' }
  return { tone: 'warning', label: 'Open' }
}
