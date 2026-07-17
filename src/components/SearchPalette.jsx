import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Boxes, Activity, MessageSquare, Ticket,
  ShieldCheck, UserCircle2, Search, ArrowRight, Hash, Headphones,
} from 'lucide-react'
import { ticketApi } from '../services/api.js'
import useAccess from '../hooks/useAccess.js'

/** Static, navigable destinations the user can jump to. */
const PAGES = [
  { id: 'overview',   label: 'Overview',           path: '/app',                       icon: LayoutDashboard, group: 'Workspace',  keywords: 'home dashboard kpi summary' },
  { id: 'executive',  label: 'Executive Sales Overview', path: '/app/dashboards/executive',  icon: TrendingUp, group: 'Dashboards', keywords: 'revenue mix months categories executive sales overview' },
  { id: 'operations', label: 'Operational Insights',     path: '/app/dashboards/operations', icon: Boxes,      group: 'Dashboards', keywords: 'orders territory category listprice operations health' },
  { id: 'analytics',  label: 'Customer Performance',     path: '/app/dashboards/analytics',  icon: Activity,   group: 'Dashboards', keywords: 'quantity aov standardcost waterfall performance insights' },
  { id: 'chat',       label: 'AI Assistant',       path: '/app/chatbot',               icon: MessageSquare,   group: 'Tools',      keywords: 'ai chat insight ask azure openai' },
  { id: 'tickets',    label: 'My Tickets',         path: '/app/tickets',               icon: Ticket,          group: 'Tools',      keywords: 'decision support data ticket' },
  { id: 'support',    label: 'Support Connect',    path: '/app/support',               icon: Headphones,      group: 'Tools',      keywords: 'help call teams email phone agent live' },
  { id: 'support_live', label: 'Support Live',     path: '/app/support/dashboard',     icon: Headphones,      group: 'Live',       keywords: 'support dashboard live calls', fullAccessOnly: true },
  { id: 'profile',    label: 'Profile',            path: '/app/profile',               icon: UserCircle2,     group: 'Account',    keywords: 'account email role logout' },
  { id: 'users',      label: 'Users (admin)',      path: '/app/admin/users',           icon: UserCircle2,     group: 'Admin',      keywords: 'access roles client group', adminOnly: true },
  { id: 'approvals',  label: 'Approvals (admin)',  path: '/app/admin/tickets',         icon: ShieldCheck,     group: 'Admin',      keywords: 'review approve reject', adminOnly: true },
]

export default function SearchPalette({ open, onClose }) {
  const nav = useNavigate()
  const access = useAccess()
  const [q, setQ] = useState('')
  const [tickets, setTickets] = useState([])
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  // On open: focus, reset query, fetch user tickets.
  useEffect(() => {
    if (!open) return
    setQ(''); setActive(0)
    setTimeout(() => inputRef.current?.focus(), 0)
    ticketApi.mine().then(setTickets).catch(() => setTickets([]))
  }, [open])

  // Build the result set. Empty query = no results (predictive only).
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []

    const pages = PAGES
      .filter((p) => {
        if (p.adminOnly && !access.isAdmin) return false
        if (p.fullAccessOnly && !access.canViewOverview) return false
        if (p.id === 'overview'   && !access.canViewOverview) return false
        if (p.id === 'executive'  && !access.dashboards.includes('executive')) return false
        if (p.id === 'operations' && !access.dashboards.includes('operations')) return false
        if (p.id === 'analytics'  && !access.dashboards.includes('analytics')) return false
        return true
      })
      .filter((p) => (p.label + ' ' + p.keywords).toLowerCase().includes(needle))
      .map((p) => ({ kind: 'page', ...p }))

    const ticketHits = tickets
      .filter((t) => `#${t.id} ${t.title} ${t.description}`.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((t) => ({
        kind: 'ticket',
        id: `ticket-${t.id}`,
        label: `#${t.id} · ${t.title}`,
        path: '/app/tickets',
        icon: Hash,
        group: `Tickets · ${t.status}`,
      }))

    return [...pages, ...ticketHits]
  }, [q, tickets, access])

  // Reset active index when results change.
  useEffect(() => { setActive(0) }, [results.length])

  // Keyboard nav.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); return }
      if (e.key === 'Enter') {
        const item = results[active]
        if (item) { onClose(); nav(item.path) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, active, nav, onClose])

  if (!open) return null

  // Group results in display.
  const grouped = results.reduce((acc, r) => {
    (acc[r.group] = acc[r.group] || []).push(r)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[60] grid items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl card overflow-hidden animate-pop-in">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-200 bg-white">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dashboards, tickets, pages…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {!q.trim() ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              <Search size={20} className="mx-auto text-slate-300 mb-2" />
              Start typing to search dashboards, tickets, or pages.
              <div className="mt-3 text-[11px] text-slate-400">
                Try <span className="font-mono">over</span>, <span className="font-mono">orders</span>, <span className="font-mono">aov</span>, <span className="font-mono">ai</span>, <span className="font-mono">profile</span>…
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              No matches for <span className="font-mono">"{q}"</span>.
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">{group}</div>
                {items.map((item) => {
                  const idx = results.indexOf(item)
                  const Icon = item.icon
                  const isActive = idx === active
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => { onClose(); nav(item.path) }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                        isActive ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-brand-600' : 'text-slate-500'} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && <ArrowRight size={14} className="text-brand-600" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-2 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <kbd className="bg-white border border-slate-200 px-1 rounded">↑</kbd>
            <kbd className="bg-white border border-slate-200 px-1 rounded">↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="bg-white border border-slate-200 px-1 rounded">↵</kbd>
            open
          </span>
          <span className="inline-flex items-center gap-1 ml-auto">
            <kbd className="bg-white border border-slate-200 px-1 rounded">⌘ K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  )
}
