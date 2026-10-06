import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../lib/api.js'
import { getRedirectForUser } from '../lib/authRedirect.js'

const AuthContext = createContext(null)

const USER_KEY = 'sellvro_user'
const TOKEN_KEY = 'sellvro_token'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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
    localStorage.removeItem(TOKEN_KEY)
    persistUser(null)
  }, [persistUser])

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me()
      persistUser(data.user)
      return data.user
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      persistUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [persistUser])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(
    async (payload) => {
      const data = await authApi.login(payload)
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const adminLogin = useCallback(
    async (payload) => {
      const data = await authApi.adminLogin(payload)
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload)
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const adminRegister = useCallback(
    async (payload) => {
      const data = await authApi.adminRegister(payload)
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
      persistUser(data.user)
      return data
    },
    [persistUser],
  )

  const googleLogin = useCallback(
    async (payload) => {
      const data = await authApi.googleAuth(payload)
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
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
      googleLogin,
      logout,
      refreshUser,
      updateUser,
      getHomePath: () => getRedirectForUser(user),
    }),
    [user, loading, login, adminLogin, register, adminRegister, googleLogin, logout, refreshUser, updateUser],
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
