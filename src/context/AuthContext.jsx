import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../lib/api.js'
import { getRedirectForUser } from '../lib/authRedirect.js'

const AuthContext = createContext(null)

const TOKEN_KEY = 'sellvro_token'
const USER_KEY = 'sellvro_user'

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
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken)
    else localStorage.removeItem(TOKEN_KEY)

    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    else localStorage.removeItem(USER_KEY)

    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    persistSession(null, null)
  }, [persistSession])

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false)
      return null
    }

    try {
      const data = await authApi.me()
      persistSession(localStorage.getItem(TOKEN_KEY), data.user)
      return data.user
    } catch {
      persistSession(null, null)
      return null
    } finally {
      setLoading(false)
    }
  }, [persistSession])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(
    async (payload) => {
      const data = await authApi.login(payload)
      persistSession(data.token, data.user)
      return data
    },
    [persistSession],
  )

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload)
      persistSession(data.token, data.user)
      return data
    },
    [persistSession],
  )

  const updateUser = useCallback(
    (nextUser) => {
      persistSession(localStorage.getItem(TOKEN_KEY), nextUser)
    },
    [persistSession],
  )

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshUser,
      updateUser,
      getHomePath: () => getRedirectForUser(user),
    }),
    [user, token, loading, login, register, logout, refreshUser, updateUser],
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
