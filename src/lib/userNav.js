import { Home, Box, FileText, Wallet, Info } from 'lucide-react'

/**
 * User / client panel navigation with grouped sub-categories
 * for the horizontal nav bar (same pattern as admin panel).
 */
export const USER_NAV_ITEMS = [
  { label: 'Dashboard', to: '/user/dashboard', icon: Home },
  {
    label: 'Store',
    icon: Box,
    children: [
      { label: 'Sellvro Products', to: '/user/products' },
      { label: 'SKU Reporting', to: '/user/inventory/sku-reporting' },
      { label: 'My Reporting', to: '/user/inventory/my-reporting' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    children: [{ label: 'My Wallet', to: '/user/wallet' }],
  },
  { label: 'Orders', to: '/user/orders', icon: FileText },
  {
    label: 'Disputes & Support',
    icon: Info,
    children: [
      { label: 'All Disputes', to: '/user/disputes' },
      { label: 'Chat with Admin', to: '/user/disputes' },
    ],
  },
]
