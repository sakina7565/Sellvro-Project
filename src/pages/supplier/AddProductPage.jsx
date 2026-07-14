import { useState } from 'react'
import SupplierLayout from '../../components/layout/SupplierLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import ImageUploadSlot from '../../components/admin/ImageUploadSlot.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Switch from '../../components/ui/Switch.jsx'
import Button from '../../components/ui/Button.jsx'

function SupplierAddProductPage() {
  const [isWarehouse, setIsWarehouse] = useState(true)

  return (
    <SupplierLayout>
      <PageHeader eyebrow="Supplier Panel" title="Add Product" />

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex flex-wrap gap-3 lg:flex-col">
          <ImageUploadSlot />
          <ImageUploadSlot />
          <ImageUploadSlot />
          <ImageUploadSlot />
        </div>

        <Card className="flex-1 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Product Information</h2>
            <Switch label="In Warehouse" checked={isWarehouse} onChange={setIsWarehouse} />
          </div>

          <form className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <Input id="productName" label="Product Name *" placeholder="Enter product name" />

            <div>
              <label htmlFor="sku" className="mb-1.5 block text-sm font-medium text-slate-700">
                SKU *
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="sku" placeholder="Auto-generated SKU" containerClassName="flex-1" />
                <Button type="button" size="md" className="shrink-0">
                  Generate
                </Button>
              </div>
            </div>

            <Input id="price" label="Price (USD) *" type="number" placeholder="0.00" />

            <Select id="category" label="Category *" defaultValue="">
              <option value="" disabled>
                Select Category
              </option>
              <option value="mechanical-parts">Mechanical parts</option>
              <option value="shoes">shoes</option>
            </Select>

            <Select id="fulfillBy" label="Fulfill By *" defaultValue="">
              <option value="" disabled>
                Select
              </option>
              <option value="self">Self (Supplier)</option>
              <option value="warehouse">Warehouse</option>
            </Select>

            <Input id="country" label="Country" placeholder="Country" />

            <Input id="brand" label="Brand" placeholder="Enter brand" />

            <Input id="quantity" label="Quantity" type="number" placeholder="Enter quantity" />

            <div className="md:col-span-2">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Enter product description"
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div className="col-span-full flex justify-end">
              <Button type="submit" className="w-full sm:w-auto">
                Save
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </SupplierLayout>
  )
}

export default SupplierAddProductPage
