import { SUPPLIER_NAV_ITEMS } from './supplierNav.js'

/**
 * Supplier panel dashboard module cards.
 */
export const SUPPLIER_DASHBOARD_MODULES = [
  {
    title: 'Products',
    description: 'Manage your product catalog, add new items and track inventory.',
    links: [
      { label: 'All Products', to: '/supplier/products' },
      { label: 'Add New Product', to: '/supplier/product/create' },
      { label: 'SKU Reporting', to: '/supplier/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/supplier/inventory/my-reporting' },
    ],
    featured: true,
  },
  {
    title: 'Sales & Orders',
    description: 'View orders, track sales and monitor order status.',
    links: SUPPLIER_NAV_ITEMS.find((i) => i.label === 'Sales & Orders')?.children ?? [],
  },
  {
    title: 'Finance',
    description: 'Manage payouts, revenue and financial operations.',
    links: [{ label: 'Finance Overview', to: '/supplier/finance/index' }],
  },
  {
    title: 'Disputes & Support',
    description: 'Review and resolve order disputes, payout queries, and admin chat.',
    links: [
      { label: 'View Disputes', to: '/supplier/disputes' },
      { label: 'Chat with Admin', to: '/supplier/disputes' },
    ],
  },
]

export const SUPPLIER_FEATURED_MODULE = SUPPLIER_DASHBOARD_MODULES.find((m) => m.featured)

export const SUPPLIER_GRID_MODULES = SUPPLIER_DASHBOARD_MODULES.filter((m) => !m.featured)
