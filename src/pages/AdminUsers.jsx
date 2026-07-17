import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Users as UsersIcon, RefreshCw, Search, UserCircle2, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import { adminApi } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { useRefresh } from '../context/RefreshContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const ROLES = [
  { value: 'client',  label: 'Client' },
  { value: 'company', label: 'Executive_Team' },
  { value: 'admin',   label: 'Admin' },
]
const GROUPS = [
  { value: '',         label: 'Unassigned' },
  { value: 'client_a', label: 'Client A · Executive Sales Overview' },
  { value: 'client_b', label: 'Client B · Operational Insights' },
  { value: 'client_c', label: 'Client C · Customer Performance' },
]

export default function AdminUsers() {
  const toast = useToast()
  const { refreshKey, bump } = useRefresh()
  const { user: me, refreshMe } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [q, setQ] = useState('')

  const load = (silent = false) => {
    if (!silent) setLoading(true)
    adminApi.listUsers()
      .then(setUsers)
      .catch(() => { if (!silent) setUsers([]) })
      .finally(() => { if (!silent) setLoading(false) })
  }

  // Initial load + manual refresh. Also poll silently every 15 seconds so
  // an admin viewing this page sees fresh avatars / profile changes without
  // having to click Refresh.
  useEffect(() => {
    load(false)
    const id = setInterval(() => load(true), 15_000)
    const onFocus = () => { if (document.visibilityState === 'visible') load(true) }
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const updateLocal = (id, patch) =>
    setUsers((arr) => arr.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  const save = async (u, patch) => {
    setSavingId(u.id)
    updateLocal(u.id, patch)
    try {
      const next = await adminApi.updateUser(u.id, patch)
      updateLocal(u.id, next)
      toast.success('Updated', `${next.full_name}'s access has been updated.`)
      // If the admin just edited their own account, immediately re-pull /me
      // so the sidebar / routes update without waiting for the 20-second poll.
      if (me && next.id === me.id) refreshMe()
    } catch (e) {
      toast.error('Could not save', e?.response?.data?.detail || 'Please try again.')
      load()
    } finally {
      setSavingId(null)
    }
  }

  // Permanently remove a user account and every trace of their data.
  // Admin-only, and never your own account.
  const remove = async (u) => {
    const ok = window.confirm(
      `Permanently delete ${u.full_name}?\n\n` +
      `This removes the account and ALL of their data — tickets, notifications ` +
      `and profile — from the system. This cannot be undone.`
    )
    if (!ok) return
    setDeletingId(u.id)
    try {
      await adminApi.deleteUser(u.id)
      setUsers((arr) => arr.filter((x) => x.id !== u.id))
      toast.success('User deleted', `${u.full_name}'s account and data were removed.`)
    } catch (e) {
      toast.error('Could not delete', e?.response?.data?.detail || 'Please try again.')
      load()
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = users.filter((u) => {
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return (u.full_name + ' ' + u.email + ' ' + u.role + ' ' + (u.client_group || ''))
      .toLowerCase()
      .includes(needle)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Access management"
        title="Users"
        subtitle="Assign roles and dashboard access for every registered account."
        actions={
          <>
            <button onClick={bump} className="btn-ghost text-xs">
              <RefreshCw size={14} /> Refresh
            </button>
            <span className="badge bg-brand-50 text-brand-800 ring-brand-200">
              <ShieldCheck size={14} className="mr-1" /> Admin only
            </span>
          </>
        }
      />

      <div className="card p-3 sm:p-4">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, role…"
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-slate-400"
          />
          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
            <UsersIcon size={12} /> {filtered.length} of {users.length}
          </span>
        </div>

        {loading ? (
          <Loader label="Loading users…" />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No users match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="text-left  px-3 py-2 font-bold">User</th>
                  <th className="text-left  px-3 py-2 font-bold">Role</th>
                  <th className="text-left  px-3 py-2 font-bold">Client group</th>
                  <th className="text-left  px-3 py-2 font-bold">Status</th>
                  <th className="text-right px-3 py-2 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">{u.full_name}</div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="input !py-1.5 !text-xs"
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => save(u, { role: e.target.value })}
                      >
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="input !py-1.5 !text-xs disabled:opacity-50"
                        value={u.client_group || ''}
                        disabled={u.role !== 'client' || savingId === u.id}
                        onChange={(e) => save(u, { client_group: e.target.value })}
                      >
                        {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => save(u, { is_active: !u.is_active })}
                        disabled={savingId === u.id}
                        className={`badge ring-1 ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                            : 'bg-rose-100 text-rose-800 ring-rose-200'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-500">
                      <div className="flex items-center justify-end gap-2">
                        <span>{new Date(u.created_at).toLocaleDateString()}</span>
                        <Link to={`/app/support/customer/${u.id}`} className="btn-soft !px-2 !py-1 text-[11px]" title="Open Customer 360">
                          <UserCircle2 size={12} /> 360
                        </Link>
                        {me?.role === 'admin' && me?.id !== u.id && (
                          <button
                            onClick={() => remove(u)}
                            disabled={deletingId === u.id || savingId === u.id}
                            className="btn-soft !px-2 !py-1 text-[11px] text-rose-600 hover:bg-rose-50 hover:ring-rose-200 disabled:opacity-50"
                            title="Delete this user account and all their data"
                          >
                            <Trash2 size={12} /> {deletingId === u.id ? 'Deleting…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Profile picture cell. Renders the user's uploaded avatar (data URL stored
 * in users.avatar / app.UserProfile.Avatar) and falls back to the existing
 * gradient initials when none is set. The img cache-busts on the avatar
 * string itself, so when the user changes their picture and the silent
 * 15-second poll picks up the new data URL, this cell rerenders immediately.
 */
function UserAvatar({ user }) {
  const initial = user.full_name?.[0]?.toUpperCase() || 'U'
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.full_name}
        className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-soft shrink-0 bg-slate-100"
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <div
      aria-label={user.full_name}
      className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shrink-0"
    >
      {initial}
    </div>
  )
}
