import mongoose from 'mongoose'

export const CHAT_WINDOW_MS = 24 * 60 * 60 * 1000

const disputeMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
)

const disputeSchema = new mongoose.Schema(
  {
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    againstRole: {
      type: String,
      enum: ['supplier', 'user', 'admin', 'platform'],
      required: true,
    },
    againstUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    type: {
      type: String,
      enum: ['user_complaint', 'supplier_dispute', 'other'],
      default: 'other',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected'],
      default: 'open',
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: '',
    },
    messages: {
      type: [disputeMessageSchema],
      default: [],
    },
    chatWindowExpiresAt: {
      type: Date,
      default: null,
    },
    readBy: {
      type: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          readAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
)

function userIdString(value) {
  return value?._id?.toString?.() || value?.toString?.() || ''
}

function getLastReadAt(doc, viewerId) {
  if (!viewerId) return 0
  const vid = userIdString(viewerId)
  const entry = (doc.readBy || []).find((item) => userIdString(item.user) === vid)
  return entry?.readAt ? new Date(entry.readAt).getTime() : 0
}

function getUnreadCountForUser(doc, viewerId) {
  if (!viewerId) return 0
  const vid = userIdString(viewerId)
  const lastRead = getLastReadAt(doc, viewerId)
  const messages = doc.messages || []
  return messages.filter((item) => {
    const senderId = userIdString(item.sender)
    if (!senderId || senderId === vid) return false
    return new Date(item.createdAt).getTime() > lastRead
  }).length
}

function getLatestMessage(doc) {
  const messages = doc.messages || []
  if (messages.length > 0) {
    return messages[messages.length - 1]
  }
  if (doc.message) {
    return {
      _id: 'initial',
      sender: doc.raisedBy,
      text: doc.message,
      role: doc.raisedBy?.role || 'user',
      createdAt: doc.createdAt,
    }
  }
  return null
}

function getChatExpiresAt(doc) {
  if (doc.chatWindowExpiresAt) return new Date(doc.chatWindowExpiresAt)
  const base = doc.createdAt || new Date()
  return new Date(base.getTime() + CHAT_WINDOW_MS)
}

function isChatActive(doc) {
  if (doc.status === 'resolved' || doc.status === 'rejected') return false
  return Date.now() < getChatExpiresAt(doc).getTime()
}

function filterRecentMessages(messages = []) {
  const cutoff = Date.now() - CHAT_WINDOW_MS
  return messages.filter((item) => new Date(item.createdAt).getTime() >= cutoff)
}

function formatMessage(item) {
  const sender = item.sender
  return {
    id: item._id?.toString?.() || '',
    senderId: sender?._id?.toString?.() || sender?.toString?.() || '',
    senderName: sender?.fullName || 'Staff',
    role: item.role,
    text: item.text,
    createdAt: item.createdAt,
  }
}

function formatRoleLabel(role) {
  if (!role) return ''
  const labels = {
    user: 'User',
    supplier: 'Supplier',
    admin: 'Admin',
    platform: 'Platform Admin',
  }
  return labels[role] || role.charAt(0).toUpperCase() + role.slice(1)
}

function formatPartyLabel(name, role) {
  if (!name || name === '—') return formatRoleLabel(role) || '—'
  const roleLabel = formatRoleLabel(role)
  return roleLabel ? `${name} (${roleLabel})` : name
}

function formatAgainstLabel(against, againstRole) {
  if (against?.fullName) {
    return formatPartyLabel(against.fullName, against.role || againstRole)
  }
  if (againstRole === 'admin' || againstRole === 'platform') {
    return 'Platform Admin'
  }
  return formatRoleLabel(againstRole) || '—'
}

disputeSchema.methods.toSafeObject = function toSafeObject(options = {}) {
  const { includeMessages = false, viewerId = null } = options
  const raised = this.raisedBy
  const against = this.againstUser
  const orderDoc = this.order
  const productDoc = this.product
  const chatExpiresAt = getChatExpiresAt(this)
  const chatActive = isChatActive(this)

  const fromName = raised?.fullName || '—'
  const fromRole = raised?.role || ''
  const toName =
    against?.fullName ||
    (this.againstRole === 'admin' || this.againstRole === 'platform' ? 'Platform Admin' : '—')
  const toRole = against?.role || this.againstRole || ''
  const fromLabel = formatPartyLabel(fromName, fromRole)
  const toLabel = formatAgainstLabel(against, this.againstRole)

  const base = {
    id: this._id.toString(),
    from: fromName,
    fromId: raised?._id?.toString?.() || raised?.toString?.() || '',
    fromRole,
    fromLabel,
    to: toName,
    toId: against?._id?.toString?.() || against?.toString?.() || '',
    toRole,
    toLabel,
    againstRole: this.againstRole,
    raisedBy: {
      id: raised?._id?.toString?.() || raised?.toString?.() || '',
      name: fromName,
      email: raised?.email || '',
      role: fromRole,
      label: fromLabel,
    },
    against: {
      id: against?._id?.toString?.() || against?.toString?.() || '',
      name: toName,
      email: against?.email || '',
      role: toRole,
      label: toLabel,
    },
    partySummary: `${fromLabel} → complained against → ${toLabel}`,
    order: orderDoc?.orderNo || (orderDoc?._id ? orderDoc._id.toString() : '—'),
    orderId: orderDoc?._id?.toString?.() || orderDoc?.toString?.() || '',
    orderNo: orderDoc?.orderNo || '',
    product: productDoc?.name || '—',
    productId: productDoc?._id?.toString?.() || productDoc?.toString?.() || '',
    productSku: productDoc?.sku || '',
    requests: this.message,
    message: this.message,
    type: this.type,
    status: this.status,
    resolutionNote: this.resolutionNote,
    date: this.createdAt
      ? new Date(this.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
      : '—',
    createdAt: this.createdAt,
    chatExpiresAt,
    chatActive,
  }

  const latest = getLatestMessage(this)
  if (latest) {
    base.latestMessage = formatMessage(latest)
  }

  if (viewerId) {
    const unreadCount = getUnreadCountForUser(this, viewerId)
    base.unreadCount = unreadCount
    base.hasUnread = unreadCount > 0
  }

  if (includeMessages) {
    let recent = filterRecentMessages(this.messages || [])
    if (!recent.length && this.message) {
      recent = [
        {
          _id: 'initial',
          sender: raised,
          text: this.message,
          role: raised?.role || 'user',
          createdAt: this.createdAt,
        },
      ]
    }
    base.messages = recent.map((item) => formatMessage(item))
  }

  return base
}

disputeSchema.methods.markReadForUser = function markReadForUser(userId) {
  const vid = userIdString(userId)
  if (!vid) return this
  const now = new Date()
  const existing = (this.readBy || []).find((item) => userIdString(item.user) === vid)
  if (existing) {
    existing.readAt = now
  } else {
    this.readBy.push({ user: userId, readAt: now })
  }
  return this
}

const Dispute = mongoose.model('Dispute', disputeSchema)

export { getUnreadCountForUser }
export default Dispute
