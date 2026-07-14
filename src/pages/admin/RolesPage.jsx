import { Pencil } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { ROLES } from '../../lib/mockData.js'

function RoleActions() {
  return (
    <>
      <IconAction icon={Pencil} tone="primary" aria-label="Edit role" />
      <button
        type="button"
        className="rounded-md border border-primary-200 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-50"
      >
        Permissions
      </button>
    </>
  )
}

function RolesPage() {
  return (
    <AdminLayout>
      <PageHeader title="Roles" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add Role</h2>
          <Button type="submit" form="add-role-form" size="sm" className="w-full sm:w-auto">
            Save
          </Button>
        </div>
        <form id="add-role-form" className="max-w-xs" onSubmit={(e) => e.preventDefault()}>
          <Input id="roleName" label="Name *" placeholder="Enter role name" />
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Roles</h2>

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
              {ROLES.map((role) => (
                <tr key={role.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{role.name}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <RoleActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {ROLES.map((role) => (
            <MobileCard key={role.id} title={role.name} actions={<RoleActions />} />
          ))}
        </div>
      </Card>
    </AdminLayout>
  )
}

export default RolesPage
