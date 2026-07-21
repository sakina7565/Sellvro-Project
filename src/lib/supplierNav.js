import { Home, Box, Receipt, Briefcase, Truck, Info, MessageCircle } from 'lucide-react'

/**
 * Supplier panel navigation with grouped sub-categories
 * for the horizontal nav bar (same pattern as admin panel).
 */
export const SUPPLIER_NAV_ITEMS = [
  { label: 'Dashboard', to: '/supplier/dashboard', icon: Home },
  {
    label: 'My Products',
    icon: Box,
    children: [
      { label: 'All Products', to: '/supplier/products' },
      { label: 'Add New Product', to: '/supplier/product/create' },
      { label: 'SKU Reporting', to: '/supplier/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/supplier/inventory/my-reporting' },
    ],
  },
  {
    label: 'Sales & Orders',
    icon: Receipt,
    children: [{ label: 'View Orders', to: '/supplier/sales/details' }],
  },
  {
    label: 'Finance',
    icon: Briefcase,
    children: [{ label: 'Finance Overview', to: '/supplier/finance/index' }],
  },
  {
    label: 'Inventory',
    icon: Truck,
    children: [
      { label: 'All Products', to: '/supplier/products' },
      { label: 'Add Product', to: '/supplier/product/create' },
    ],
  },
  {
    label: 'Disputes',
    icon: Info,
    children: [{ label: 'View Disputes', to: '/supplier/dashboard' }],
  },
  {
    label: 'Communication',
    icon: MessageCircle,
    children: [{ label: 'Open Chat with Admin', to: '/supplier/dashboard' }],
  },
]
