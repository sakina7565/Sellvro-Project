import Product from '../models/Product.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import { hasPermission } from '../constants/permissions.js'

const ADMIN_PAGES = [
  { title: 'Dashboard', path: '/admin/dashboard', permission: 'admin.dashboard.view', keywords: ['dashboard', 'home', 'stats', 'overview', 'main'] },
  { title: 'Products List', path: '/admin/products', permission: 'admin.products.view', keywords: ['products', 'catalog', 'items', 'list products'] },
  { title: 'Add Product', path: '/admin/products/add', permission: 'admin.products.create', keywords: ['add product', 'new product', 'create product'] },
  { title: 'Categories', path: '/admin/categories', permission: 'admin.categories.manage', keywords: ['categories', 'taxonomy', 'add category'] },
  { title: 'Orders', path: '/admin/orders', permission: 'admin.orders.view', keywords: ['orders', 'sales', 'order tracking', 'transactions'] },
  { title: 'All Suppliers', path: '/admin/suppliers', permission: 'admin.suppliers.view', keywords: ['suppliers', 'vendors', 'sellers', 'supplier list'] },
  { title: 'Pending Suppliers', path: '/admin/suppliers/pending', permission: 'admin.suppliers.manage', keywords: ['pending suppliers', 'supplier approval', 'verify supplier'] },
  { title: 'All Users', path: '/admin/users', permission: 'admin.users.view', keywords: ['users', 'customers', 'all users', 'clients'] },
  { title: 'Pending Users', path: '/admin/users/pending', permission: 'admin.users.manage', keywords: ['pending users', 'verify users', 'approve users'] },
  { title: 'Create User & Staff', path: '/admin/users/roles', permission: 'admin.users.manage', keywords: ['create user', 'register staff', 'subadmin', 'admin users'] },
  { title: 'Roles & Permissions', path: '/admin/roles', permission: 'admin.roles.manage', superAdminOnly: true, keywords: ['roles', 'permissions', 'access control', 'staff roles'] },
  { title: 'Inventory Stock', path: '/admin/inventory', permission: 'admin.inventory.view', keywords: ['inventory', 'stock', 'warehouse', 'stock levels'] },
  { title: 'Business Reporting', path: '/admin/inventory/business-reporting', permission: 'admin.inventory.business_reporting', keywords: ['business reporting', 'reports', 'analytics'] },
  { title: 'SKU Reporting', path: '/admin/inventory/sku-reporting', permission: 'admin.inventory.sku_reporting', keywords: ['sku reporting', 'sku reports', 'skus'] },
  { title: 'Disputes & Complaints', path: '/admin/disputes', permission: 'admin.disputes.view', keywords: ['disputes', 'complaints', 'issues', 'claims'] },
  { title: 'Supplier Payouts', path: '/admin/payouts', permission: 'admin.finance.view', keywords: ['payouts', 'supplier payouts', 'withdrawals', 'finance'] },
  { title: 'Wallets & Fund Requests', path: '/admin/wallets', permission: 'admin.finance.manage', keywords: ['wallets', 'wallet requests', 'funds', 'balance'] },
  { title: 'Countries', path: '/admin/countries', permission: 'admin.settings.manage', keywords: ['countries', 'shipping countries', 'destinations'] },
  { title: 'Locations', path: '/admin/locations', permission: 'admin.settings.manage', keywords: ['locations', 'warehouses', 'fulfillment centers'] },
]

const SUPPLIER_PAGES = [
  { title: 'Dashboard', path: '/supplier/dashboard', keywords: ['dashboard', 'home', 'stats', 'overview'] },
  { title: 'My Products', path: '/supplier/products', keywords: ['products', 'catalog', 'my products', 'inventory'] },
  { title: 'Add New Product', path: '/supplier/products/add', keywords: ['add product', 'new product', 'upload product'] },
  { title: 'Orders', path: '/supplier/orders', keywords: ['orders', 'sales', 'customer orders'] },
  { title: 'Inventory Management', path: '/supplier/inventory', keywords: ['inventory', 'stock', 'warehouse'] },
  { title: 'Payouts', path: '/supplier/payouts', keywords: ['payouts', 'payments', 'earnings', 'withdraw'] },
  { title: 'My Wallet', path: '/supplier/wallet', keywords: ['wallet', 'funds', 'balance'] },
  { title: 'Disputes', path: '/supplier/disputes', keywords: ['disputes', 'issues', 'complaints'] },
  { title: 'Business Profile', path: '/supplier/profile', keywords: ['profile', 'company info', 'settings'] },
]

const USER_PAGES = [
  { title: 'Marketplace / Products', path: '/user/products', keywords: ['products', 'shop', 'marketplace', 'buy', 'catalog', 'store'] },
  { title: 'Dashboard', path: '/user/dashboard', keywords: ['dashboard', 'home', 'overview'] },
  { title: 'My Orders', path: '/user/orders', keywords: ['orders', 'my orders', 'purchases', 'tracking'] },
  { title: 'My Wallet', path: '/user/wallet', keywords: ['wallet', 'funds', 'balance', 'deposit'] },
  { title: 'Disputes & Support', path: '/user/disputes', keywords: ['disputes', 'support', 'complaints', 'help'] },
  { title: 'My Profile', path: '/user/profile', keywords: ['profile', 'account', 'settings'] },
]

