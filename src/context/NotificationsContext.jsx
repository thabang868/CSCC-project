import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { notificationsApi } from '../services/api.js'
import { useAuth } from './AuthContext.jsx'

const NotifCtx = createContext(null)

const POLL_MS = 12_000

export function NotificationsProvider({ children }) {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const lastUnread = useRef(0)
  const subscribers = useRef(new Set())

  const subscribeNew = useCallback((fn) => {
    subscribers.current.add(fn)
    return () => subscribers.current.delete(fn)
  }, [])

  const refresh = useCallback(async () => {
    if (!token) return
    try {
      const r = await notificationsApi.list()
      setItems(r.items || [])
      setUnread(r.unread || 0)
      // Notify subscribers of new arrivals (compared to last time we polled).
      if ((r.unread || 0) > lastUnread.current) {
        const fresh = (r.items || []).filter((n) => !n.read_at).slice(0, r.unread - lastUnread.current)
        subscribers.current.forEach((fn) => { try { fn(fresh) } catch {} })
      }
      lastUnread.current = r.unread || 0
    } catch {}
  }, [token])

  // Initial + interval + tab-focus refresh.
  useEffect(() => {
    if (!token) { setItems([]); setUnread(0); return }
    setLoading(true)
    refresh().finally(() => setLoading(false))
    const id = setInterval(refresh, POLL_MS)
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [token, refresh])

  const markRead = useCallback(async (id) => {
    try { await notificationsApi.markRead(id) } catch {}
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    setUnread((u) => Math.max(0, u - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    try { await notificationsApi.markAllRead() } catch {}
    setItems((arr) => arr.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    setUnread(0)
  }, [])

  const value = useMemo(
    () => ({ items, unread, loading, refresh, markRead, markAllRead, subscribeNew }),
    [items, unread, loading, refresh, markRead, markAllRead, subscribeNew]
  )

  return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotifCtx)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
