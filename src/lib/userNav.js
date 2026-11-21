import { Home, Box, FileText, Wallet, Info } from 'lucide-react'

/**
 * User / client panel navigation with grouped sub-categories
 * for the horizontal nav bar (same pattern as admin panel).
 */
export const USER_NAV_ITEMS = [
  { label: 'Dashboard', to: '/user/dashboard', icon: Home },
  { label: 'Orders', to: '/user/orders', icon: FileText },
  {
    label: 'Finance',
    icon: Wallet,
    children: [{ label: 'My Wallet', to: '/user/wallet' }],
  },
  {
    label: 'Reporting',
    icon: Box,
    children: [
      { label: 'SKU Reporting', to: '/user/inventory/sku-reporting' },
      { label: 'Sales Reporting', to: '/user/inventory/my-reporting' },
    ],
  },
  {
    label: 'Disputes & Support',
    icon: Info,
    children: [
      { label: 'All Disputes', to: '/user/disputes' },
      { label: 'Chat with Admin', to: '/user/disputes' },
    ],
  },
]
