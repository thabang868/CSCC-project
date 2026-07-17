import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const CLIENT_GROUP_DASHBOARD = {
  client_a: 'executive',
  client_b: 'operations',
  client_c: 'analytics',
}

/**
 * Derive a user's effective access from the values returned by /api/auth/me.
 * Mirrors backend app.services.access_service.get_access exactly.
 */
export default function useAccess() {
  const { user } = useAuth()
  return useMemo(() => derive(user), [user])
}

export function derive(user) {
  const role = (user?.role || '').toLowerCase()

  if (role === 'admin' || role === 'company') {
    return {
      role,
      isAdmin: role === 'admin',
      canViewOverview: true,
      canViewAdmin: role === 'admin',
      dashboards: ['executive', 'operations', 'analytics'],
      defaultPath: '/app',
    }
  }

  if (role === 'client') {
    const cg = (user?.client_group || '').toLowerCase()
    const d = CLIENT_GROUP_DASHBOARD[cg] || null
    return {
      role,
      isAdmin: false,
      canViewOverview: false,   // full (all-tenant) overview — admin/company only
      canViewAdmin: false,
      dashboards: d ? [d] : [],
      // Assigned clients land on their own (self-scoped) Overview; users with
      // no dashboard group still see the awaiting screen.
      defaultPath: d ? '/app' : '/app/awaiting',
    }
  }

  return {
    role,
    isAdmin: false,
    canViewOverview: false,
    canViewAdmin: false,
    dashboards: [],
    defaultPath: '/app/awaiting',
  }
}
