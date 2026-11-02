/**
 * Courier and Tracking System Helpers for Sellvro Marketplace
 * Supports WMS automated courier handover and Supplier direct courier dispatch.
 */

export const POPULAR_COURIERS = [
  { id: 'sellvro', name: 'Sellvro Express', prefix: 'SLV', region: 'Global' },
  { id: 'tcs', name: 'TCS Express', prefix: 'TCS', region: 'Pakistan & Intl' },
  { id: 'leopard', name: 'Leopards Courier', prefix: 'LEO', region: 'Pakistan' },
  { id: 'trax', name: 'Trax Logistics', prefix: 'TRX', region: 'Pakistan' },
  { id: 'callcourier', name: 'Call Courier', prefix: 'CC', region: 'Pakistan' },
  { id: 'postex', name: 'PostEx', prefix: 'PEX', region: 'Pakistan' },
  { id: 'mnp', name: 'M&P Express Logistics', prefix: 'MNP', region: 'Pakistan' },
  { id: 'blueex', name: 'BlueEx', prefix: 'BLX', region: 'Pakistan' },
  { id: 'fedex', name: 'FedEx', prefix: 'FDX', region: 'Global' },
  { id: 'dhl', name: 'DHL Express', prefix: 'DHL', region: 'Global' },
  { id: 'ups', name: 'UPS', prefix: 'UPS', region: 'Global' },
  { id: 'usps', name: 'USPS', prefix: 'USP', region: 'USA / Global' },
  { id: 'aramex', name: 'Aramex', prefix: 'ARX', region: 'Middle East & Intl' },
]

/**
 * Returns external official courier tracking link if supported.
 */
export function getCourierExternalTrackingUrl(carrierName = '', trackingNumber = '') {
  if (!trackingNumber) return null
  const c = String(carrierName || '').toLowerCase().trim()
  const trk = encodeURIComponent(String(trackingNumber).trim())

  if (c.includes('tcs')) return `https://www.tcsexpress.com/tracking?trackNo=${trk}`
  if (c.includes('leopard')) return `https://www.leopardscourier.com/tracking?track=${trk}`
  if (c.includes('trax')) return `https://sonic.trax.pk/tracking?tracking_number=${trk}`
  if (c.includes('call courier') || c.includes('callcourier')) return `https://callcourier.com.pk/tracking/?tc=${trk}`
  if (c.includes('postex')) return `https://postex.pk/tracking?cn=${trk}`
  if (c.includes('m&p') || c.includes('mnp') || c.includes('mulphilog')) return `https://mulphilog.com/tracking?consignment=${trk}`
  if (c.includes('blueex') || c.includes('blue-ex')) return `https://www.blue-ex.com/tracking?cn=${trk}`
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trk}`
  if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trk}`
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trk}`
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trk}`
  if (c.includes('aramex')) return `https://www.aramex.com/track/results?shipmentNumber=${trk}`

  return null
}

/**
 * Generates an automated distinctive courier tracking code
 * e.g., TCS-948102941, LEO-381928371, FDX-1029384758
 */
export function generateAutomatedTrackingId(carrierName = 'Sellvro Express', orderNo = '') {
  const match = POPULAR_COURIERS.find(
    (item) => item.name.toLowerCase() === String(carrierName).toLowerCase() || item.id === String(carrierName).toLowerCase(),
  )
  const prefix = match?.prefix || String(carrierName).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'SLV'
  const randNum = Math.floor(100000000 + Math.random() * 900000000)
  const cleanOrder = orderNo ? orderNo.replace(/^ORD-/, '').slice(0, 4) : ''

  if (prefix === 'SLV') {
    return cleanOrder ? `SLV-${cleanOrder}-${randNum.toString().slice(-4)}` : `SLV-${randNum}`
  }
  return `${prefix}-${randNum}`
}

/**
 * Stages for the visual tracker progress stepper
 */
export const TRACKING_STAGES = [
  { key: 'placed', label: 'Order Placed', step: 1 },
  { key: 'processing', label: 'Warehouse Pick & Pack', step: 2 },
  { key: 'in_transit', label: 'Handed Over to Courier', step: 3 },
  { key: 'out_for_delivery', label: 'Out for Delivery', step: 4 },
  { key: 'delivered', label: 'Delivered', step: 5 },
]

export function getTrackingProgressPercent(status = '') {
  const s = String(status).toLowerCase().trim()
  if (s === 'delivered') return 100
  if (s === 'out_for_delivery') return 75
  if (s === 'in_transit') return 50
  if (s === 'processing' || s === 'in_process') return 25
  return 10
}
