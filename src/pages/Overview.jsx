import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Activity, Ticket, CheckCircle2, XCircle, Clock, Lock,
  ArrowRight, RefreshCw, UserCog, Image as ImageIcon,
} from 'lucide-react'
import { ticketApi, healthApi, adminApi } from '../services/api.js'
import KPICard from '../components/ui/KPICard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useRefresh } from '../context/RefreshContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import useAccess from '../hooks/useAccess.js'

const fmtNum = (v) => Number(v || 0).toLocaleString()

// Friendly labels + icons for every notification type the Activity feed
// might render. Anything new shows up with a neutral default no UI work.
const ACTIVITY_META = {
  ticket_created:            { icon: Ticket,        accent: 'brand'  },
  ticket_approved:           { icon: CheckCircle2,  accent: 'emerald'},
  ticket_rejected:           { icon: Ticket,        accent: 'rose'   },
  ticket_closed:             { icon: Ticket,        accent: 'slate'  },
  support_request_created:   { icon: Activity,      accent: 'amber'  },
  support_request_accepted:  { icon: CheckCircle2,  accent: 'emerald'},
  support_request_scheduled: { icon: Activity,      accent: 'violet' },
  support_request_closed:    { icon: Activity,      accent: 'slate'  },
  support_request_cancelled: { icon: Activity,      accent: 'rose'   },
  profile_avatar_updated:    { icon: ImageIcon,     accent: 'violet' },
  user_access_updated:       { icon: UserCog,       accent: 'sky'    },
  profile_changed:           { icon: UserCog,       accent: 'sky'    },
}

function fmtTimeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const ms = Date.now() - d.getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return d.toLocaleString()
}

