import Notification from '../models/Notification.js'

/**
 * Creates a notification in the database.
 * Silently logs errors if notification creation fails so main application flows are not interrupted.
 */
export async function createNotification({
  recipient = null,
  targetRole = 'all',
  type = 'system',
  title,
  message,
  link = '',
  metadata = {},
}) {
  try {
    const notice = await Notification.create({
      recipient,
      targetRole,
      type,
      title,
      message,
      link,
      metadata,
    })
    return notice
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message)
    return null
  }
}
