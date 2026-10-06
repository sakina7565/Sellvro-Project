import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import MobileCard from '../../components/admin/MobileCard.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconAction from '../../components/ui/IconAction.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'
import { PERMISSION_GROUPS, getPermissionLabel, isSuperAdmin } from '../../lib/permissions.js'
import { useAuth } from '../../context/AuthContext.jsx'



function PermissionPicker({ selected, onChange, disabled = false }) {

  const [expandedGroups, setExpandedGroups] = useState(() =>

    Object.fromEntries(PERMISSION_GROUPS.map((group) => [group.id, true])),

  )



  const selectedSet = useMemo(() => new Set(selected), [selected])



  const togglePermission = (key) => {

    if (disabled) return

    if (selectedSet.has(key)) {

      onChange(selected.filter((item) => item !== key))

    } else {

      onChange([...selected, key])

    }

  }



  const setGroupPermissions = (group, checked) => {

    const keys = group.modules.flatMap((module) => module.permissions.map((item) => item.key))

    if (checked) {

      onChange([...new Set([...selected, ...keys])])

    } else {

      const remove = new Set(keys)

      onChange(selected.filter((key) => !remove.has(key)))

    }

  }



  const setModulePermissions = (module, checked) => {

    const keys = module.permissions.map((item) => item.key)

    if (checked) {

      onChange([...new Set([...selected, ...keys])])

    } else {

      const remove = new Set(keys)

      onChange(selected.filter((key) => !remove.has(key)))

    }

  }



  const toggleGroupExpanded = (groupId) => {

    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))

  }



  const allKeys = useMemo(
    () =>
      PERMISSION_GROUPS.flatMap((group) =>
        group.modules.flatMap((module) => module.permissions.map((item) => item.key)),
      ),
    [],
  )

  const selectAll = () => {
    if (disabled) return
    onChange(allKeys)
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <span className="text-xs font-bold text-slate-800">Quick Selection:</span>
          <span className="ml-2 text-xs text-slate-500">
            {selected.length} of {allKeys.length} permissions active
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={selectAll}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-600 disabled:opacity-50 cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={clearAll}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      {PERMISSION_GROUPS.map((group) => {

        const groupKeys = group.modules.flatMap((module) => module.permissions.map((item) => item.key))

        const groupSelectedCount = groupKeys.filter((key) => selectedSet.has(key)).length

        const isExpanded = expandedGroups[group.id]



        return (

          <div key={group.id} className="rounded-xl border border-slate-100 bg-slate-50/50">

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">

              <button

                type="button"

                onClick={() => toggleGroupExpanded(group.id)}

                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"

              >

                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}

                {group.label}

                <span className="text-xs font-medium text-slate-400">

                  ({groupSelectedCount}/{groupKeys.length})

                </span>

              </button>

              <div className="flex gap-2">

                <button

                  type="button"

                  disabled={disabled}

                  onClick={() => setGroupPermissions(group, true)}

                  className="rounded-md border border-primary-200 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-50 disabled:opacity-50"

                >

                  Select all

                </button>

                <button

                  type="button"

                  disabled={disabled}

                  onClick={() => setGroupPermissions(group, false)}

                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-white disabled:opacity-50"

                >

                  Deselect all

                </button>

              </div>

            </div>



            {isExpanded && (

              <div className="space-y-4 p-4">

                {group.modules.map((module) => (

                  <div key={module.id}>

                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">

                        {module.label}

                      </p>

                      <div className="flex gap-2">

                        <button

                          type="button"

                          disabled={disabled}

                          onClick={() => setModulePermissions(module, true)}

                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"

                        >

                          All

                        </button>

                        <button

                          type="button"

                          disabled={disabled}

                          onClick={() => setModulePermissions(module, false)}

                          className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-50"

                        >

                          None

                        </button>

                      </div>

                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">

                      {module.permissions.map((permission) => (

                        <Checkbox

                          key={permission.key}

                          id={`perm-${permission.key}`}

                          label={permission.label}

                          checked={selectedSet.has(permission.key)}

                          disabled={disabled}

                          onChange={() => togglePermission(permission.key)}

                          className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm"

                        />

                      ))}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        )

      })}

    </div>

  )

}



function RolesPage() {
  const { user } = useAuth()
  const isSuper = isSuperAdmin(user)

  const [roles, setRoles] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [permissions, setPermissions] = useState([])

  const [editingId, setEditingId] = useState(null)

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)



  const loadRoles = async () => {

    setError('')

    try {

      const data = await adminApi.roles()

      setRoles(data.data || [])

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to load roles.'))

    } finally {

      setLoading(false)

    }

  }



  useEffect(() => {

    loadRoles()

  }, [])



  const resetForm = () => {

    setName('')

    setDescription('')

    setPermissions([])

    setEditingId(null)

    setShowForm(false)

  }



  const openCreateForm = () => {

    resetForm()

    setShowForm(true)

    setSuccess('')

    setError('')

  }



  const handleSubmit = async (event) => {

    event.preventDefault()

    setError('')

    setSuccess('')

    if (!name.trim()) {
      setError('Role name is required.')
      return
    }

    if (!permissions || permissions.length === 0) {
      setError('Please select at least one permission. A role cannot be created without permissions.')
      return
    }



    setSaving(true)

    try {

      const payload = {

        name: name.trim(),

        description: description.trim(),

        permissions,

      }



      if (editingId) {

        await adminApi.updateRole(editingId, payload)

        setSuccess('Role updated.')

      } else {

        await adminApi.createRole(payload)

        setSuccess('Role created.')

      }

      resetForm()

      await loadRoles()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to save role.'))

    } finally {

      setSaving(false)

    }

  }



  const handleEdit = (role) => {

    setEditingId(role.id)

    setName(role.name)

    setDescription(role.description || '')

    setPermissions(role.permissions || [])

    setShowForm(true)

    setSuccess('')

    setError('')

    window.scrollTo({ top: 0, behavior: 'smooth' })

  }



  const handleDelete = async (id) => {

    if (!window.confirm('Delete this role? Users assigned to it will lose their permissions.')) return

    setError('')

    setSuccess('')

    try {

      await adminApi.deleteRole(id)

      setSuccess('Role deleted.')

      if (editingId === id) resetForm()

      await loadRoles()

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to delete role.'))

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
            Roles and permissions configuration is restricted exclusively to Super Administrators.
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

        title="Roles"

        action={

          !showForm ? (

            <Button type="button" size="sm" onClick={openCreateForm}>

              Create Role

            </Button>

          ) : null

        }

      />



      {showForm && (

        <Card className="mb-6 p-5 shadow-soft">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <h2 className="text-sm font-bold text-slate-900">

              {editingId ? 'Edit Role' : 'Create Role'}

            </h2>

            <div className="flex w-full gap-2 sm:w-auto">

              <Button type="submit" form="role-form" size="sm" className="w-full sm:w-auto" disabled={saving}>

                {saving ? 'Saving…' : editingId ? 'Update Role' : 'Save Role'}

              </Button>

              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={resetForm}>

                Cancel

              </Button>

            </div>

          </div>



          <form id="role-form" className="space-y-5" onSubmit={handleSubmit}>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input

                id="roleName"

                label="Name *"

                placeholder="e.g. Finance Manager"

                value={name}

                onChange={(e) => setName(e.target.value)}

              />

              <Input

                id="roleDescription"

                label="Description"

                placeholder="Short description of this role"

                value={description}

                onChange={(e) => setDescription(e.target.value)}

              />

            </div>



            <div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Permissions <span className="text-rose-500">*</span>
                  </h3>
                  {permissions.length === 0 && (
                    <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                      At least 1 required
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">

                  {permissions.length} of {PERMISSION_GROUPS.flatMap((g) => g.modules.flatMap((m) => m.permissions)).length} selected

                </p>

              </div>

              <PermissionPicker selected={permissions} onChange={setPermissions} disabled={saving} />

            </div>

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

      )}



      {!showForm && (error || success) && (

        <div className="mb-4">

          {error && (

            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">

              {error}

            </p>

          )}

          {success && (

            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">

              {success}

            </p>

          )}

        </div>

      )}



      <h2 className="mb-3 text-sm font-bold text-slate-900">Manage Roles</h2>



      <Card className="overflow-hidden shadow-soft">

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full text-left text-sm">

            <thead>

              <tr className="border-b border-slate-100 text-xs text-slate-400">

                <th className="whitespace-nowrap px-5 py-3 font-medium">Name</th>

                <th className="whitespace-nowrap px-5 py-3 font-medium">Description</th>

                <th className="whitespace-nowrap px-5 py-3 font-medium">Permissions</th>

                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>

              </tr>

            </thead>

            <tbody>

              {loading && (

                <tr>

                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">

                    Loading roles…

                  </td>

                </tr>

              )}

              {!loading && roles.length === 0 && (

                <tr>

                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">

                    No roles yet. Click &quot;Create Role&quot; to add one.

                  </td>

                </tr>

              )}

              {roles.map((role) => (

                <tr key={role.id} className="border-b border-slate-50 last:border-0">

                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{role.name}</td>

                  <td className="max-w-xs truncate px-5 py-4 text-slate-500">

                    {role.description || '—'}

                  </td>

                  <td className="px-5 py-4">

                    <Badge tone="solid">{(role.permissions || []).length} permissions</Badge>

                    {(role.permissions || []).length > 0 && (

                      <p className="mt-1 max-w-md truncate text-xs text-slate-400" title={(role.permissions || []).map(getPermissionLabel).join(', ')}>

                        {(role.permissions || []).slice(0, 3).map(getPermissionLabel).join(', ')}

                        {(role.permissions || []).length > 3 ? '…' : ''}

                      </p>

                    )}

                  </td>

                  <td className="whitespace-nowrap px-5 py-4">

                    <div className="flex items-center justify-end gap-2">

                      <IconAction

                        icon={Pencil}

                        tone="primary"

                        aria-label="Edit role"

                        onClick={() => handleEdit(role)}

                      />

                      <IconAction

                        icon={Trash2}

                        tone="danger"

                        aria-label="Delete role"

                        onClick={() => handleDelete(role.id)}

                      />

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>



        <div className="divide-y divide-slate-100 md:hidden">

          {!loading && roles.length === 0 && (

            <p className="px-5 py-8 text-center text-sm text-slate-500">

              No roles yet. Click &quot;Create Role&quot; to add one.

            </p>

          )}

          {roles.map((role) => (

            <MobileCard

              key={role.id}

              title={role.name}

              subtitle={role.description || 'No description'}

              badge={<Badge tone="solid">{(role.permissions || []).length} permissions</Badge>}

              actions={

                <>

                  <IconAction

                    icon={Pencil}

                    tone="primary"

                    aria-label="Edit role"

                    onClick={() => handleEdit(role)}

                  />

                  <IconAction

                    icon={Trash2}

                    tone="danger"

                    aria-label="Delete role"

                    onClick={() => handleDelete(role.id)}

                  />

                </>

              }

            />

          ))}

        </div>

      </Card>

    </AdminLayout>

  )

}



export default RolesPage

