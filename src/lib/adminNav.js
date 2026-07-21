import {
  Home,
  Box,
  Contact2,
  Users,
  Receipt,
  Briefcase,
  Info,
  Settings,
} from 'lucide-react'

/**
 * Central definition of the admin sidebar navigation so every admin
 * page renders the exact same links, order and icons. Items may
 * declare `children` to render as an expandable group (e.g. Products).
 */
export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: Home },
  {
    label: 'Products',
    icon: Box,
    children: [
      { label: 'All Products', to: '/admin/products' },
      { label: 'Add Products', to: '/admin/product/create' },
      { label: 'SKU Reporting', to: '/admin/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/admin/inventory/my-reporting' },
      { label: 'Categories', to: '/admin/categories' },
    ],
  },
  {
    label: 'Suppliers',
    icon: Contact2,
    children: [
      { label: 'All Suppliers', to: '/admin/suppliers' },
      { label: 'Pending', to: '/admin/suppliers/pending' },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    children: [
      { label: 'All Users', to: '/admin/users' },
      { label: 'Pending', to: '/admin/users/pending' },
    ],
  },
  { label: 'Sales', to: '/admin/sales', icon: Receipt },
  {
    label: 'Finance',
    icon: Briefcase,
    children: [
      { label: 'Wallets Requests', to: '/admin/wallets/requests' },
      { label: 'Supplier Payouts', to: '/admin/supplier/payouts' },
    ],
  },
  {
    label: 'Disputes',
    icon: Info,
    children: [
      { label: 'Supplier', to: '/admin/supplier/disputes' },
      { label: 'User', to: '/admin/users/complaines' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Roles', to: '/admin/roles' },
      { label: 'Create User', to: '/admin/users/roles' },
      { label: 'Location', to: '/admin/location' },
      { label: 'Country', to: '/admin/country' },
    ],
  },
]
