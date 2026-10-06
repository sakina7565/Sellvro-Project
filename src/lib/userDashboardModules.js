/**
 * User / client panel dashboard module cards.
 */
export const USER_DASHBOARD_MODULES = [
  {
    title: 'Store',
    description: 'Browse available products, manage catalog, and review inventory reporting.',
    links: [
      { label: 'Sellvro Products', to: '/user/products' },
      { label: 'SKU Reporting', to: '/user/inventory/sku-reporting' },
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
    title: 'Orders',
    description: 'Track orders, status updates, and dispatch history.',
    links: [{ label: 'View Orders', to: '/user/orders' }],
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
