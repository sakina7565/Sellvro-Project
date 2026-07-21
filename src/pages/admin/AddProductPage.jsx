import AdminLayout from '../../components/layout/AdminLayout.jsx'
import AddProductForm from '../../components/products/AddProductForm.jsx'

function AddProductPage() {
  return (
    <AdminLayout>
      <AddProductForm eyebrow="Admin Panel" panel="admin" />
    </AdminLayout>
  )
}

export default AddProductPage
