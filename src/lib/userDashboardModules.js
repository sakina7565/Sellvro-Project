/**
 * User / client panel dashboard module cards.
 */
export const USER_DASHBOARD_MODULES = [
  {
    title: 'Orders & Fulfillment',
    description: 'Track orders, status updates, barcode tracking, and 3PL dispatch history.',
    links: [{ label: 'View Orders', to: '/user/orders' }],
    featured: true,
  },
  {
    title: 'Finance',
    description: 'Manage wallet balance and top-up requests.',
    links: [{ label: 'My Wallet', to: '/user/wallet' }],
  },
  {
    title: 'Reporting',
    description: 'Monitor SKU movement, sales performance, and export reporting.',
    links: [
      { label: 'SKU Reporting', to: '/user/inventory/sku-reporting' },
      { label: 'Sales Reporting', to: '/user/inventory/my-reporting' },
    ],
  },
  {
    title: 'Disputes & Support',
    description: 'Review and manage order disputes, complaints, and staff chat.',
    links: [
      { label: 'All Disputes', to: '/user/disputes' },
      { label: 'Chat with Admin', to: '/user/disputes' },
    ],
  },
]

export const USER_FEATURED_MODULE = USER_DASHBOARD_MODULES.find((m) => m.featured)

export const USER_GRID_MODULES = USER_DASHBOARD_MODULES.filter((m) => !m.featured)
