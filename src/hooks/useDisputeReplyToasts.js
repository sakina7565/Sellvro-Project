import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function replyToastMessage(dispute, role) {
  const senderRole = dispute.latestMessage?.role
  const senderName = dispute.latestMessage?.senderName

  if (role === 'user' && senderRole === 'admin') {
    return 'Admin replied to your complaint'
  }
  if (role === 'supplier' && senderRole === 'admin') {
    return 'Admin replied to your dispute'
  }
  if (role === 'admin') {
    return `${senderName || 'Someone'} replied on a dispute`
  }
  if (senderRole === 'admin') {
    return 'Staff replied to your dispute'
  }
  return `${senderName || 'Someone'} sent a new reply`
}

export function useDisputeReplyToasts(disputes, onToast, enabled = true) {
  const { user } = useAuth()
  const seenRef = useRef(new Map())

  useEffect(() => {
    if (!enabled || !user || !Array.isArray(disputes)) return

    const uid = user.id || user._id || ''
    disputes.forEach((dispute) => {
      const latest = dispute.latestMessage
      if (!latest?.createdAt) return

      const senderId = latest.senderId || ''
      if (senderId && senderId === uid) return

      const key = `${dispute.id}:${latest.id || latest.createdAt}:${latest.text || ''}`
      if (seenRef.current.has(key)) return

      const hadPrior = [...seenRef.current.keys()].some((item) => item.startsWith(`${dispute.id}:`))
      seenRef.current.set(key, true)

      if (hadPrior && dispute.hasUnread) {
        onToast?.({
          id: key,
          message: replyToastMessage(dispute, user.role),
          disputeId: dispute.id,
        })
      }
    })
  }, [disputes, enabled, onToast, user])
}
