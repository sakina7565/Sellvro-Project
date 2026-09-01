export const PRODUCT_STATUS_TONE = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'pending',
  active: 'success',
  rejected: 'danger',
}

export const PRODUCT_STATUS_LABEL = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
  rejected: 'Rejected',
}

export const PRODUCT_STATUS_HINT = {
  draft: 'Save and submit when ready.',
  pending_approval: 'Waiting for admin review.',
  approved: 'Approved — awaiting admin activation for marketplace.',
  active: 'Live on marketplace — users can buy.',
  rejected: 'Rejected by admin. Edit and resubmit.',
}

export const PRODUCT_STATUS_FILTER_OPTIONS = [
  'All Statuses',
  'Pending Approval',
  'Approved',
  'Active',
  'Rejected',
  'Draft',
]

export function statusFilterToValue(label) {
  const map = {
    'All Statuses': '',
    Draft: 'draft',
    'Pending Approval': 'pending_approval',
    Approved: 'approved',
    Active: 'active',
    Rejected: 'rejected',
  }
  return map[label] ?? ''
}
