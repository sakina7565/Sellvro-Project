import AdminAuditLog from '../models/AdminAuditLog.js'

export async function logAdminAction({ adminId, action, targetType, targetId, details = {}, ip = '' }) {
  try {
    if (!adminId || !action) return null
    return await AdminAuditLog.create({
      adminId,
      action,
      targetType,
      targetId: targetId ? String(targetId) : '',
      details,
      ipAddress: ip,
    })
  } catch (err) {
    console.error('[AdminAuditLog] Failed to log admin action:', err.message)
    return null
  }
}

export default logAdminAction
