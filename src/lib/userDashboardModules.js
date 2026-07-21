/**
 * User / client panel dashboard module cards.
 */
export const USER_DASHBOARD_MODULES = [
  {
    title: 'Inventory',
    description: 'Monitor stock levels, manage product SKUs, and track warehouse Inventory.',
    links: [
      { label: 'All Inventory', to: '/user/products' },
      { label: 'Add Product', to: '/user/products' },
      { label: 'SKU Reporting', to: '/user/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/user/inventory/my-reporting' },
    ],
    featured: true,
  },
  {
    title: 'Finance',
    description: 'Manage billing, payments and wallet transactions.',
    links: [{ label: 'Billing', to: '/user/wallet' }],
  },
  {
    title: 'Shipment',
    description: 'Track and manage all your shipments in one place.',
    links: [
      { label: 'All Shipments', to: '/user/orders' },
      { label: 'Create Shipment', to: '/user/orders' },
    ],
  },
  {
    title: 'Fulfillment',
    description: 'Handle fulfillment requests and order processing.',
    links: [
      { label: 'Fulfillments Request', to: '/user/orders' },
      { label: 'Fulfillments', to: '/user/orders' },
    ],
  },
  {
    title: 'Disputes',
    description: 'Review and manage order disputes.',
    links: [
      { label: 'All Disputes', to: '/user/orders' },
      { label: 'Create Dispute', to: '/user/orders' },
    ],
  },
  {
    title: 'Communication',
    description: 'Connect with admin support and get help quickly.',
    links: [{ label: 'Open Chat with Admin', to: '/user/dashboard' }],
  },
]

export const USER_FEATURED_MODULE = USER_DASHBOARD_MODULES.find((m) => m.featured)

export const USER_GRID_MODULES = USER_DASHBOARD_MODULES.filter((m) => !m.featured)
