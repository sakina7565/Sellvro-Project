import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import AddProductForm from '../../components/products/AddProductForm.jsx'

function SupplierAddProductPage() {
  return (
    <SupplierLayout>
      <AddProductForm eyebrow="Supplier Panel" panel="supplier" />
    </SupplierLayout>
  )
}

export default SupplierAddProductPage
