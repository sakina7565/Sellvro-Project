import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function LocationPage() {
  const [locations, setLocations] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadLocations = async () => {
    setError('')
    try {
      const res = await adminApi.locations()
      setLocations(res.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load locations.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a location name.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.createLocation({ name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
      setSuccess('Location added successfully.')
      await loadLocations()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add location.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, locName) => {
    if (!window.confirm(`Delete location "${locName}"?`)) return
    setError('')
    setSuccess('')
    try {
      await adminApi.deleteLocation(id)
      setSuccess('Location deleted.')
      await loadLocations()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete location.'))
    }
  }

  return (
    <AdminLayout>
      <PageHeader title="Location" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add Location</h2>
          <Button type="submit" form="add-location-form" size="sm" className="w-full sm:w-auto" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <form
          id="add-location-form"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <Input
            id="locationName"
            label="Name *"
            placeholder="Enter location name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="locationDetails"
            label="Details"
            placeholder="Enter details"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        )}
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Location</h2>

      <Card className="overflow-hidden shadow-soft">
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
              {!loading && locations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-500">
                    No locations added yet. Add one above.
                  </td>
                </tr>
              )}
              {locations.map((location) => (
                <tr key={location.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800 capitalize">{location.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{location.description || '—'}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction
                        icon={Trash2}
                        tone="danger"
                        aria-label="Delete location"
                        onClick={() => handleDelete(location.id, location.name)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {!loading && locations.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No locations added yet.</p>
          )}
          {locations.map((location) => (
            <MobileCard
              key={location.id}
              title={location.name}
              actions={
                <IconAction
                  icon={Trash2}
                  tone="danger"
                  aria-label="Delete location"
                  onClick={() => handleDelete(location.id, location.name)}
                />
              }
            >
              <DetailRow label="Description" value={location.description || '—'} full />
            </MobileCard>
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default LocationPage
