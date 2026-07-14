import { Link } from 'react-router-dom'
import { Pencil, Columns3, Info, AlertTriangle, Clock3, Plus } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import FilterBar from '../../components/admin/FilterBar.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { PRODUCTS } from '../../lib/mockData.js'

const FILTERS = [
  { label: 'Category' },
  { label: 'Price' },
  { label: 'Location' },
  { label: 'Product Status' },
]

const TABLE_HEAD = ['Product', 'SKU', 'Category', 'Location', 'Price', 'Stock', 'Supplier', 'Status', 'Action']

function ProductsListPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="Products Listing"
        action={
          <Button as={Link} to="/admin/product/create" size="sm">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <FilterBar filters={FILTERS} />

      <h2 className="mb-3 text-sm font-bold text-slate-900">Products in the marketplace</h2>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="whitespace-nowrap px-5 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product) => (
                <tr key={product.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.sku}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.category}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-400">{product.location}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.price.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.stock}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{product.supplier}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone="pending" icon={Clock3}>
                      {product.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-0.5">
                      <IconAction icon={Pencil} tone="primary" aria-label="Edit product" />
                      <IconAction icon={Columns3} aria-label="View details" />
                      <IconAction icon={Info} tone="info" aria-label="More info" />
                      <IconAction icon={AlertTriangle} tone="warning" aria-label="Flag product" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {PRODUCTS.map((product) => (
            <MobileCard
              key={product.id}
              title={product.name}
              subtitle={product.sku}
              badge={
                <Badge tone="pending" icon={Clock3}>
                  {product.status}
                </Badge>
              }
              actions={
                <>
                  <IconAction icon={Pencil} tone="primary" aria-label="Edit product" />
                  <IconAction icon={Columns3} aria-label="View details" />
                  <IconAction icon={Info} tone="info" aria-label="More info" />
                  <IconAction icon={AlertTriangle} tone="warning" aria-label="Flag product" />
                </>
              }
            >
              <DetailRow label="Category" value={product.category} />
              <DetailRow label="Location" value={product.location} />
              <DetailRow label="Price" value={product.price.toFixed(2)} />
              <DetailRow label="Stock" value={product.stock} />
              <DetailRow label="Supplier" value={product.supplier} full />
            </MobileCard>
          ))}
        </div>

        <Pagination from={1} to={PRODUCTS.length} total={PRODUCTS.length} />
      </Card>
    </AdminLayout>
  )
}

export default ProductsListPage
