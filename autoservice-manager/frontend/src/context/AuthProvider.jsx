import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProfile, login as apiLogin } from '../api/auth'
import { tokens } from '../api/client'
import { AuthContext } from './auth-context'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokens.access))

  useEffect(() => {
    if (!tokens.access) return
    getProfile()
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  const login = useCallback(async (username, password) => {
    const profile = await apiLogin(username, password)
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    tokens.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser: setUser }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}