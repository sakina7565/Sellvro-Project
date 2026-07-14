/**
 * Static sample data used to render the Products, Add Product and
 * Categories screens until a real API is wired up.
 */
export const PRODUCTS = [
  {
    id: 1,
    name: 'Savannah Strickland',
    sku: 'EZONE-2GDVOM',
    category: 'Mechanical parts',
    location: '—',
    price: 740.0,
    stock: 388,
    supplier: 'user-farhanOA2OE',
    status: 'Pending',
  },
  {
    id: 2,
    name: 'Ingrid Bartlett',
    sku: 'EZONE-4BML2E',
    category: 'shoes',
    location: '—',
    price: 337.0,
    stock: 622,
    supplier: 'user-farhanOA2OE',
    status: 'Pending',
  },
]

export const ALL_SUPPLIERS = [
  {
    id: 1,
    supplier: 'Fardeen Khan',
    location: '1',
    orders: 0,
    revenue: '$0',
    payout: 'weekly',
    warn: 0,
    joined: 'May 01, 2026',
    status: 'Approved',
  },
  {
    id: 2,
    supplier: 'farhan',
    location: 'Non tenetur vitae be',
    orders: 0,
    revenue: '$0',
    payout: 'weekly',
    warn: 0,
    joined: 'May 20, 2026',
    status: 'Approved',
  },
  {
    id: 3,
    supplier: 'sakina',
    location: 'Pakistan',
    orders: 0,
    revenue: '$0',
    payout: 'weekly',
    warn: 0,
    joined: 'Jun 29, 2026',
    status: 'Approved',
  },
]

export const PENDING_SUPPLIERS = [
  {
    id: 1,
    supplier: 'Xyz',
    email: 'ceo.cglobalpk@gmail.com',
    location: 'Abbott, Pk',
    category: 'electronic',
    paymentProvider: 'Not Set',
    joined: 'May 02, 2026',
    status: 'Pending',
  },
]

export const ALL_USERS = [
  { id: 1, email: 'ajaykumarchouhan004@gmail.com', wallet: '$0', joined: 'Jul 02, 2026', status: 'approved' },
  { id: 2, email: 'sakinauser@gmail.com', wallet: '$0', joined: 'Jul 02, 2026', status: 'approved' },
  { id: 3, email: 'shahrukhgui@gmail.com', wallet: '$1,000', joined: 'May 02, 2026', status: 'suspended' },
  { id: 4, email: 'sharukh@gmail.com', wallet: '$4,815', joined: 'May 20, 2026', status: 'approved' },
  { id: 5, email: 'thestoveclub@gmail.com', wallet: '$0', joined: 'May 02, 2026', status: 'approved' },
]

export const PENDING_USERS = []

export const ORDERS = [
  {
    id: 1,
    orderNo: 'ORD-CYIP4J3WDX',
    user: 'sharuk',
    supplier: 'Super Admin',
    items: 2,
    total: 1480.0,
    commission: 0.0,
    date: 'May 20, 2026',
    status: 'Cancelled',
  },
  {
    id: 2,
    orderNo: 'ORD-XL8VLVFLWI',
    user: 'sharuk',
    supplier: 'Super Admin',
    items: 1,
    total: 337.0,
    commission: 0.0,
    date: 'May 20, 2026',
    status: 'Cancelled',
  },
  {
    id: 3,
    orderNo: 'ORD-6LSQAODZZD',
    user: 'sharuk',
    supplier: 'Super Admin',
    items: 1,
    total: 740.0,
    commission: 0.0,
    date: 'May 20, 2026',
    status: 'Placed',
  },
]

