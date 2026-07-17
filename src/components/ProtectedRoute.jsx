import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useAccess from '../hooks/useAccess.js'
import Loader from './ui/Loader.jsx'

export function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Loader label="Checking session…" />
  if (!token || !user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

export function AdminRoute({ children }) {
  const { user, token, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Loader label="Checking session…" />
  if (!token || !user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if ((user.role || '').toLowerCase() !== 'admin') return <Navigate to="/app" replace />
  return children
}

/** Restricts a child to admin and company-side users (full overview access). */
export function FullAccessRoute({ children }) {
  const access = useAccess()
  if (!access.canViewOverview) return <Navigate to={access.defaultPath} replace />
  return children
}

/** Restricts a dashboard route to users whose access list includes the category. */
export function DashboardRoute({ category, children }) {
  const access = useAccess()
  if (!access.dashboards.includes(category)) return <Navigate to={access.defaultPath} replace />
  return children
}
