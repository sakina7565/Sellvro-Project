import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../lib/api.js'
import { useDisputeNotifications } from '../context/DisputeNotificationContext.jsx'
import { useDisputeReplyToasts } from './useDisputeReplyToasts.js'
import { usePolling } from './usePolling.js'

export function useDisputeList({ loadFn, pollMs = 4000, pollEnabled = true }) {
  const { pushToast, refreshUnreadCount } = useDisputeNotifications()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setError('')
      try {
        const data = await loadFn()
        setItems(data.data || [])
        refreshUnreadCount()
      } catch (err) {
        if (!silent) {
          setError(getErrorMessage(err, 'Failed to load disputes.'))
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [loadFn, refreshUnreadCount],
  )

  useEffect(() => {
    loadItems()
  }, [loadItems])

  usePolling(() => loadItems({ silent: true }), pollMs, pollEnabled)
  useDisputeReplyToasts(items, pushToast, pollEnabled)

  const upsertItem = useCallback((next) => {
    if (!next?.id) return
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === next.id)
      if (index === -1) return prev
      const copy = [...prev]
      copy[index] = { ...copy[index], ...next }
      return copy
    })
  }, [])

  /** Sync unread flags only — never overwrite dispute status from mark-read. */
  const syncItemUnread = useCallback((id, patch = {}) => {
    if (!id) return
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      if (index === -1) return prev
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        hasUnread: patch.hasUnread ?? false,
        unreadCount: patch.unreadCount ?? 0,
        ...(patch.latestMessage ? { latestMessage: patch.latestMessage } : {}),
      }
      return copy
    })
  }, [])

  return {
    items,
    setItems,
    error,
    setError,
    loading,
    loadItems,
    upsertItem,
    syncItemUnread,
  }
}
