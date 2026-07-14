import { Home, Box, Receipt, Briefcase } from 'lucide-react'

/**
 * Central definition of the supplier panel sidebar navigation, mirroring
 * `adminNav.js` so every supplier page renders the exact same links,
 * order and icons.
 */
export const SUPPLIER_NAV_ITEMS = [
  { label: 'Dashboard', to: '/supplier/dashboard', icon: Home },
  {
    label: 'My Products',
    icon: Box,
    children: [
      { label: 'All Products', to: '/supplier/products' },
      { label: 'Add New Product', to: '/supplier/product/create' },
    ],
  },
  {
    label: 'Sales & Orders',
    icon: Receipt,
    children: [{ label: 'View Orders', to: '/supplier/sales/details' }],
  },
  { label: 'Finance', to: '/supplier/finance/index', icon: Briefcase },
]
