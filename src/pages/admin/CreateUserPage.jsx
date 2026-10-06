import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react'
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
  const canCreateSuperAdmin = isSuper

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminRoleId, setAdminRoleId] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (!adminRoleId) {
      setError('Please select a role (Super Admin or Sub-Admin role).')
      return
    }

    setSaving(true)
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      }
      if (adminRoleId && adminRoleId !== 'super_admin') {
        payload.adminRoleId = adminRoleId
      }

      await adminApi.createAdminUser(payload)
      setSuccess('Admin / Sub-Admin user created successfully. They can now log in at /admin/login.')
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
      <PageHeader
        title="Create User"
        description="Register Super Admin & Sub-Admin (Staff) accounts with custom permissions"
      />

      {/* Info notice about role restriction */}
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-800">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <div>
            <p className="font-semibold text-sky-900">Admin & Sub-Admin Registration Only</p>
            <p className="mt-0.5 leading-relaxed text-sky-700">
              This form is strictly for creating <strong>Super Administrators</strong> and{' '}
              <strong>Sub-Admins (Staff Members)</strong> with predefined roles and permissions. Regular{' '}
              <strong>Users (Buyers)</strong> and <strong>Suppliers</strong> register their own accounts
              directly via the public portal.
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-900">Register Admin / Sub-Admin User</h2>
          </div>
          <Button
            type="submit"
            form="add-user-form"
            size="sm"
            className="w-full sm:w-auto"
            disabled={saving}
          >
            {saving ? 'Creating…' : 'Create Account'}
          </Button>
        </div>
        <form
          id="add-user-form"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={handleSubmit}
        >
          <Input
            id="userName"
            label="Full Name *"
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            id="userEmail"
            label="Email Address *"
            type="email"
            placeholder="admin@sellvro.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              id="userPassword"
              label="Password (min 6 chars) *"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Select
            id="userRole"
            label="Role & Permissions *"
            value={adminRoleId}
            onChange={(e) => setAdminRoleId(e.target.value)}
            required
          >
            <option value="" disabled>
              -- Select Role --
            </option>
            {canCreateSuperAdmin && (
              <option value="super_admin">Super Admin (Full Access)</option>
            )}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                Sub-Admin: {role.name}
              </option>
            ))}
          </Select>
        </form>

        {roles.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Tip: You can create custom staff roles (like Finance Manager, Catalog Manager) in{' '}
            <Link to="/admin/roles" className="font-semibold text-primary hover:underline">
              Settings → Roles
            </Link>
            .
          </p>
        )}

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
                    <Badge tone={user.roleLabel === 'Super Admin' ? 'solid' : 'warning'}>
                      {user.roleLabel}
                    </Badge>
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
              badge={
                <Badge tone={user.roleLabel === 'Super Admin' ? 'solid' : 'warning'}>
                  {user.roleLabel}
                </Badge>
              }
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
