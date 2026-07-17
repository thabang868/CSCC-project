import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from '../services/api.js'

const AuthCtx = createContext(null)

const POLL_MS = 20_000  // re-check the user record every 20s while signed in

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dm_user') || 'null') } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('dm_token'))
  const [loading, setLoading] = useState(false)

  // Notify subscribers when role or client_group changes server-side.
  const accessListeners = useRef(new Set())
  const subscribeAccessChange = useCallback((fn) => {
    accessListeners.current.add(fn)
    return () => accessListeners.current.delete(fn)
  }, [])

  const persist = useCallback((data) => {
    localStorage.setItem('dm_token', data.access_token)
    localStorage.setItem('dm_user', JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
  }, [])

  // Refresh the user record. Detect access-relevant changes and notify.
  const refreshMe = useCallback(async () => {
    try {
      const fresh = await authApi.me()
      setUser((prev) => {
        if (!prev) return fresh
        const changed =
          (prev.role || '') !== (fresh.role || '') ||
          (prev.client_group || '') !== (fresh.client_group || '') ||
          Boolean(prev.is_active) !== Boolean(fresh.is_active)
        if (changed) {
          // Use a microtask so listeners run after state has propagated.
          queueMicrotask(() => {
            accessListeners.current.forEach((fn) => {
              try { fn(prev, fresh) } catch {}
            })
          })
        }
        return fresh
      })
      localStorage.setItem('dm_user', JSON.stringify(fresh))
      return fresh
    } catch {
      return null
    }
  }, [])

  // Initial /me fetch when we have a token but no user (e.g. after a reload).
  useEffect(() => {
    if (token && !user) {
      setLoading(true)
      refreshMe().finally(() => setLoading(false))
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Background poll + refresh on tab focus while signed in.
  useEffect(() => {
    if (!token) return
    const id = setInterval(refreshMe, POLL_MS)
    const onFocus = () => { if (document.visibilityState === 'visible') refreshMe() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [token, refreshMe])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    persist(data)
    return data.user
  }, [persist])

  const register = useCallback(async (payload) => {
    return await authApi.register(payload)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('dm_token')
    localStorage.removeItem('dm_user')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user, token, loading,
      login, register, logout,
      refreshMe, subscribeAccessChange,
      isAdmin: (user?.role || '').toLowerCase() === 'admin',
    }),
    [user, token, loading, login, register, logout, refreshMe, subscribeAccessChange]
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
