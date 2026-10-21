import mongoose from 'mongoose'
import Notification from '../models/Notification.js'
import AdminNotification from '../models/AdminNotification.js'

export const listMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id
    const userRole = req.user.role

    // Fetch user/role targeted notifications
    const query = {
      $or: [
        { recipient: userId },
        { targetRole: userRole, recipient: null },
        { targetRole: 'all', recipient: null },
      ],
    }

    let notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)

    // If completely empty for this user, seed real initial notifications in the DB
    if (notifications.length === 0) {
      try {
        const initialNotice = await Notification.create({
          recipient: userId,
          targetRole: userRole,
          type: 'system',
          title: 'Welcome to Sellvro',
          message: `Welcome aboard ${req.user.fullName || 'User'}! Your ${
            userRole === 'supplier'
              ? 'Supplier'
              : userRole === 'admin'
                ? 'Administrator'
                : 'Customer'
          } account is active.`,
          link:
            userRole === 'supplier'
              ? '/supplier/dashboard'
              : userRole === 'admin'
                ? '/admin/dashboard'
                : '/user/dashboard',
          isRead: false,
        })
        notifications = [initialNotice]
      } catch (seedErr) {
        console.error('Seed notification notice error:', seedErr)
      }
    }

    let adminAlerts = []
    // If user is Admin, also merge AdminNotification security alerts
    if (userRole === 'admin') {
      const adminNotifs = await AdminNotification.find()
        .sort({ createdAt: -1 })
        .limit(25)

      adminAlerts = adminNotifs.map((n) => ({
        id: n._id.toString(),
        type: n.type || 'security',
        title: n.title,
        message: n.message,
        link: '/admin/accounts',
        isRead: n.readBy?.some((uid) => uid.toString() === userId.toString()) || false,
        createdAt: n.createdAt,
      }))
    }

    const regularList = notifications.map((n) => {
      const isReadByUser =
        n.isRead || n.readBy?.some((uid) => uid.toString() === userId.toString()) || false
      return {
        id: n._id.toString(),
        type: n.type || 'system',
        title: n.title,
        message: n.message,
        link: n.link || '',
        isRead: isReadByUser,
        createdAt: n.createdAt,
      }
    })

    // Combine and sort by createdAt descending
    const combined = [...adminAlerts, ...regularList].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )

    const unreadCount = combined.filter((n) => !n.isRead).length

    return res.json({
      data: combined,
      unreadCount,
    })
  } catch (error) {
    console.error('List notifications error:', error)
    return res.status(500).json({ message: error.message || 'Failed to load notifications.' })
  }
}

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    if (mongoose.isValidObjectId(id)) {
      await Promise.all([
        Notification.findByIdAndUpdate(id, {
          $addToSet: { readBy: userId },
          $set: { isRead: true },
        }),
        AdminNotification.findByIdAndUpdate(id, {
          $addToSet: { readBy: userId },
        }),
      ])
    }

    return res.json({ message: 'Notification marked as read.' })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return res.status(500).json({ message: error.message || 'Failed to update notification.' })
  }
}

export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id
    const userRole = req.user.role

    await Promise.all([
      Notification.updateMany(
        {
          $or: [
            { recipient: userId },
            { targetRole: userRole },
            { targetRole: 'all' },
          ],
        },
        {
          $addToSet: { readBy: userId },
          $set: { isRead: true },
        },
      ),
      AdminNotification.updateMany(
        {},
        {
          $addToSet: { readBy: userId },
        },
      ),
    ])

    return res.json({ message: 'All notifications marked as read.' })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    return res.status(500).json({ message: error.message || 'Failed to mark notifications read.' })
  }
}
