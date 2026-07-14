import { Home, Box, FileText, Wallet } from 'lucide-react'

/**
 * Central definition of the user panel sidebar navigation, matching
 * the User Panel Overview screenshot: Dashboard, My Products,
 * Orders, My Wallet.
 */
export const USER_NAV_ITEMS = [
  { label: 'Dashboard', to: '/user/dashboard', icon: Home },
  { label: 'My Products', to: '/user/products', icon: Box },
  { label: 'Orders', to: '/user/orders', icon: FileText },
  { label: 'My Wallet', to: '/user/wallet', icon: Wallet },
]
