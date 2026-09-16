import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../lib/api.js'
import { getRedirectForUser } from '../lib/authRedirect.js'

const AuthContext = createContext(null)

const USER_KEY = 'sellvro_user'
const LEGACY_TOKEN_KEY = 'sellvro_token'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearLegacyToken() {
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [loading, setLoading] = useState(true)

  const persistUser = useCallback((nextUser) => {
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    else localStorage.removeItem(USER_KEY)
    setUser(nextUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Cookie is still cleared locally even if the network call fails.
    }
    persistUser(null)
  }, [persistUser])

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me()
      persistUser(data.user)
      return data.user
    } catch {
      persistUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [persistUser])

  useEffect(() => {
    clearLegacyToken()
    refreshUser()
  }, [refreshUser])

  const login = useCallback(
    async (payload) => {
      const data = await authApi.login(payload)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const adminLogin = useCallback(
    async (payload) => {
      const data = await authApi.adminLogin(payload)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const adminRegister = useCallback(
    async (payload) => {
      const data = await authApi.adminRegister(payload)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const updateUser = useCallback(
    (nextUser) => {
      persistUser(nextUser)
    },
    [persistUser],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      adminLogin,
      register,
      adminRegister,
      logout,
      refreshUser,
      updateUser,
      getHomePath: () => getRedirectForUser(user),
    }),
    [user, loading, login, adminLogin, register, adminRegister, logout, refreshUser, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
