import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Headphones, Send, Users as UsersIcon, Phone, Video,
  AlertCircle, Plus, ShieldCheck, CalendarPlus, Calendar,
  Clock, ExternalLink, X as XIcon, RefreshCw,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import { supportApi } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { useRefresh } from '../context/RefreshContext.jsx'
import useAccess from '../hooks/useAccess.js'
import { roleLabel } from '../utils/roles.js'
import { Modal } from './Tickets.jsx'

const CHANNELS = [
  { value: 'teams', label: 'Microsoft Teams', icon: Video, hint: 'Open a live Teams chat with your agent' },
]

const CHANNEL_ICON = { teams: Video, phone: Phone }

const POLL_MS = 6000

export default function SupportConnect() {
  const access = useAccess()
  const toast = useToast()
  const { refreshKey, bump } = useRefresh()

  const [agents, setAgents] = useState([])
  const [hotline, setHotline] = useState('076 363 9505')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    subject: '', message: '', channel: 'teams',
    priority: 'medium', agent_id: '',
  })
  const [err, setErr] = useState('')
  const [scheduling, setScheduling] = useState(null)

  const load = ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    Promise.all([
      supportApi.agents().catch(() => []),
      supportApi.hotline().catch(() => ({ company_hotline: '076 363 9505' })),
      supportApi.listMine().catch(() => []),
    ]).then(([a, h, r]) => {
      setAgents(a); setHotline(h?.company_hotline || '076 363 9505'); setRequests(r)
    }).finally(() => { if (!silent) setLoading(false) })
  }
  useEffect(() => { load() }, [refreshKey])

  // Live polling silently refresh own requests while the tab is visible.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') load({ silent: true }) }
    const id = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setCreating(true)
    try {
      const payload = { ...form, agent_id: form.agent_id ? Number(form.agent_id) : null }
      await supportApi.create(payload)
      toast.success('Request submitted', 'The person you selected has been notified and will respond shortly.')
      setForm({ subject: '', message: '', channel: 'teams', priority: 'medium', agent_id: '' })
      bump()
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Could not submit the request.'
      setErr(detail); toast.error('Could not submit', detail)
    } finally {
      setCreating(false)
    }
  }

  const selectedAgent = useMemo(
    () => agents.find((a) => String(a.id) === String(form.agent_id)) || null,
    [agents, form.agent_id]
  )

  const counts = requests.reduce((acc, r) => {
    const k = r.Status || r.status; acc[k] = (acc[k] || 0) + 1; return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support · live channels"
        title="Support Connect"
        actions={
          access.role === 'company' || access.isAdmin ? (
            <Link to="/app/support/dashboard" className="btn-primary text-xs">
              <ShieldCheck size={14} /> Live dashboard
            </Link>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ---------- Request form ---------- */}
        <div className="card p-5 lg:col-span-2">
          <SectionHeader icon={Plus} eyebrow="New request" title="Start a Support Connect" />

          <form onSubmit={submit} className="space-y-4 mt-4">
            {err && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
              </div>
            )}

            <div>
              <label className="label">Subject</label>
              <input className="input" required minLength={3} value={form.subject}
                     onChange={upd('subject')} placeholder="e.g. Need help understanding Q4 figures" />
            </div>

            <div>
              <label className="label">Details</label>
              <textarea className="input min-h-[110px]" value={form.message}
                        onChange={upd('message')}
                        placeholder="Describe what you need context helps your agent prepare." />
            </div>

            <div>
              <label className="label">Preferred channel</label>
              <div className="grid grid-cols-1 gap-2">
                {CHANNELS.map((c) => {
                  const I = c.icon
                  const active = form.channel === c.value
                  return (
                    <button key={c.value} type="button"
                            onClick={() => setForm({ ...form, channel: c.value })}
                            className={`rounded-xl border px-3 py-3 text-sm font-semibold flex flex-col items-center gap-1.5 transition ${
                              active ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
                                     : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                            }`}>
                      <I size={18} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">
                {CHANNELS.find((c) => c.value === form.channel)?.hint}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={upd('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="label">Connect with</label>
                <select className="input" value={form.agent_id} onChange={upd('agent_id')}>
                  <option value="">Anyone available</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.full_name} · {a.email}</option>
                  ))}
                </select>
                {selectedAgent?.phone && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Will reach {selectedAgent.full_name} on {selectedAgent.phone}.
                  </div>
                )}
              </div>
            </div>

            <button disabled={creating} className="btn-primary w-full !py-3">
              {creating
                ? 'Submitting…'
                : <><Send size={16} /> Submit request</>}
            </button>
          </form>
        </div>

        {/* ---------- Right rail: agents + hotline ---------- */}
        <div className="space-y-5">
          <div className="card p-5">
            <SectionHeader
              icon={UsersIcon}
              eyebrow={access.role === 'company' || access.isAdmin ? 'Directory' : 'Available agents'}
              title={access.role === 'company' || access.isAdmin ? 'Clients & team' : 'Registered Executive_Team'}
              right={<span className="text-[11px] text-slate-500 nums">{agents.length}</span>}
            />
            {agents.length === 0 ? (
              <div className="mt-4 text-sm text-slate-500">No one available right now.</div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
                {agents.slice(0, 6).map((a) => <AgentRow key={a.id} agent={a} />)}
              </ul>
            )}
          </div>

          <div className="card p-5 bg-gradient-to-br from-brand-50 via-white to-violet-50 border-brand-100
                          dark:from-brand-950/40 dark:via-slate-900 dark:to-violet-950/40 dark:border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white grid place-items-center shadow-glow">
                <Phone size={18} />
              </div>
              <div>
                <div className="eyebrow">Company hotline (fallback)</div>
                <div className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{hotline}</div>
                <a href={`tel:${hotline.replace(/\s/g, '')}`} className="link text-xs">
                  Call from this device →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {scheduling && (
        <ScheduleModal
          request={scheduling}
          onClose={() => setScheduling(null)}
          onSaved={() => { setScheduling(null); bump() }}
        />
      )}

      {/* ---------- My requests ---------- */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="eyebrow inline-flex items-center gap-2">
              Your requests
              <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[11px] text-slate-500 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                live · polls every 6 s
              </span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white">Recent activity</div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-widest font-bold">
            <Pill n={counts.pending  || 0} cls="bg-amber-100 text-amber-800 ring-amber-200"     label="Pending" />
            <Pill n={counts.accepted || 0} cls="bg-brand-100 text-brand-800 ring-brand-200"     label="Accepted" />
            <Pill n={counts.in_call  || 0} cls="bg-violet-100 text-violet-800 ring-violet-200" label="In call" />
            <Pill n={counts.closed   || 0} cls="bg-emerald-100 text-emerald-800 ring-emerald-200" label="Closed" />
          </div>
        </div>

        {loading ? (
          <Loader label="Loading…" />
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {requests.map((r) => <RequestRow key={r.RequestID || r.request_id} r={r} onSchedule={setScheduling} />)}
          </ul>
        )}
      </div>
    </div>
  )
}


// ---------------------- subcomponents ----------------------

function SectionHeader({ icon: Icon, eyebrow, title, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="eyebrow inline-flex items-center gap-1.5">
          {Icon && <Icon size={12} />} {eyebrow}
        </div>
        <div className="font-bold text-slate-900 dark:text-white mt-1">{title}</div>
      </div>
      {right}
    </div>
  )
}

function AgentRow({ agent }) {
  const initial = agent.full_name?.[0]?.toUpperCase() || 'A'
  return (
    <li className="py-2.5 flex items-center gap-3">
      {agent.avatar ? (
        <img
          src={agent.avatar}
          alt={agent.full_name}
          className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-soft shrink-0 bg-slate-100"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shrink-0">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-white truncate">{agent.full_name}</div>
        <div className="text-[11px] text-slate-500 truncate">{agent.email}</div>
      </div>
      <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-200 shrink-0">{roleLabel(agent.role)}</span>
    </li>
  )
}

function RequestRow({ r, onSchedule }) {
  const subj        = r.Subject       || r.subject
  const status      = r.Status        || r.status
  const channel     = r.Channel       || r.channel
  const created     = r.CreatedAt     || r.created_at
  const scheduled   = r.ScheduledAt   || r.scheduled_at
  const meetingLink = r.MeetingLink   || r.meeting_link
  const canSchedule = status === 'accepted' || status === 'in_call'
  const CI          = CHANNEL_ICON[channel] || Headphones

  return (
    <li className="py-3 flex items-start gap-3">
      <StatusDot status={status} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-white truncate">{subj}</div>
        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{new Date(created).toLocaleString()}</span>
          <span className="inline-flex items-center gap-1">
            <CI size={11} /> {channel}
          </span>
        </div>
        {scheduled && (
          <div className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-[11px] text-violet-700 dark:text-violet-300">
            <Clock size={11} /> Scheduled {new Date(scheduled).toLocaleString()}
            {meetingLink && (
              <a href={meetingLink} target="_blank" rel="noreferrer"
                 className="link inline-flex items-center gap-1">
                <ExternalLink size={11} /> open Teams
              </a>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={status} />
        {canSchedule && !scheduled && (
          <button onClick={() => onSchedule(r)} className="btn-soft text-[11px] !py-1 !px-2">
            <CalendarPlus size={12} /> Schedule
          </button>
        )}
      </div>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center">
        <Headphones size={24} />
      </div>
      <div className="mt-3 font-bold text-slate-900 dark:text-white">No live requests yet</div>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
        Submit one above it will appear here the moment your chosen agent accepts it.
      </p>
    </div>
  )
}

function ScheduleModal({ request, onClose, onSaved }) {
  const toast = useToast()
  const [when, setWhen] = useState(() => {
    // Default: tomorrow at 10:00 local time.
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)

  const subj = request.Subject     || request.subject
  const RID  = request.RequestID   || request.request_id

  const buildTeamsLink = () => {
    const base = 'https://teams.microsoft.com/l/meeting/new'
    const params = new URLSearchParams({
      subject: `Decision Making · ${subj}`,
      attendees: request.ContactEmail || request.contact_email || '',
    })
    setLink(`${base}?${params.toString()}`)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const iso = new Date(when).toISOString()
      await supportApi.schedule(RID, {
        scheduled_at: iso,
        meeting_link: link.trim() || null,
        meeting_provider: 'teams',
      })
      toast.success('Meeting scheduled', `Saved for ${new Date(iso).toLocaleString()}.`)
      onSaved()
    } catch (e) {
      toast.error('Could not schedule', e?.response?.data?.detail || 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Schedule meeting · #${RID}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
          <div className="text-sm font-bold text-slate-900 dark:text-white">{subj}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">request #{RID}</div>
        </div>

        <div>
          <label className="label">Date and time</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="datetime-local" required value={when}
                   onChange={(e) => setWhen(e.target.value)} className="input pl-9" />
          </div>
        </div>

        <div>
          <label className="label flex items-center justify-between">
            <span>Microsoft Teams meeting link</span>
            <button type="button" onClick={buildTeamsLink}
                    className="text-[11px] text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
              <Video size={11} /> generate
            </button>
          </label>
          <input type="url" value={link}
                 onChange={(e) => setLink(e.target.value)}
                 placeholder="https://teams.microsoft.com/l/meeting/..."
                 className="input" />
          <div className="mt-1 text-[11px] text-slate-500">
            Optional leave empty if you'll paste the link later from your calendar.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            <XIcon size={14} /> Cancel
          </button>
          <button disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : <><CalendarPlus size={14} /> Save schedule</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Pill({ n, cls, label }) {
  // Render the pill, but dim 0-counts so the row doesn't feel noisy when
  // nothing's happening yet.
  const muted = n === 0
  return (
    <span className={`badge ring-1 whitespace-nowrap ${cls} ${muted ? 'opacity-50' : ''}`}>
      {label}: <span className="ml-1 nums">{n}</span>
    </span>
  )
}

function StatusDot({ status }) {
  const cls = {
    pending: 'bg-amber-500', accepted: 'bg-brand-500', in_call: 'bg-violet-500',
    closed: 'bg-emerald-500', cancelled: 'bg-slate-400',
  }[status] || 'bg-slate-400'
  return <span className={`w-2.5 h-2.5 rounded-full ${cls} ring-2 ring-white shadow shrink-0 mt-2`} />
}

function StatusBadge({ status }) {
  const map = {
    pending:   'bg-amber-100  text-amber-800  ring-amber-200',
    accepted:  'bg-brand-100  text-brand-800  ring-brand-200',
    in_call:   'bg-violet-100 text-violet-800 ring-violet-200',
    closed:    'bg-emerald-100 text-emerald-800 ring-emerald-200',
    cancelled: 'bg-slate-200  text-slate-700  ring-slate-300',
  }
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{status}</span>
}
