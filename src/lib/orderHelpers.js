/**
 * Shared helpers for order shipping address display and formatting.
 */

export function formatShippingAddress(shipping) {
  if (!shipping) return '—'
  const lines = [
    shipping.fullName,
    shipping.phone,
    shipping.addressLine,
    [shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(', '),
    shipping.country,
  ].filter(Boolean)
  return lines.length ? lines.join('\n') : '—'
}

export function hasShippingAddress(shipping) {
  if (!shipping) return false
  return Boolean(
    shipping.fullName ||
      shipping.phone ||
      shipping.addressLine ||
      shipping.city ||
      shipping.state ||
      shipping.postalCode ||
      shipping.country,
  )
}

export const ORDER_STATUS_OPTIONS = [
  { value: 'placed', label: 'Placed' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_process', label: 'In Process' },
  { value: 'cancelled', label: 'Cancelled' },
]
