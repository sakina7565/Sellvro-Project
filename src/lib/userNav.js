import { Home, Box, FileText, Wallet, Truck, Package, Info, MessageCircle } from 'lucide-react'

/**
 * User / client panel navigation with grouped sub-categories
 * for the horizontal nav bar (same pattern as admin panel).
 */
export const USER_NAV_ITEMS = [
  { label: 'Dashboard', to: '/user/dashboard', icon: Home },
  {
    label: 'Inventory',
    icon: Box,
    children: [
      { label: 'All Inventory', to: '/user/products' },
      { label: 'Add Product', to: '/user/products' },
      { label: 'SKU Reporting', to: '/user/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/user/inventory/my-reporting' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    children: [
      { label: 'Billing', to: '/user/wallet' },
      { label: 'My Wallet', to: '/user/wallet' },
    ],
  },
  {
    label: 'Shipment',
    icon: Truck,
    children: [
      { label: 'All Shipments', to: '/user/orders' },
      { label: 'Create Shipment', to: '/user/orders' },
    ],
  },
  {
    label: 'Fulfillment',
    icon: Package,
    children: [
      { label: 'Fulfillments Request', to: '/user/orders' },
      { label: 'Fulfillments', to: '/user/orders' },
    ],
  },
  {
    label: 'Disputes',
    icon: Info,
    children: [
      { label: 'All Disputes', to: '/user/orders' },
      { label: 'Create Dispute', to: '/user/orders' },
    ],
  },
  {
    label: 'Communication',
    icon: MessageCircle,
    children: [{ label: 'Open Chat with Admin', to: '/user/dashboard' }],
  },
  { label: 'Orders', to: '/user/orders', icon: FileText },
]
