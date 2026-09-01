/**
 * Canonical permission keys for Sellvro across admin, supplier, and user panels.
 * Keep in sync with src/lib/permissions.js
 */

export const PERMISSION_GROUPS = [
  {
    id: 'admin',
    label: 'Admin Panel',
    modules: [
      {
        id: 'admin_dashboard',
        label: 'Dashboard',
        permissions: [
          { key: 'admin.dashboard.view', label: 'View dashboard' },
        ],
      },
      {
        id: 'admin_products',
        label: 'Products & Inventory',
        permissions: [
          { key: 'admin.products.view', label: 'View all products' },
          { key: 'admin.products.create', label: 'Add products' },
          { key: 'admin.products.approve', label: 'Approve / reject products' },
          { key: 'admin.inventory.sku_reporting', label: 'SKU reporting' },
          { key: 'admin.inventory.business_reporting', label: 'Business reporting' },
        ],
      },
      {
        id: 'admin_categories',
        label: 'Categories',
        permissions: [
          { key: 'admin.categories.view', label: 'View categories' },
          { key: 'admin.categories.manage', label: 'Create / edit / delete categories' },
        ],
      },
      {
        id: 'admin_suppliers',
        label: 'Suppliers',
        permissions: [
          { key: 'admin.suppliers.view', label: 'View all suppliers' },
          { key: 'admin.suppliers.pending', label: 'View pending suppliers' },
          { key: 'admin.suppliers.approve', label: 'Approve / reject suppliers' },
        ],
      },
      {
        id: 'admin_users',
        label: 'Users',
        permissions: [
          { key: 'admin.users.view', label: 'View all users' },
          { key: 'admin.users.pending', label: 'View pending users' },
          { key: 'admin.users.approve', label: 'Approve / reject users' },
        ],
      },
      {
        id: 'admin_sales',
        label: 'Sales & Orders',
        permissions: [
          { key: 'admin.sales.view', label: 'View orders / sales' },
          { key: 'admin.sales.manage', label: 'Manage order status' },
        ],
      },
      {
        id: 'admin_finance',
        label: 'Finance',
        permissions: [
          { key: 'admin.wallets.view', label: 'View wallet requests' },
          { key: 'admin.wallets.approve', label: 'Approve / reject wallet requests' },
          { key: 'admin.payouts.view', label: 'View supplier payouts' },
          { key: 'admin.payouts.process', label: 'Process supplier payouts' },
        ],
      },
      {
        id: 'admin_disputes',
        label: 'Disputes',
        permissions: [
          { key: 'admin.disputes.supplier', label: 'View supplier disputes' },
          { key: 'admin.disputes.user', label: 'View user complaints' },
          { key: 'admin.disputes.resolve', label: 'Resolve / reject disputes' },
        ],
      },
      {
        id: 'admin_settings',
        label: 'Settings',
        permissions: [
          { key: 'admin.settings.roles', label: 'Manage roles & permissions' },
          { key: 'admin.settings.create_user', label: 'Create admin users' },
          { key: 'admin.settings.location', label: 'Manage locations' },
          { key: 'admin.settings.country', label: 'Manage countries' },
        ],
      },
    ],
  },
  {
    id: 'supplier',
    label: 'Supplier Portal',
    modules: [
      {
        id: 'supplier_dashboard',
        label: 'Dashboard',
        permissions: [
          { key: 'supplier.dashboard.view', label: 'View dashboard' },
        ],
      },
      {
        id: 'supplier_products',
        label: 'Products',
        permissions: [
          { key: 'supplier.products.view', label: 'View products' },
          { key: 'supplier.products.create', label: 'Add / edit products' },
          { key: 'supplier.inventory.sku_reporting', label: 'SKU reporting' },
          { key: 'supplier.inventory.business_reporting', label: 'Business reporting' },
        ],
      },
      {
        id: 'supplier_orders',
        label: 'Sales & Orders',
        permissions: [
          { key: 'supplier.orders.view', label: 'View orders' },
          { key: 'supplier.orders.manage', label: 'Update order status' },
        ],
      },
      {
        id: 'supplier_finance',
        label: 'Finance',
        permissions: [
          { key: 'supplier.finance.view', label: 'View finance overview' },
          { key: 'supplier.finance.request_payout', label: 'Request payouts' },
        ],
      },
      {
        id: 'supplier_disputes',
        label: 'Disputes',
        permissions: [
          { key: 'supplier.disputes.view', label: 'View disputes' },
          { key: 'supplier.disputes.create', label: 'Create disputes' },
        ],
      },
      {
        id: 'supplier_other',
        label: 'Other',
        permissions: [
          { key: 'supplier.business.manage', label: 'Manage business details' },
          { key: 'supplier.communication.chat', label: 'Chat with admin' },
        ],
      },
    ],
  },
  {
    id: 'user',
    label: 'User Panel',
    modules: [
      {
        id: 'user_dashboard',
        label: 'Dashboard',
        permissions: [
          { key: 'user.dashboard.view', label: 'View dashboard' },
        ],
      },
      {
        id: 'user_products',
        label: 'Products & Inventory',
        permissions: [
          { key: 'user.products.view', label: 'Browse products' },
          { key: 'user.products.purchase', label: 'Purchase products' },
          { key: 'user.inventory.business_reporting', label: 'Business reporting' },
        ],
      },
      {
        id: 'user_wallet',
        label: 'Wallet',
        permissions: [
          { key: 'user.wallet.view', label: 'View wallet' },
          { key: 'user.wallet.topup', label: 'Request wallet top-up' },
        ],
      },
      {
        id: 'user_orders',
        label: 'Orders',
        permissions: [
          { key: 'user.orders.view', label: 'View orders' },
          { key: 'user.orders.create', label: 'Place orders' },
        ],
      },
      {
        id: 'user_disputes',
        label: 'Disputes',
        permissions: [
          { key: 'user.disputes.view', label: 'View disputes' },
          { key: 'user.disputes.create', label: 'Create disputes' },
        ],
      },
      {
        id: 'user_other',
        label: 'Other',
        permissions: [
          { key: 'user.business.manage', label: 'Manage business details' },
          { key: 'user.communication.chat', label: 'Chat with admin' },
        ],
      },
    ],
  },
]

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.modules.flatMap((module) => module.permissions.map((item) => item.key)),
)

