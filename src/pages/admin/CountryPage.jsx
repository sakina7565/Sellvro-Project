import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function CountryPage() {
  const [countries, setCountries] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCountries = async () => {
    setError('')
    try {
      const res = await adminApi.countries()
      setCountries(res.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load countries.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCountries()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a country name.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.createCountry({ name: name.trim() })
      setName('')
      setSuccess('Country added successfully.')
      await loadCountries()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add country.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, countryName) => {
    if (!window.confirm(`Delete country "${countryName}"?`)) return
    setError('')
    setSuccess('')
    try {
      await adminApi.deleteCountry(id)
      setSuccess('Country deleted.')
      await loadCountries()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete country.'))
    }
  }

  return (
    <AdminLayout>
      <PageHeader title="Country" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add country</h2>
          <Button type="submit" form="add-country-form" size="sm" className="w-full sm:w-auto" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <form id="add-country-form" className="max-w-xs" onSubmit={handleSubmit}>
          <Input
            id="countryName"
            label="Name *"
            placeholder="Enter country name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </form>
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        )}
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Country</h2>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && countries.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-10 text-center text-sm text-slate-500">
                    No countries added yet. Add one above.
                  </td>
                </tr>
              )}
              {countries.map((country) => (
                <tr key={country.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800 capitalize">{country.name}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction
                        icon={Trash2}
                        tone="danger"
                        aria-label="Delete country"
                        onClick={() => handleDelete(country.id, country.name)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {!loading && countries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No countries added yet.</p>
          )}
          {countries.map((country) => (
            <MobileCard
              key={country.id}
              title={country.name}
              actions={
                <IconAction
                  icon={Trash2}
                  tone="danger"
                  aria-label="Delete country"
                  onClick={() => handleDelete(country.id, country.name)}
                />
              }
            />
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default CountryPage
