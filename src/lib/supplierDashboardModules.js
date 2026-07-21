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
    title: 'Inventory',
    description: 'Monitor stock levels and warehouse inventory.',
    links: [
      { label: 'All Products', to: '/supplier/products' },
      { label: 'Add Product', to: '/supplier/product/create' },
    ],
  },
  {
    title: 'Disputes',
    description: 'Review and resolve order or product disputes.',
    links: [{ label: 'View Disputes', to: '/supplier/dashboard' }],
  },
  {
    title: 'Communication',
    description: 'Connect with admin support and get help.',
    links: [{ label: 'Open Chat with Admin', to: '/supplier/dashboard' }],
  },
]

export const SUPPLIER_FEATURED_MODULE = SUPPLIER_DASHBOARD_MODULES.find((m) => m.featured)

export const SUPPLIER_GRID_MODULES = SUPPLIER_DASHBOARD_MODULES.filter((m) => !m.featured)
