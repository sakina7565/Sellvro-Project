/**
 * User / client panel dashboard module cards.
 */
export const USER_DASHBOARD_MODULES = [
  {
    title: 'Store',
    description: 'Monitor stock levels, manage product SKUs, and track warehouse Inventory.',
    links: [
      { label: 'Sellvro Products', to: '/user/products' },
      { label: 'My Reporting', to: '/user/inventory/my-reporting' },
    ],
    featured: true,
  },
  {
    title: 'Finance',
    description: 'Manage wallet balance and top-up requests.',
    links: [{ label: 'My Wallet', to: '/user/wallet' }],
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
      { label: 'All Disputes', to: '/user/disputes' },
      { label: 'Create Dispute', to: '/user/disputes' },
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
