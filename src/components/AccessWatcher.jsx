import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import useAccess from '../hooks/useAccess.js'
import { derive } from '../hooks/useAccess.js'

const ROUTE_REQUIRED = [
  { match: (p) => p === '/app',                          need: (a) => a.canViewOverview || a.role === 'client' },
  { match: (p) => p === '/app/dashboards/executive',     need: (a) => a.dashboards.includes('executive') },
  { match: (p) => p === '/app/dashboards/operations',    need: (a) => a.dashboards.includes('operations') },
  { match: (p) => p === '/app/dashboards/analytics',     need: (a) => a.dashboards.includes('analytics') },
  // Approvals are open to admin + company-side (Executive_Team) — full access.
  { match: (p) => p === '/app/admin/tickets',            need: (a) => a.canViewOverview },
  // Everything else under /app/admin/ (e.g. user management) stays admin-only.
  { match: (p) => p.startsWith('/app/admin/'),           need: (a) => a.canViewAdmin },
]

export default function AccessWatcher() {
  const { user, subscribeAccessChange, logout } = useAuth()
  const access = useAccess()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const lastNoticedKey = useRef('')

  // Subscribe once. Compare derived access in/out for friendlier toasts.
  useEffect(() => {
    return subscribeAccessChange((prev, fresh) => {
      // Account disabled by admin
      if (!fresh.is_active) {
        toast.error('Account disabled', 'You have been signed out by an administrator.')
        logout()
        nav('/login', { replace: true })
        return
      }

      const a = derive(fresh)
      const b = derive(prev)
      if (a.role !== b.role || a.client_group !== b.client_group) {
        const key = `${a.role}|${a.client_group}`
        if (lastNoticedKey.current !== key) {
          lastNoticedKey.current = key
          if (a.role === 'admin') {
            toast.success('Access updated', 'You are now an Admin. Reloading workspace…')
          } else if (a.role === 'company') {
            toast.success('Access updated', 'You now have full Executive_Team access.')
          } else if (a.role === 'client' && a.dashboards.length > 0) {
            const map = { executive: 'Executive Sales Overview', operations: 'Operational Insights', analytics: 'Customer Performance' }
            toast.success('Dashboard assigned', `You now have access to ${map[a.dashboards[0]]}.`)
          } else {
            toast.info('Access updated', 'Your dashboards are being prepared.')
          }
        }
      }
    })
  }, [subscribeAccessChange, toast, logout, nav])

  // If the page the user is currently on is no longer permitted, send them home.
  useEffect(() => {
    if (!user) return
    const guard = ROUTE_REQUIRED.find((r) => r.match(loc.pathname))
    if (guard && !guard.need(access)) {
      nav(access.defaultPath, { replace: true })
    }
  }, [user, access, loc.pathname, nav])

  return null
}
