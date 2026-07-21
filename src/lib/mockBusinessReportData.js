/**
 * Mock data for the My Business Reporting page.
 */
export const BUSINESS_PROFILE = {
  name: 'Ajay Chauhan',
  ownerId: 'WMS-PAK1006',
  business: 'HayViral',
  email: 'ajaychauhan.reviatan311@gmail.com',
  phone: '0323217391',
  status: 'Approved',
  location: '——',
  registered: '11 Jul 2024, 09:40 PM',
}

export const BUSINESS_METRICS = [
  { label: 'Products', value: 1, tone: 'blue', icon: 'package' },
  { label: 'Active SKUs', value: 5, tone: 'green', icon: 'layers' },
  { label: 'Shipments', value: 1, tone: 'blue', icon: 'truck' },
  { label: 'Units Received', value: 5, tone: 'green', icon: 'download' },
  { label: 'Units Dispatched', value: 0, tone: 'teal', icon: 'send' },
  { label: 'Shortage', value: 0, tone: 'orange', icon: 'alert' },
  { label: 'In-Transit', value: 0, tone: 'purple', icon: 'truck' },
  { label: 'Out Of Stock', value: 0, tone: 'red', icon: 'box' },
  { label: 'Pending', value: 0, tone: 'yellow', icon: 'clock' },
  { label: 'Total Paid', value: '$0', tone: 'green', icon: 'dollar' },
  { label: 'Pending Amount', value: '$0', tone: 'orange', icon: 'wallet' },
  { label: 'Disputes', value: 0, tone: 'red', icon: 'alertTriangle' },
]

export const CLIENT_JOURNEY = [
  {
    title: 'Account Registered',
    description: 'Your client account was created successfully.',
    date: '11 Jul 2024, 05:40 PM',
    icon: 'userPlus',
  },
  {
    title: 'Business Profile Submitted',
    description: 'Business details submitted for admin review.',
    date: '11 Jul 2024, 09:40 PM',
    icon: 'fileText',
  },
  {
    title: 'Business Approved',
    description: 'Your business profile has been approved.',
    date: '11 Jul 2024, 09:41 PM',
    icon: 'checkCircle',
  },
  {
    title: 'First Inventory Received',
    description: 'First stock received in the warehouse.',
    date: '11 Jul 2026, 02:40 PM',
    icon: 'package',
  },
]

export const BUSINESS_MONTHLY_IN_OUT = [
  { month: 'Feb 2026', received: 0, dispatched: 0 },
  { month: 'Mar 2026', received: 0, dispatched: 0 },
  { month: 'Apr 2026', received: 0, dispatched: 0 },
  { month: 'May 2026', received: 0, dispatched: 0 },
  { month: 'Jun 2026', received: 0, dispatched: 0 },
  { month: 'Jul 2026', received: 5, dispatched: 0 },
]

export const ALL_ACTIVITY = [
  {
    date: '11 Jul 2026',
    type: 'Shipment',
    event: 'Shipment registered',
    details: 'SHIP-0001 — received',
    status: 'received',
  },
  {
    date: '11 Jul 2026',
    type: 'Stock',
    event: 'Stock received',
    details: 'SVRO-00014 — quantity +5',
    status: 'active',
  },
]

export const BUSINESS_PRODUCTS = [
  {
    date: '11 Jul 2026',
    product: 'Software Development Service',
    sku: 'SVRO-00014',
    category: 'Swords',
    price: 'Rs 0',
    status: 'active',
  },
]

export const BUSINESS_SHIPMENTS = [
  {
    date: '11 Jul 2026',
    shipmentNo: 'SHIP-0001',
    carrier: 'manual',
    tracking: '—',
    warehouse: '5',
    receivedBy: 'Arslan',
    status: 'received',
  },
]

export const BUSINESS_FULFILLMENTS = []

export const INVENTORY_MOVEMENTS = [
  {
    date: '11 Jul 2026',
    sku: 'SVRO-00014',
    change: '+5',
    previous: 0,
    newQty: 5,
    type: 'received',
  },
]

export const BUSINESS_INVOICES = []

export const BUSINESS_DISPUTES = []
