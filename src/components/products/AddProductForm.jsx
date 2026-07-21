import {
  Barcode,
  Building2,
  FileText,
  LayoutGrid,
  Save,
  Send,
  Sparkles,
  Tag,
} from 'lucide-react'
import PageHeader from '../admin/PageHeader.jsx'
import AddProductSection from './AddProductSection.jsx'
import ProductPhotoUpload from './ProductPhotoUpload.jsx'
import FormLabel from './FormLabel.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Button from '../ui/Button.jsx'

const FIELD_CLASS =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

const TEXTAREA_CLASS =
  'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
      <span aria-hidden>⏳</span>
      Pending Approval
    </span>
  )
}

/**
 * Shared Add Product form layout — used by admin and supplier panels.
 */
function AddProductForm({ eyebrow, panel = 'supplier', onSubmit, onDraft }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Add Product"
        action={<PendingBadge />}
        className="mb-6"
      />

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AddProductSection step="1" title="Product photos">
          <ProductPhotoUpload />
        </AddProductSection>

        <AddProductSection step="2" title="Product details">
          <div className="flex flex-col gap-4">
            <div>
              <FormLabel icon={Tag} htmlFor="productName" required>
                Product name
              </FormLabel>
              <input
                id="productName"
                type="text"
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FormLabel icon={LayoutGrid} htmlFor="category" required>
                  Category
                </FormLabel>
                <select id="category" className={FIELD_CLASS} defaultValue="">
                  <option value="" disabled>
                    Select category
                  </option>
                  <option value="electronics">Electronics</option>
                  <option value="mechanical-parts">Mechanical parts</option>
                  <option value="shoes">Shoes</option>
                </select>
              </div>
              <div>
                <FormLabel icon={Building2} htmlFor="brand">
                  Brand
                </FormLabel>
                <input id="brand" type="text" placeholder="e.g. Sony" className={FIELD_CLASS} />
              </div>
            </div>

            <div>
              <FormLabel icon={FileText} htmlFor="description">
                Description
              </FormLabel>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe your product — condition, features, what's included..."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div>
              <FormLabel icon={Barcode} htmlFor="sku" required>
                SKU
              </FormLabel>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
                <input
                  id="sku"
                  type="text"
                  placeholder="Auto-generated SKU"
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 border-l border-slate-200 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate
                </button>
              </div>
            </div>

            {panel === 'admin' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input id="price" label="Price (USD) *" type="number" placeholder="0.00" />
                <Select id="supplier" label="Assign to Supplier *" defaultValue="">
                  <option value="" disabled>
                    Select Supplier
                  </option>
                  <option value="user-farhanoa20e">user-farhanOA2OE</option>
                </Select>
                <Select id="location" label="Location *" defaultValue="">
                  <option value="" disabled>
                    Select Location
                  </option>
                  <option value="warehouse-1">Warehouse 1</option>
                  <option value="warehouse-2">Warehouse 2</option>
                </Select>
                <Input id="quantity" label="Quantity" type="number" placeholder="Enter quantity" />
              </div>
            )}

            {panel === 'supplier' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input id="price" label="Price (USD) *" type="number" placeholder="0.00" />
                <Select id="fulfillBy" label="Fulfill By *" defaultValue="">
                  <option value="" disabled>
                    Select
                  </option>
                  <option value="self">Self (Supplier)</option>
                  <option value="warehouse">Warehouse</option>
                </Select>
                <Input id="quantity" label="Quantity" type="number" placeholder="Enter quantity" />
              </div>
            )}
          </div>
        </AddProductSection>

        <AddProductSection step="3" title="Product & specifications">
          <div className="flex flex-col gap-4">
            <div>
              <FormLabel htmlFor="weight">Weight</FormLabel>
              <div className="flex gap-2">
                <input id="weight" type="text" placeholder="0" className={`${FIELD_CLASS} max-w-[120px]`} />
                <select className={`${FIELD_CLASS} max-w-[100px]`} defaultValue="gm">
                  <option value="gm">gm</option>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>

            <div>
              <FormLabel>Dimensions</FormLabel>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="L" className={`${FIELD_CLASS} w-20 sm:w-24`} aria-label="Length" />
                <span className="text-sm text-slate-400">×</span>
                <input type="text" placeholder="W" className={`${FIELD_CLASS} w-20 sm:w-24`} aria-label="Width" />
                <span className="text-sm text-slate-400">×</span>
                <input type="text" placeholder="H" className={`${FIELD_CLASS} w-20 sm:w-24`} aria-label="Height" />
                <select className={`${FIELD_CLASS} w-24`} defaultValue="cm" aria-label="Dimension unit">
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            {panel === 'admin' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input id="barcode" label="Barcode" icon={Barcode} placeholder="Enter barcode" />
                <Input id="commission" label="Commission (%)" placeholder="Enter commission" />
                <Select id="country" label="Country" defaultValue="">
                  <option value="" disabled>
                    Select Country
                  </option>
                  <option value="us">United States</option>
                  <option value="pk">Pakistan</option>
                </Select>
              </div>
            )}
          </div>
        </AddProductSection>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button type="button" variant="outline" className="border border-slate-200 bg-white" onClick={onDraft}>
            <Save className="h-4 w-4" />
            Save as draft
          </Button>
          <Button type="submit">
            <Send className="h-4 w-4" />
            Submit for approval
          </Button>
        </div>
      </form>
    </>
  )
}

export default AddProductForm