export const universalSearch = async (req, res) => {
  try {
    const rawQuery = String(req.query.q || '').trim()
    if (!rawQuery) {
      return res.json({
        query: '',
        results: {
          products: [],
          orders: [],
          pages: [],
          users: [],
        },
        totalCount: 0,
      })
    }

    const reg = new RegExp(rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const user = req.user
    const role = user.role

    // 1. Match Pages & Navigation
    let allowedPages = []
    if (role === 'admin') {
      const isSuper = req.isSuperAdmin || !user.adminRoleId
      allowedPages = ADMIN_PAGES.filter((p) => {
        if (p.superAdminOnly && !isSuper) return false
        if (isSuper) return true
        if (!p.permission) return true
        return hasPermission(req.adminPermissions, p.permission)
      })
    } else if (role === 'supplier') {
      allowedPages = SUPPLIER_PAGES
    } else {
      allowedPages = USER_PAGES
    }

    const matchingPages = allowedPages
      .filter((p) => {
        if (reg.test(p.title) || reg.test(p.path)) return true
        return p.keywords?.some((k) => reg.test(k))
      })
      .slice(0, 5)
      .map((p) => ({
        id: `page-${p.path}`,
        title: p.title,
        subtitle: `Navigate to ${p.title}`,
        link: p.path,
        type: 'page',
      }))

    // 2. Match Products
    let productQuery = {
      $or: [
        { name: reg },
        { sku: reg },
        { category: reg },
        { brand: reg },
      ],
    }

    if (role === 'supplier') {
      productQuery.supplier = user._id
    } else if (role === 'user') {
      productQuery.status = 'active'
    } else if (role === 'admin') {
      // If admin staff does not have products view permission, omit products
      const isSuper = req.isSuperAdmin || !user.adminRoleId
      if (!isSuper && !hasPermission(req.adminPermissions, 'admin.products.view')) {
        productQuery = null
      }
    }

    let matchingProducts = []
    if (productQuery) {
      const prods = await Product.find(productQuery)
        .limit(6)
        .select('name sku category brand price status photos')
        .lean()

      matchingProducts = prods.map((p) => {
        let link = `/user/products?q=${encodeURIComponent(p.name)}`
        if (role === 'admin') {
          link = `/admin/products?q=${encodeURIComponent(p.sku || p.name)}`
        } else if (role === 'supplier') {
          link = `/supplier/products?q=${encodeURIComponent(p.sku || p.name)}`
        }

        return {
          id: p._id.toString(),
          title: p.name,
          subtitle: `SKU: ${p.sku || 'N/A'} • $${Number(p.price || 0).toFixed(2)}${p.category ? ` • ${p.category}` : ''}`,
          price: p.price,
          sku: p.sku,
          category: p.category,
          status: p.status,
          photo: p.photos?.[0] || null,
          link,
          type: 'product',
        }
      })
    }

    // 3. Match Orders
    let orderQuery = {
      $or: [
        { orderNo: reg },
        { productName: reg },
      ],
    }

    if (role === 'supplier') {
      orderQuery.supplier = user._id
    } else if (role === 'user') {
      orderQuery.user = user._id
    } else if (role === 'admin') {
      const isSuper = req.isSuperAdmin || !user.adminRoleId
      if (!isSuper && !hasPermission(req.adminPermissions, 'admin.orders.view')) {
        orderQuery = null
      }
    }

    let matchingOrders = []
    if (orderQuery) {
      const ords = await Order.find(orderQuery)
        .limit(4)
        .select('orderNo productName total status createdAt')
        .lean()

      matchingOrders = ords.map((o) => {
        let link = `/user/orders`
        if (role === 'admin') link = `/admin/orders`
        else if (role === 'supplier') link = `/supplier/orders`

        return {
          id: o._id.toString(),
          title: `Order #${o.orderNo}`,
          subtitle: `${o.productName ? `${o.productName} • ` : ''}$${Number(o.total || 0).toFixed(2)}`,
          status: o.status,
          link,
          type: 'order',
        }
      })
    }

    // 4. Match Users (Admin only with user/supplier view permissions)
    let matchingUsers = []
    if (role === 'admin') {
      const isSuper = req.isSuperAdmin || !user.adminRoleId
      const canViewUsers = isSuper || hasPermission(req.adminPermissions, 'admin.users.view') || hasPermission(req.adminPermissions, 'admin.suppliers.view')

      if (canViewUsers) {
        const users = await User.find({
          $or: [
            { fullName: reg },
            { email: reg },
          ],
        })
          .limit(4)
          .select('fullName email role status')
          .lean()

        matchingUsers = users.map((u) => {
          let link = '/admin/users'
          if (u.role === 'supplier') link = '/admin/suppliers'
          else if (u.role === 'admin') link = '/admin/users/roles'

          return {
            id: u._id.toString(),
            title: u.fullName || u.email,
            subtitle: `${u.role.toUpperCase()} • ${u.email}`,
            role: u.role,
            status: u.status,
            link,
            type: 'user',
          }
        })
      }
    }

    const totalCount =
      matchingPages.length +
      matchingProducts.length +
      matchingOrders.length +
      matchingUsers.length

    return res.json({
      query: rawQuery,
      results: {
        pages: matchingPages,
        products: matchingProducts,
        orders: matchingOrders,
        users: matchingUsers,
      },
      totalCount,
    })
  } catch (error) {
    console.error('Universal search error:', error)
    return res.status(500).json({ message: error.message || 'Failed to perform search.' })
  }
}