export default function Overview() {
  const { user } = useAuth()
  const access = useAccess()
  // Clients see a self-scoped overview: only their own tickets, no platform
  // user count, and no all-tenant data.
  const isClient = access.role === 'client'
  const { refreshKey, bump } = useRefresh()
  const { items: activity, refresh: refreshActivity } = useNotifications()

  const [tickets, setTickets] = useState([])       // current user's own tickets
  const [allTickets, setAllTickets] = useState([]) // platform-wide tickets (admin/company only)
  const [warehouseOk, setWarehouseOk] = useState(null)
  const [usersTotal, setUsersTotal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      const calls = [
        ticketApi.mine().catch(() => []),
        healthApi.warehouse().catch(() => ({ warehouse_ok: false })),
      ]
      // Platform-wide ticket set + user count are for reviewers only — a
      // client never fetches (or could read) another account's data.
      if (!isClient) {
        calls.push(ticketApi.all().catch(() => []))
        calls.push(adminApi.usersCount().catch(() => null))
      }
      Promise.all(calls).then((res) => {
        if (cancelled) return
        setTickets(res[0] || [])
        setWarehouseOk(res[1]?.warehouse_ok ?? null)
        if (!isClient) {
          setAllTickets(res[2] || [])
          setUsersTotal(res[3]?.total ?? null)
        }
      }).finally(() => { if (!cancelled) setLoading(false) })
      refreshActivity()
    }
    setLoading(true)
    load()
    // Live: re-poll every 12 s while the tab is visible so the cards track
    // real-time ticket activity without a manual refresh.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 12000)
    return () => { cancelled = true; clearInterval(id) }
  }, [refreshKey, refreshActivity, isClient])

  // Status counts. Clients count only their own tickets; reviewers count
  // across the whole platform. Each card links to the relevant list.
  const src = isClient ? tickets : allTickets
  const openTickets     = src.filter(t => t.status === 'pending').length
  const approvedTickets = src.filter(t => t.status === 'approved').length
  const rejectedTickets = src.filter(t => t.status === 'rejected').length
  const closedTickets   = src.filter(t => t.status === 'closed').length
  const recentTickets   = tickets.slice(0, 5)
  // Reviewers (admin / Executive_Team) get a real work queue: the tickets
  // waiting for their approval, not their own (usually empty) tickets.
  const pendingQueue    = allTickets.filter(t => t.status === 'pending')
  const ticketLink = (status) => (isClient ? '/app/tickets' : `/app/admin/tickets?status=${status}`)

  // Show the full feed inside the panel. The card itself caps the scroll
  // height so the rest of the page stays at a comfortable size, while the
  // user can still drag through every event without leaving Overview.
  const recentActivity = activity || []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome back${user?.full_name ? ', ' + user.full_name.split(' ')[0] : ''}`}
        actions={
          <button onClick={() => { bump(); refreshActivity() }} className="btn-ghost text-xs">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {loading && warehouseOk === null ? (
        <Loader label="Connecting to warehouse…" />
      ) : (
        <>
          {/* KPIs six cards on xl, wrap on smaller widths.
              Open Tickets and Closed Tickets sit next to each other so the
              status pair is read together. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KPICard
              accent="emerald"
              icon={Activity}
              label="Service Health"
              value={warehouseOk ? '100%' : ''}
              hint={
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${warehouseOk ? 'bg-emerald-500 animate-pulse-soft' : 'bg-amber-500'}`} />
                  {warehouseOk ? 'All systems operational' : 'Warehouse offline set SQLSERVER_HOST'}
                </span>
              }
            />
            {!isClient && (
              <KPICard
                accent="sky"
                icon={Users}
                label="Users"
                value={usersTotal == null ? '' : fmtNum(usersTotal)}
                hint="Registered accounts · live"
              />
            )}
            <KPICard
              accent="amber"
              icon={Clock}
              label="Open Tickets"
              value={fmtNum(openTickets)}
              hint={isClient ? 'Pending · live · my tickets →' : 'Pending · live · view →'}
              to={ticketLink('pending')}
            />
            <KPICard
              accent="emerald"
              icon={CheckCircle2}
              label="Approved Tickets"
              value={fmtNum(approvedTickets)}
              hint={isClient ? 'Approved · live · my tickets →' : 'Approved · live · view →'}
              to={ticketLink('approved')}
            />
            <KPICard
              accent="rose"
              icon={XCircle}
              label="Rejected Tickets"
              value={fmtNum(rejectedTickets)}
              hint={isClient ? 'Rejected · live · my tickets →' : 'Rejected · live · view →'}
              to={ticketLink('rejected')}
            />
            <KPICard
              accent="violet"
              icon={Lock}
              label="Closed Tickets"
              value={fmtNum(closedTickets)}
              hint={isClient ? 'Closed · live · my tickets →' : 'Closed · live · view →'}
              to={ticketLink('closed')}
            />
          </div>

          {/* Bento: activity + quick actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left panel: clients see their own ticket queue here (no
                platform activity feed); admin/company see the live activity. */}
            {isClient ? (
              <div className="lg:col-span-2">
                <MyQueueCard recentTickets={recentTickets} />
              </div>
            ) : (
              <div className="card card-hover p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="eyebrow inline-flex items-center gap-2">
                      Activity
                      <span className="inline-flex items-center gap-1 normal-case tracking-normal font-normal text-[11px] text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                        live · polls every 12 s
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 mt-1">What's happening across the platform</div>
                  </div>
                  <button onClick={refreshActivity} className="text-xs link">Refresh ↻</button>
                </div>
                {recentActivity.length === 0 ? (
                  <EmptyState
                    title="Nothing yet"
                    body="Activity from tickets, profile changes and support requests will appear here in real time."
                  />
                ) : (
                  <div className="activity-scroll relative -mr-2 pr-2 max-h-[28rem] overflow-y-auto">
                    <ul className="divide-y divide-slate-100">
                      {recentActivity.map((n) => <ActivityRow key={n.id} n={n} />)}
                    </ul>
                    <div className="pointer-events-none sticky bottom-0 h-6 -mt-6 bg-gradient-to-t from-white to-transparent dark:from-slate-900" />
                  </div>
                )}
              </div>
            )}

            <div className="card card-hover p-5">
              <div className="eyebrow">Shortcuts</div>
              <div className="font-bold text-slate-900 mt-1 mb-4">Quick actions</div>
              <div className="space-y-2">
                {[
                  { to: '/app/dashboards/executive',  cat: 'executive',  label: 'Executive Sales Overview', desc: 'Revenue trends & mix' },
                  { to: '/app/dashboards/operations', cat: 'operations', label: 'Operational Insights',     desc: 'Orders & logistics' },
                  { to: '/app/dashboards/analytics',  cat: 'analytics',  label: 'Customer Performance',     desc: 'Quantity & AOV' },
                ].filter((d) => access.dashboards.includes(d.cat)).map((d) => (
                  <QuickLink key={d.cat} to={d.to} label={d.label} desc={d.desc} />
                ))}
                <QuickLink to="/app/tickets" label="My Tickets" desc="Raise & track your decisions" />
                <QuickLink to="/app/support" label="Support Connect" desc="Reach a company-side agent" />
              </div>
            </div>
          </div>

          {/* Admin/company keep the ticket queue as a secondary section below
              the activity feed. Clients already have it in the left panel. */}
          {!isClient && <MyQueueCard recentTickets={pendingQueue.slice(0, 6)} isReviewer />}
        </>
      )}
    </div>
  )
}

