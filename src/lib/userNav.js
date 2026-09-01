import { Home, Box, FileText, Wallet, Package, Info, MessageCircle } from 'lucide-react'

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
      { label: 'My Reporting', to: '/user/inventory/my-reporting' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    children: [{ label: 'My Wallet', to: '/user/wallet' }],
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
      { label: 'All Disputes', to: '/user/disputes' },
      { label: 'Create Dispute', to: '/user/disputes' },
    ],
  },
  {
    label: 'Communication',
    icon: MessageCircle,
    children: [{ label: 'Open Chat with Admin', to: '/user/dashboard' }],
  },
  { label: 'Orders', to: '/user/orders', icon: FileText },
]
