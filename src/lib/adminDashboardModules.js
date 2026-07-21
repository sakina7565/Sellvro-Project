import { ADMIN_NAV_ITEMS } from '../lib/adminNav.js'

/**
 * Admin dashboard module cards: titles, descriptions and sub-links
 * derived from ADMIN_NAV_ITEMS (everything except Dashboard).
 */
export const ADMIN_DASHBOARD_MODULES = [
  {
    title: 'Inventory',
    description: 'Monitor stock levels, manage product SKUs, and track warehouse Inventory.',
    links: [
      { label: 'All Inventory', to: '/admin/products' },
      { label: 'Add Product', to: '/admin/product/create' },
      { label: 'SKU Reporting', to: '/admin/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/admin/inventory/my-reporting' },
    ],
    featured: true,
  },
  {
    title: 'Finance',
    description: 'Handle wallet requests, supplier payouts and billing operations.',
    links: ADMIN_NAV_ITEMS.find((i) => i.label === 'Finance')?.children ?? [],
  },
  {
    title: 'Sales',
    description: 'View and manage all orders, track sales and order status.',
    links: [{ label: 'All Orders', to: '/admin/sales' }],
  },
  {
    title: 'Suppliers',
    description: 'Review supplier registrations, approvals and supplier activity.',
    links: ADMIN_NAV_ITEMS.find((i) => i.label === 'Suppliers')?.children ?? [],
  },
  {
    title: 'Users',
    description: 'Manage all users, pending approvals and user accounts.',
    links: ADMIN_NAV_ITEMS.find((i) => i.label === 'Users')?.children ?? [],
  },
  {
    title: 'Disputes',
    description: 'Review and resolve supplier and user disputes.',
    links: ADMIN_NAV_ITEMS.find((i) => i.label === 'Disputes')?.children ?? [],
  },
  {
    title: 'Settings',
    description: 'Configure roles, locations, countries and system settings.',
    links: ADMIN_NAV_ITEMS.find((i) => i.label === 'Settings')?.children ?? [],
  },
]

export const FEATURED_MODULE = ADMIN_DASHBOARD_MODULES.find((m) => m.featured)

export const GRID_MODULES = ADMIN_DASHBOARD_MODULES.filter((m) => !m.featured)
