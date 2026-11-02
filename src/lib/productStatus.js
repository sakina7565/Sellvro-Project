export const PRODUCT_STATUS_TONE = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  active: 'success',
  rejected: 'danger',
  inactive: 'neutral',
  deactivated: 'neutral',
  out_of_stock: 'danger',
}

export const PRODUCT_STATUS_LABEL = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Active',
  active: 'Active',
  rejected: 'Rejected',
  inactive: 'Deactivated',
  deactivated: 'Deactivated',
  out_of_stock: 'Out of Stock',
}

export const PRODUCT_STATUS_HINT = {
  draft: 'Draft saved — submit for admin review when ready.',
  pending_approval: 'Waiting for admin review — not visible on marketplace yet.',
  approved: 'Active and live on marketplace — users can buy.',
  active: 'Active and live on marketplace — users can buy.',
  rejected: 'Rejected by admin. Edit and resubmit.',
  inactive: 'Deactivated by supplier — temporarily hidden from marketplace.',
  deactivated: 'Deactivated by supplier — temporarily hidden from marketplace.',
  out_of_stock: 'Out of stock — inventory count is 0.',
}

/**
 * Admin status filter options.
 * Matches requested names:
 * - All Listings
 * - Pending Approval
 * - Active Listing
 * - Out of Stock Listing
 * - Deactivated Listing
 */
export const ADMIN_PRODUCT_STATUS_FILTER_OPTIONS = [
  'All Listings',
  'Pending Approval',
  'Active Listing',
  'Out of Stock Listing',
  'Deactivated Listing',
]

/**
 * Supplier status filter options.
 * Matches requested names:
 * - All Listings
 * - Pending Approval
 * - Active Listing
 * - Out of Stock Listing
 * - Deactivated Listing
 * - Drafts
 */
export const SUPPLIER_PRODUCT_STATUS_FILTER_OPTIONS = [
  'All Listings',
  'Pending Approval',
  'Active Listing',
  'Out of Stock Listing',
  'Deactivated Listing',
  'Drafts',
]

/** Default filter options (admin-safe) */
export const PRODUCT_STATUS_FILTER_OPTIONS = ADMIN_PRODUCT_STATUS_FILTER_OPTIONS

export function statusFilterToValue(label) {
  const map = {
    'All Listings': '',
    'All Listing': '',
    'All Statuses': '',
    'Pending Approval': 'pending_approval',
    'Active Listing': 'active_listing',
    Approved: 'active_listing',
    Active: 'active_listing',
    'Out of Stock Listing': 'out_of_stock_listing',
    'Out Of Stock Listing': 'out_of_stock_listing',
    'Out of Stock': 'out_of_stock_listing',
    'Deactivated Listing': 'deactivated_listing',
    Deactivated: 'deactivated_listing',
    Inactive: 'deactivated_listing',
    Drafts: 'drafts',
    Draft: 'drafts',
    Rejected: 'rejected',
  }
  return map[label] ?? ''
}

export function isProductWmsVerified(product) {
  if (!product) return false
  return Boolean(product.isWmsVerified || product.inWarehouse || product.fulfillBy === 'warehouse')
}
