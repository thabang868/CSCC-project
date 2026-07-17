// User-facing labels for the internal role values.
//
// IMPORTANT: the stored/transmitted role value stays the same ('admin',
// 'company', 'client') because the backend access rules depend on it — only
// the label shown to the user changes here. The "company" role is presented
// across the app as "Executive_Team".
export const ROLE_LABELS = {
  admin: 'Admin',
  company: 'Executive_Team',
  client: 'Client',
}

export function roleLabel(role) {
  const key = (role || '').toLowerCase()
  if (ROLE_LABELS[key]) return ROLE_LABELS[key]
  return role ? role[0].toUpperCase() + role.slice(1) : ''
}
