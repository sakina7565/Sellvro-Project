import AdminLayout from '../../components/layout/AdminLayout.jsx'
import SkuReportingContent from '../../components/products/SkuReportingContent.jsx'

function AdminSupplierSkuLookupPage() {
  return (
    <AdminLayout>
      <SkuReportingContent panel="admin" defaultMode="supplier" />
    </AdminLayout>
  )
}

export default AdminSupplierSkuLookupPage
