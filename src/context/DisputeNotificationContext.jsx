import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { adminApi, disputeApi } from '../lib/api.js'
import { usePolling } from '../hooks/usePolling.js'

const DisputeNotificationContext = createContext(null)

export function DisputeNotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [toasts, setToasts] = useState([])

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) return
    try {
      const data =
        user.role === 'admin' ? await adminApi.disputeUnreadCount() : await disputeApi.unreadCount()
      setUnreadCount(data.count ?? 0)
    } catch {
      /* ignore polling errors */
    }
  }, [isAuthenticated, user])

  usePolling(fetchUnreadCount, 5000, isAuthenticated)

  const pushToast = useCallback((toast) => {
    setToasts((prev) => [...prev.filter((item) => item.id !== toast.id), toast])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== toast.id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  const value = useMemo(
    () => ({
      unreadCount,
      toasts,
      pushToast,
      dismissToast,
      refreshUnreadCount,
    }),
    [unreadCount, toasts, pushToast, dismissToast, refreshUnreadCount],
  )

  return <DisputeNotificationContext.Provider value={value}>{children}</DisputeNotificationContext.Provider>
}

export function useDisputeNotifications() {
  const context = useContext(DisputeNotificationContext)
  if (!context) {
    return {
      unreadCount: 0,
      toasts: [],
      pushToast: () => {},
      dismissToast: () => {},
      refreshUnreadCount: () => {},
    }
  }
  return context
}
