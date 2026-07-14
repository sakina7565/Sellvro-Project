import { Pencil, Trash2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { COUNTRIES } from '../../lib/mockData.js'

function CountryActions() {
  return (
    <>
      <IconAction icon={Pencil} tone="primary" aria-label="Edit country" />
      <IconAction icon={Trash2} tone="danger" aria-label="Delete country" />
    </>
  )
}

function CountryPage() {
  return (
    <AdminLayout>
      <PageHeader title="Country" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add country</h2>
          <Button type="submit" form="add-country-form" size="sm" className="w-full sm:w-auto">
            Save
          </Button>
        </div>
        <form id="add-country-form" className="max-w-xs" onSubmit={(e) => e.preventDefault()}>
          <Input id="countryName" label="Name *" placeholder="Enter country name" />
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Country</h2>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {COUNTRIES.map((country) => (
                <tr key={country.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{country.name}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <CountryActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {COUNTRIES.map((country) => (
            <MobileCard key={country.id} title={country.name} actions={<CountryActions />} />
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default CountryPage
