import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
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
import { adminApi, getErrorMessage } from '../../lib/api.js'
import { isSuperAdmin } from '../../lib/permissions.js'
import { useAuth } from '../../context/AuthContext.jsx'

function CreateUserPage() {
  const { user: currentUser } = useAuth()
  const isSuper = isSuperAdmin(currentUser)

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminRoleId, setAdminRoleId] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setError('')
    try {
      const [usersRes, rolesRes] = await Promise.all([adminApi.adminUsers(), adminApi.roles()])
      setUsers(usersRes.data || [])
      setRoles(rolesRes.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load admin users.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setAdminRoleId('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.')
      return
    }

    if (!canCreateSuperAdmin && !adminRoleId) {
      setError('Please select a role for the new admin user.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      }
      if (adminRoleId) payload.adminRoleId = adminRoleId

      await adminApi.createAdminUser(payload)
      setSuccess('Admin user created.')
      resetForm()
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create admin user.'))
    } finally {
      setSaving(false)
    }
  }

  if (!isSuper) {
    return (
      <AdminLayout>
        <Card className="mx-auto mt-12 max-w-lg p-8 text-center shadow-soft">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Staff and administrator account creation is restricted exclusively to Super Administrators.
          </p>
          <div className="mt-6">
            <Button as={Link} to="/admin/dashboard" size="sm">
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader title="Users" />

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Add Admin User</h2>
          <Button
            type="submit"
            form="add-user-form"
            size="sm"
            className="w-full sm:w-auto"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <form
          id="add-user-form"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={handleSubmit}
        >
          <Input
            id="userName"
            label="Name *"
            placeholder="Enter name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            id="userEmail"
            label="Email *"
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="userPassword"
            label="Password *"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Select
            id="userRole"
            label="Admin Role *"
            value={adminRoleId}
            onChange={(e) => setAdminRoleId(e.target.value)}
          >
            {canCreateSuperAdmin && (
              <option value="">Super Admin (full access)</option>
            )}
            {!canCreateSuperAdmin && (
              <option value="" disabled>
                Select role
              </option>
            )}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </form>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}
      </Card>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Admin Users</h2>

      <Card className="overflow-hidden shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Email</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Role</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading admin users…
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                    No admin users yet.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.email}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge tone="solid">{user.roleLabel}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{user.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {loading && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Loading admin users…</p>
          )}
          {!loading && users.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No admin users yet.</p>
          )}
          {users.map((user) => (
            <MobileCard
              key={user.id}
              title={user.name}
              subtitle={user.email}
              badge={<Badge tone="solid">{user.roleLabel}</Badge>}
            >
              <DetailRow label="Joined" value={user.joined} full />
            </MobileCard>
          ))}
        </div>

        {!loading && users.length > 0 && (
          <Pagination
            from={1}
            to={users.length}
            total={users.length}
            resultsLabel="results"
            page={1}
            pages={[1]}
          />
        )}
      </Card>
    </AdminLayout>
  )
}

export default CreateUserPage
