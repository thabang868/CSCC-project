import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Global "refresh signal".
 *
 * Any page that wants to be refreshable subscribes to `refreshKey` (just a
 * monotonically-increasing number) by putting it in a useEffect dep array.
 * Calling `bump()` increments the key, which causes every subscribed page
 * to re-run its data-loading effect.
 */
const RefreshCtx = createContext(null)

export function RefreshProvider({ children }) {
  const [refreshKey, setKey] = useState(0)
  const [refreshingAt, setAt] = useState(null)

  const bump = useCallback(() => {
    setKey((k) => k + 1)
    setAt(new Date())
  }, [])

  const value = useMemo(() => ({ refreshKey, bump, refreshingAt }), [refreshKey, bump, refreshingAt])
  return <RefreshCtx.Provider value={value}>{children}</RefreshCtx.Provider>
}

export function useRefresh() {
  const ctx = useContext(RefreshCtx)
  if (!ctx) throw new Error('useRefresh must be used inside <RefreshProvider>')
  return ctx
}