export const WALLET_REQUESTS = [
  { id: 1, user: 'Rockeen Khan', business: 'No Business', email: 'rockeenkhan8125@gmail.com', date: '—', status: 'Approved' },
  { id: 2, user: 'dan', business: 'No Business', email: 'sandgle@gmail.com', date: '—', status: 'Approved' },
  { id: 3, user: 'Rockeen Khan', business: 'No Business', email: 'rockeenkhanheather@gmail.com', date: '—', status: 'Approved' },
  { id: 4, user: 'abdul aziz', business: 'No Business', email: 'aabdulaziz@yahoo.com', date: '—', status: 'Approved' },
  { id: 5, user: 'shahrukh yz', business: 'shahrukh yz mca books', email: 'shahrukhyz@gmail.com', date: 'Mar 05, 2026', status: 'Approved' },
  { id: 6, user: 'Elonda Morgan', business: 'GYS FIN - ISKO AB', email: 'theelonda.m@gmail.com', date: '—', status: 'Approved' },
  { id: 7, user: 'dazzz', business: 'dazz LLP', email: 'dazz@gmail.com', date: 'May 13, 2026', status: 'Approved' },
  { id: 8, user: 'Madison Lamb', business: 'No Business', email: 'madisonl-l6178@gmail.com', date: '—', status: 'Approved' },
  { id: 9, user: 'star', business: 'Full Feed', email: 'abdurrahman@gmail.com', date: '—', status: 'Approved' },
  { id: 10, user: 'Salim', business: 'Fossil Manour', email: 'salimyaseer@gmail.com', date: 'Jul 02, 2026', status: 'New Request' },
]

export const SUPPLIER_PAYOUTS = [
  { id: 1, supplier: 'The Iconic Deals', email: 'iconicdeals@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 2, supplier: 'dan', email: 'sandgle@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 3, supplier: 'Fardeen Khan', email: 'fardeenkhanabc123@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 4, supplier: 'Fardeen Khan', email: 'fardeenkhanxyz@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 5, supplier: 'Rockeen Khan', email: 'rockeenkhan812572@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 6, supplier: 'Fardeen Khan', email: 'fardeenkhan023@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 7, supplier: 'Fardeen Khan', email: 'fardeenkhanheather712@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 8, supplier: 'Fardeen Khan', email: 'fardeenkhanabcgul@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
  { id: 9, supplier: 'sara', email: 'jasidali4@gmail.com', payout: '0.00', held: '0.00', bankDetails: 'Not Set', cardDate: '8.5%', status: 'Pending' },
]

export const USER_COMPLAINTS = []

export const SUPPLIER_DISPUTES = []

export const ROLES = [
  { id: 1, name: 'supplier' },
  { id: 2, name: 'user' },
  { id: 3, name: 'disputes' },
  { id: 4, name: 'finance' },
]

export const SETTINGS_USERS = [
  { id: 1, name: 'Sabina', email: 'sabina.user@gmail.com', role: 'user' },
  { id: 2, name: 'billy', email: 'ejaytechzoharibaig@gmail.com', role: 'user' },
  { id: 3, name: 'sarara', email: 'sabinauser@gmail.com', role: 'supplier' },
  { id: 4, name: 'Madison Lamb', email: 'madisonl-l6178@gmail.com', role: 'user' },
  { id: 5, name: 'sharuk', email: 'sharuk@gmail.com', role: 'user' },
  { id: 6, name: 'Tariah', email: 'tariah@gmail.com', role: 'supplier' },
  { id: 7, name: 'Elonda Morgan', email: 'theelonda.m@gmail.com', role: 'user' },
  { id: 8, name: 'shahrukh yz', email: 'shahrukhyz@gmail.com', role: 'user' },
  { id: 9, name: 'sam Jasarevic', email: 'sam.jasarevic@gmail.com', role: 'supplier' },
  { id: 10, name: 'Fardeen Khan', email: 'fardeenkhan812@gmail.com', role: 'supplier' },
]

export const COUNTRIES = [{ id: 1, name: 'pakistan' }]

export const LOCATIONS = [{ id: 1, name: 'hyderabad', description: 'dsa' }]

export const SUPPLIER_PRODUCTS = []

export const SUPPLIER_ORDERS = []

export const SUPPLIER_TRANSACTIONS = []

export const BUY_PRODUCTS = [
  {
    id: 1,
    name: 'Savannah Strickland',
    price: 740.0,
    category: 'Electronics',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    name: 'Ingrid Bartlett',
    price: 337.0,
    category: 'Smart TV',
    image:
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=600&q=80',
  },
]

export const USER_ORDERS = []

export const USER_WALLET_TRANSACTIONS = []

export const CATEGORIES = [
  {
    id: 1,
    name: 'shoes',
    description: "It's fundamental for shoes building it looks like make up your items and mechanical systems.",
    products: 1,
  },
  {
    id: 2,
    name: 'Mechanical parts',
    description: "It's fundamental for shoes building it looks like make up your items and mechanical systems.",
    products: 1,
  },
]
