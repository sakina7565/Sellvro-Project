import { Pencil, Trash2 } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import Pagination from '../../components/admin/Pagination.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import DetailRow from '../../components/admin/DetailRow.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import { SETTINGS_USERS } from '../../lib/mockData.js'

function UserRowActions() {
  return (
    <>
      <IconAction icon={Pencil} tone="primary" aria-label="Edit user" />
      <IconAction icon={Trash2} tone="danger" aria-label="Delete user" />
    </>
  )
}

function CreateUserPage() {
  return (
    <AdminLayout>
      <PageHeader title="Users" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add User</h2>
          <Button type="submit" form="add-user-form" size="sm" className="w-full sm:w-auto">
            Save
          </Button>
        </div>
        <form id="add-user-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <Input id="userName" label="Name *" placeholder="Enter name" />
          <Input id="userEmail" label="Email *" type="email" placeholder="Enter email" />
          <Input id="userPassword" label="Password" type="password" placeholder="Enter password" />
          <Select id="userRole" label="Role *" defaultValue="">
            <option value="" disabled>
              Select Role
            </option>
            <option value="user">user</option>
            <option value="supplier">supplier</option>
          </Select>
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Users</h2>

      <Card className="overflow-hidden shadow-soft">
        {/* Desktop / tablet: full data table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Email</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Role</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SETTINGS_USERS.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.email}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone="solid">{user.role}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <UserRowActions />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scrolling needed */}
        <div className="divide-y divide-slate-100 md:hidden">
          {SETTINGS_USERS.map((user) => (
            <MobileCard
              key={user.id}
              title={user.name}
              subtitle={user.email}
              badge={<Badge tone="solid">{user.role}</Badge>}
              actions={<UserRowActions />}
            >
              <DetailRow label="Role" value={user.role} full />
            </MobileCard>
          ))}
        </div>

        <Pagination from={1} to={SETTINGS_USERS.length} total={33} resultsLabel="results" page={1} pages={[1, 2, 3, 4]} />
      </Card>
    </AdminLayout>
  )
}

export default CreateUserPage
