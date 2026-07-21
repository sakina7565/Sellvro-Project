import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/auth/PublicOnlyRoute.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/admin/DashboardPage.jsx'
import ProductsListPage from './pages/admin/ProductsListPage.jsx'
import AddProductPage from './pages/admin/AddProductPage.jsx'
import AdminSkuReportingPage from './pages/admin/SkuReportingPage.jsx'
import AdminBusinessReportingPage from './pages/admin/BusinessReportingPage.jsx'
import CategoriesPage from './pages/admin/CategoriesPage.jsx'
import AllSuppliersPage from './pages/admin/AllSuppliersPage.jsx'
import PendingSuppliersPage from './pages/admin/PendingSuppliersPage.jsx'
import AllUsersPage from './pages/admin/AllUsersPage.jsx'
import PendingUsersPage from './pages/admin/PendingUsersPage.jsx'
import OrdersPage from './pages/admin/OrdersPage.jsx'
import WalletsRequestsPage from './pages/admin/WalletsRequestsPage.jsx'
import SupplierPayoutsPage from './pages/admin/SupplierPayoutsPage.jsx'
import SupplierDisputesPage from './pages/admin/SupplierDisputesPage.jsx'
import UserComplaintsPage from './pages/admin/UserComplaintsPage.jsx'
import RolesPage from './pages/admin/RolesPage.jsx'
import CreateUserPage from './pages/admin/CreateUserPage.jsx'
import LocationPage from './pages/admin/LocationPage.jsx'
import CountryPage from './pages/admin/CountryPage.jsx'
import SupplierBusinessDetailsPage from './pages/supplier/BusinessDetailsPage.jsx'
import SupplierDashboardPage from './pages/supplier/DashboardPage.jsx'
import SupplierProductsPage from './pages/supplier/ProductsPage.jsx'
import SupplierAddProductPage from './pages/supplier/AddProductPage.jsx'
import SupplierSkuReportingPage from './pages/supplier/SkuReportingPage.jsx'
import SupplierBusinessReportingPage from './pages/supplier/BusinessReportingPage.jsx'
import SupplierViewOrdersPage from './pages/supplier/ViewOrdersPage.jsx'
import SupplierFinancePage from './pages/supplier/FinancePage.jsx'
import UserBusinessDetailsPage from './pages/user/BusinessDetailsPage.jsx'
import UserDashboardPage from './pages/user/DashboardPage.jsx'
import UserProductsPage from './pages/user/ProductsPage.jsx'
import UserOrdersPage from './pages/user/OrdersPage.jsx'
import UserWalletPage from './pages/user/WalletPage.jsx'
import UserSkuReportingPage from './pages/user/SkuReportingPage.jsx'
import UserBusinessReportingPage from './pages/user/BusinessReportingPage.jsx'

function AdminRoute({ children }) {
  return <ProtectedRoute roles={['admin']}>{children}</ProtectedRoute>
}

function SupplierRoute({ children }) {
  return <ProtectedRoute roles={['supplier']}>{children}</ProtectedRoute>
}

function UserRoute({ children }) {
  return <ProtectedRoute roles={['user']}>{children}</ProtectedRoute>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route path="/admin/dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><ProductsListPage /></AdminRoute>} />
      <Route path="/admin/product/create" element={<AdminRoute><AddProductPage /></AdminRoute>} />
      <Route path="/admin/inventory/sku-reporting" element={<AdminRoute><AdminSkuReportingPage /></AdminRoute>} />
      <Route path="/admin/inventory/my-reporting" element={<AdminRoute><AdminBusinessReportingPage /></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
      <Route path="/admin/suppliers" element={<AdminRoute><AllSuppliersPage /></AdminRoute>} />
      <Route path="/admin/suppliers/pending" element={<AdminRoute><PendingSuppliersPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AllUsersPage /></AdminRoute>} />
      <Route path="/admin/users/pending" element={<AdminRoute><PendingUsersPage /></AdminRoute>} />
      <Route path="/admin/sales" element={<AdminRoute><OrdersPage /></AdminRoute>} />
      <Route path="/admin/wallets/requests" element={<AdminRoute><WalletsRequestsPage /></AdminRoute>} />
      <Route path="/admin/supplier/payouts" element={<AdminRoute><SupplierPayoutsPage /></AdminRoute>} />
      <Route path="/admin/supplier/disputes" element={<AdminRoute><SupplierDisputesPage /></AdminRoute>} />
      <Route path="/admin/users/complaines" element={<AdminRoute><UserComplaintsPage /></AdminRoute>} />
      <Route path="/admin/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
      <Route path="/admin/users/roles" element={<AdminRoute><CreateUserPage /></AdminRoute>} />
      <Route path="/admin/location" element={<AdminRoute><LocationPage /></AdminRoute>} />
      <Route path="/admin/country" element={<AdminRoute><CountryPage /></AdminRoute>} />

      <Route
        path="/supplier/business/details"
        element={
          <SupplierRoute>
            <SupplierBusinessDetailsPage />
          </SupplierRoute>
        }
      />
      <Route path="/supplier/dashboard" element={<SupplierRoute><SupplierDashboardPage /></SupplierRoute>} />
      <Route path="/supplier/products" element={<SupplierRoute><SupplierProductsPage /></SupplierRoute>} />
      <Route path="/supplier/product/create" element={<SupplierRoute><SupplierAddProductPage /></SupplierRoute>} />
      <Route path="/supplier/inventory/sku-reporting" element={<SupplierRoute><SupplierSkuReportingPage /></SupplierRoute>} />
      <Route path="/supplier/inventory/my-reporting" element={<SupplierRoute><SupplierBusinessReportingPage /></SupplierRoute>} />
      <Route path="/supplier/sales/details" element={<SupplierRoute><SupplierViewOrdersPage /></SupplierRoute>} />
      <Route path="/supplier/finance/index" element={<SupplierRoute><SupplierFinancePage /></SupplierRoute>} />

      <Route
        path="/user/business/detail"
        element={
          <UserRoute>
            <UserBusinessDetailsPage />
          </UserRoute>
        }
      />
      <Route path="/user/dashboard" element={<UserRoute><UserDashboardPage /></UserRoute>} />
      <Route path="/user/products" element={<UserRoute><UserProductsPage /></UserRoute>} />
      <Route path="/user/inventory/sku-reporting" element={<UserRoute><UserSkuReportingPage /></UserRoute>} />
      <Route path="/user/inventory/my-reporting" element={<UserRoute><UserBusinessReportingPage /></UserRoute>} />
      <Route path="/user/orders" element={<UserRoute><UserOrdersPage /></UserRoute>} />
      <Route path="/user/wallet" element={<UserRoute><UserWalletPage /></UserRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
