import { Pencil, Trash2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { LOCATIONS } from '../../lib/mockData.js'

function LocationActions() {
  return (
    <>
      <IconAction icon={Pencil} tone="primary" aria-label="Edit location" />
      <IconAction icon={Trash2} tone="danger" aria-label="Delete location" />
    </>
  )
}

function LocationPage() {
  return (
    <AdminLayout>
      <PageHeader title="Location" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add Location</h2>
          <Button type="submit" form="add-location-form" size="sm" className="w-full sm:w-auto">
            Save
          </Button>
        </div>
        <form
          id="add-location-form"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input id="locationName" label="Name *" placeholder="Enter location name" />
          <Input id="locationDetails" label="Details" placeholder="Enter details" />
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Location</h2>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Description</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {LOCATIONS.map((location) => (
                <tr key={location.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{location.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{location.description}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <LocationActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {LOCATIONS.map((location) => (
            <MobileCard key={location.id} title={location.name} actions={<LocationActions />}>
              <DetailRow label="Description" value={location.description} full />
            </MobileCard>
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default LocationPage