/* My Queue.
   - Clients: their own recent tickets, with a "Create a ticket" prompt.
   - Reviewers (admin / Executive_Team): the live approval queue — tickets
     waiting for them to approve, reject or close, each with a Review action. */
function MyQueueCard({ recentTickets, isReviewer = false }) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="eyebrow">My queue</div>
          <div className="font-bold text-slate-900 mt-1">
            {isReviewer ? 'Awaiting your approval' : 'Recent tickets'}
          </div>
        </div>
        <Link to={isReviewer ? '/app/admin/tickets?status=pending' : '/app/tickets'} className="text-xs link">
          {isReviewer ? 'Go to approvals' : 'All tickets'}
        </Link>
      </div>
      {recentTickets.length === 0 ? (
        isReviewer ? (
          <EmptyState
            title="You're all caught up"
            body="No tickets are waiting for approval right now. New requests will appear here in real time."
          />
        ) : (
          <EmptyState
            title="No tickets yet"
            body="Raise your first decision ticket admins will review and approve."
            cta={<Link to="/app/tickets" className="btn-primary mt-3">Create a ticket</Link>}
          />
        )
      ) : (
        <ul className="divide-y divide-slate-100">
          {recentTickets.map((t) => (
            <li key={t.id} className="py-3 flex items-center gap-3">
              <StatusDot status={t.status} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">{t.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(t.created_at).toLocaleString()} · {t.category} · {t.priority}
                </div>
              </div>
              {isReviewer ? (
                <Link to="/app/admin/tickets?status=pending" className="btn-soft !px-3 !py-1 text-[11px]">
                  Review
                </Link>
              ) : (
                <StatusBadge status={t.status} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActivityRow({ n }) {
  const meta = ACTIVITY_META[n.type] || { icon: Activity, accent: 'slate' }
  const Icon = meta.icon
  const accent = {
    brand:   'bg-brand-100 text-brand-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose:    'bg-rose-100 text-rose-700',
    amber:   'bg-amber-100 text-amber-800',
    violet:  'bg-violet-100 text-violet-700',
    sky:     'bg-sky-100 text-sky-700',
    slate:   'bg-slate-100 text-slate-700',
  }[meta.accent]
  const row = (
    <div className="py-3 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl grid place-items-center shadow-soft shrink-0 ${accent}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm truncate">{n.title}</div>
        {n.body && (
          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>
        )}
        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
          <span>{fmtTimeAgo(n.created_at)}</span>
          {!n.read_at && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              new
            </span>
          )}
        </div>
      </div>
    </div>
  )
  return n.link ? <Link to={n.link} className="block hover:bg-slate-50/60 rounded-lg -mx-2 px-2">{row}</Link> : row
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm">{label}</div>
        <div className="text-[11px] text-slate-500">{desc}</div>
      </div>
      <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-brand-600 transition" />
    </Link>
  )
}

function StatusDot({ status }) {
  const cls = {
    pending: 'bg-amber-500', approved: 'bg-emerald-500',
    rejected: 'bg-rose-500', closed: 'bg-slate-400',
  }[status] || 'bg-slate-400'
  return <span className={`w-2.5 h-2.5 rounded-full ${cls} ring-2 ring-white shadow`} />
}

function StatusBadge({ status }) {
  const map = {
    pending:  'bg-amber-100 text-amber-800 ring-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 ring-rose-200',
    closed:   'bg-slate-200 text-slate-700 ring-slate-300',
  }
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{status}</span>
}

function EmptyState({ title, body, cta }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center">
        <Ticket size={22} />
      </div>
      <div className="mt-3 font-bold text-slate-900">{title}</div>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{body}</p>
      {cta}
    </div>
  )
}
