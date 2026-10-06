import Role from '../models/Role.js'
import User from '../models/User.js'
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  sanitizePermissions,
} from '../constants/permissions.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizePermissions(input) {
  if (Array.isArray(input)) {
    return sanitizePermissions(input)
  }
  if (typeof input === 'string') {
    return sanitizePermissions(input.split(','))
  }
  return []
}

export const listPermissions = async (_req, res) => {
  return res.json({
    groups: PERMISSION_GROUPS,
    keys: ALL_PERMISSION_KEYS,
  })
}

export const listRoles = async (_req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 })
    return res.json({ data: roles.map((role) => role.toSafeObject()) })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load roles.' })
  }
}

export const createRole = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const description = String(req.body.description || '').trim()
    const permissions = normalizePermissions(req.body.permissions)

    if (!name) {
      return res.status(400).json({ message: 'Role name is required.' })
    }

    const existing = await Role.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
    if (existing) {
      return res.status(400).json({ message: 'A role with this name already exists.' })
    }

    const role = await Role.create({
      name,
      description,
      permissions,
      createdBy: req.user._id,
    })

    return res.status(201).json({
      message: 'Role created.',
      role: role.toSafeObject(),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A role with this name already exists.' })
    }
    return res.status(500).json({ message: error.message || 'Failed to create role.' })
  }
}

export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' })
    }

    const name = String(req.body.name ?? role.name).trim()
    const description =
      req.body.description !== undefined
        ? String(req.body.description || '').trim()
        : role.description

    if (!name) {
      return res.status(400).json({ message: 'Role name is required.' })
    }

    const duplicate = await Role.findOne({
      _id: { $ne: role._id },
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    })
    if (duplicate) {
      return res.status(400).json({ message: 'A role with this name already exists.' })
    }

    role.name = name
    role.description = description
    if (req.body.permissions !== undefined) {
      role.permissions = normalizePermissions(req.body.permissions)
    }
    await role.save()

    return res.json({
      message: 'Role updated.',
      role: role.toSafeObject(),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update role.' })
  }
}

export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' })
    }

    const assignedCount = await User.countDocuments({ adminRoleId: role._id })
    if (assignedCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role assigned to ${assignedCount} user(s). Reassign them first.`,
      })
    }

    await role.deleteOne()
    return res.json({ message: 'Role deleted.' })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete role.' })
  }
}
