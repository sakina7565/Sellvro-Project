/**
 * Mock data for the user SKU Reporting page.
 */
export const SKU_REPORT_PRODUCT = {
  name: 'Software Development Service',
  sku: 'SVRO-00014',
  category: 'Swords',
  brand: 'HayViral',
  client: 'WMS-PAK1006',
  price: 'Rs 0',
  added: '11 Jul 2026',
  status: 'Active',
}

export const SKU_REPORT_METRICS = [
  { label: 'Current Stock', value: 5, tone: 'blue', icon: 'warehouse' },
  { label: 'Shipments', value: 1, tone: 'green', icon: 'truck' },
  { label: 'Units Received', value: 5, tone: 'green', icon: 'download' },
  { label: 'Units Dispatched', value: 0, tone: 'blue', icon: 'truckOut' },
  { label: 'Disputes', value: 0, tone: 'orange', icon: 'alert' },
  { label: 'Damaged Units', value: 0, tone: 'red', icon: 'target' },
  { label: 'Missing Units', value: 0, tone: 'orange', icon: 'alertCircle' },
  { label: 'Fulfillments', value: 0, tone: 'blue', icon: 'send' },
  { label: 'Pending Fulfills', value: 0, tone: 'yellow', icon: 'hourglass' },
  { label: 'Fulfillment by Admin', value: 0, tone: 'purple', icon: 'userCog' },
  { label: 'Fulfillment by Client', value: 0, tone: 'teal', icon: 'user' },
]

export const SKU_MONTHLY_IN_OUT = [
  { month: 'Feb 2026', received: 0, dispatched: 0 },
  { month: 'Mar 2026', received: 0, dispatched: 0 },
  { month: 'Apr 2026', received: 0, dispatched: 0 },
  { month: 'May 2026', received: 0, dispatched: 0 },
  { month: 'Jun 2026', received: 0, dispatched: 0 },
  { month: 'Jul 2026', received: 5, dispatched: 0 },
]

export const SKU_SHIPMENTS = [
  {
    date: '11 Jul 2026',
    shipmentNo: 'SHIP-0001',
    courier: 'manual',
    expected: 5,
    received: 5,
    damaged: 0,
    missing: 0,
    status: 'received',
  },
]

export const SKU_FULFILLMENTS = []

export const SKU_DISPUTES = []