export const PERMISSION_KEY_SET = new Set(ALL_PERMISSION_KEYS)

/** Admin route paths → required permission (any match grants access). */
export const ADMIN_ROUTE_PERMISSIONS = {
  '/admin/dashboard': 'admin.dashboard.view',
  '/admin/products': 'admin.products.view',
  '/admin/product/create': 'admin.products.create',
  '/admin/inventory/sku-reporting': 'admin.inventory.sku_reporting',
  '/admin/inventory/my-reporting': 'admin.inventory.business_reporting',
  '/admin/categories': 'admin.categories.view',
  '/admin/suppliers': 'admin.suppliers.view',
  '/admin/suppliers/pending': 'admin.suppliers.pending',
  '/admin/users': 'admin.users.view',
  '/admin/users/pending': 'admin.users.pending',
  '/admin/sales': 'admin.sales.view',
  '/admin/wallets/requests': 'admin.wallets.view',
  '/admin/supplier/payouts': 'admin.payouts.view',
  '/admin/supplier/disputes': 'admin.disputes.supplier',
  '/admin/users/complaines': 'admin.disputes.user',
  '/admin/roles': 'admin.settings.roles',
  '/admin/users/roles': 'admin.settings.create_user',
  '/admin/location': 'admin.settings.location',
  '/admin/country': 'admin.settings.country',
}

export function sanitizePermissions(input) {
  if (!Array.isArray(input)) return []
  return [...new Set(input.map((item) => String(item || '').trim()).filter((key) => PERMISSION_KEY_SET.has(key)))]
}

export function hasPermission(userPermissions, permission) {
  if (!permission) return true
  if (!userPermissions?.length) return false
  return userPermissions.includes(permission)
}

export function hasAnyPermission(userPermissions, permissions = []) {
  if (!permissions.length) return true
  return permissions.some((permission) => hasPermission(userPermissions, permission))
}
