import { useEffect, useState } from 'react'
import { Plus, Ticket as TicketIcon, AlertCircle, Mail, MailCheck, Mic, Keyboard, Volume2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import VoiceRecorder from '../components/VoiceRecorder.jsx'
import AIIntakePanel from '../components/AIIntakePanel.jsx'
import { ticketApi } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useRefresh } from '../context/RefreshContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const CATEGORIES = [
  { value: 'decision', label: 'Decision' },
  { value: 'support',  label: 'Support'  },
  { value: 'data',     label: 'Data'     },
]
const PRIORITIES = ['low', 'medium', 'high']

export default function Tickets() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: 'decision', priority: 'medium' })
  const [mode, setMode] = useState('type') // 'type' | 'voice'
  const [voice, setVoice] = useState(null) // { blob, mime, durationSeconds, transcript }
  const [intake, setIntake] = useState(null) // last AI result for the open form
  const { user } = useAuth()
  const { refreshKey } = useRefresh()
  const toast = useToast()

  // Every ticket routes automatically into the approval workflow — it goes
  // to the admin to approve, reject or close. No recipient is chosen.
  const load = () => {
    setLoading(true)
    ticketApi.mine().then(setItems).finally(() => setLoading(false))
  }
  useEffect(load, [refreshKey])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (mode === 'voice' && !voice?.blob) {
      setErr('Record a voice note before submitting, or switch to typing.')
      return
    }
    if (mode === 'type' && (form.description || '').trim().length < 5) {
      setErr('Description must be at least 5 characters.')
      return
    }
    setCreating(true)
    try {
      const payload = {
        title:       form.title,
        description: mode === 'type' ? form.description : '',
        category:    form.category,
        priority:    form.priority,
      }
      await ticketApi.create(payload, mode === 'voice' ? voice : null)
      toast.success('Ticket submitted', 'Sent to the admin for review. Track it in your list below.')
      setForm({ title: '', description: '', category: 'decision', priority: 'medium' })
      setVoice(null); setMode('type'); setIntake(null)
      setOpen(false)
      load()
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not create the ticket.')
    } finally {
      setCreating(false)
    }
  }

  const counts = items.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decision workflow · admin approval"
        title="My tickets"
        actions={
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> New ticket
          </button>
        }
      />

      {/* Stat strip */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Mini label="Total"     n={items.length}        accent="rose" />
          <Mini label="Pending"   n={counts.pending  || 0} accent="rose" />
          <Mini label="Approved"  n={counts.approved || 0} accent="rose" />
          <Mini label="Rejected"  n={counts.rejected || 0} accent="rose" />
        </div>
      )}

      {loading ? (
        <Loader label="Loading tickets…" />
      ) : items.length === 0 ? (
        <Empty onCreate={() => setOpen(true)} />
      ) : (
        <div className="grid gap-3">
          {items.map((t) => <TicketRow key={t.id} t={t} />)}
        </div>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} title="Create a ticket">
          <form onSubmit={submit} className="space-y-4">
            {err && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
              </div>
            )}
            <div>
              <label className="label">Title</label>
              <input className="input" required minLength={3} value={form.title}
                     onChange={(e) => setForm({ ...form, title: e.target.value })}
                     placeholder="e.g. Approve Q4 territory reallocation" />
            </div>
            <div>
              <label className="label">Description</label>
              <div className="inline-flex p-1 mb-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button type="button"
                        onClick={() => setMode('type')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          mode === 'type' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                  <Keyboard size={13} /> Type
                </button>
                <button type="button"
                        onClick={() => setMode('voice')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          mode === 'voice' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                  <Mic size={13} /> Record voice
                </button>
              </div>
              {mode === 'type' ? (
                <textarea className="input min-h-[110px]" required={mode === 'type'} minLength={5} value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Add the context, options considered, and the decision you need." />
              ) : (
                <VoiceRecorder value={voice} onChange={setVoice} />
              )}
            </div>

            {/* AI intake — runs on the description or the live voice
                transcript. Suggested category / priority are auto-applied
                only when the user hasn't deviated from the defaults. */}
            <AIIntakePanel
              transcript={mode === 'voice' ? (voice?.transcript || '') : form.description}
              speakerEmail={user?.email}
              onResult={(r) => {
                setIntake(r)
                setForm((f) => ({
                  ...f,
                  category: f.category === 'decision' && r?.category ? r.category : f.category,
                  priority: f.priority === 'medium'   && r?.priority ? r.priority : f.priority,
                }))
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button disabled={creating} className="btn-primary">
                {creating ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Mini({ label, n }) {
  // Single brand-tinted surface for every KPI tile — a clear background
  // colour (not white), kept uniform across all four so it stays clean.
  const cls = 'bg-brand-50 text-brand-800 ring-brand-100'
  return (
    <div className={`rounded-2xl ring-1 px-4 py-3.5 ${cls} shadow-soft`}>
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold opacity-80">{label}</div>
      <div className="nums text-2xl font-extrabold mt-0.5">{n}</div>
    </div>
  )
}

export function TicketRow({ t, showRequester = false, action = null }) {
  return (
    <div className="card card-hover p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className={`w-11 h-11 rounded-xl grid place-items-center shadow-soft ${categoryStyle(t.category)}`}>
        <TicketIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-bold text-slate-900 truncate max-w-full">{t.title}</div>
          <StatusBadge status={t.status} />
          <span className={`badge ${priorityStyle(t.priority)}`}>priority · {t.priority}</span>
          <span className="badge bg-slate-100 text-slate-700 ring-slate-200">{t.category}</span>
          {t.has_voice_note && (
            <span className="badge bg-rose-50 text-rose-700 ring-rose-200 inline-flex items-center gap-1">
              <Volume2 size={11} /> voice note
            </span>
          )}
          {(t.ai_company || t.ai_affected_system) && (
            <span className="badge bg-violet-50 text-violet-700 ring-violet-200 text-[10px] inline-flex items-center gap-1">
              AI · {t.ai_company || t.ai_affected_system}
              {t.ai_company && t.ai_affected_system ? ` / ${t.ai_affected_system}` : ''}
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-slate-600 line-clamp-2 break-words">{t.description}</div>
        {t.has_voice_note && <TicketVoicePlayer ticketId={t.id} />}
        <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
          <span>Created {new Date(t.created_at).toLocaleString()}</span>
          {showRequester && <span>· by user #{t.requester_id}</span>}
          {t.recipient_email && (
            <span className="inline-flex items-center gap-1">
              {t.email_sent
                ? <><MailCheck size={11} className="text-emerald-600" /> emailed to {t.recipient_email}</>
                : <><Mail      size={11} className="text-slate-400"   /> queued for {t.recipient_email}</>
              }
            </span>
          )}
          {t.review_note && <span className="italic">note: {t.review_note}</span>}
        </div>
      </div>
      {action && <div className="shrink-0 sm:self-center">{action}</div>}
    </div>
  )
}

function TicketVoicePlayer({ ticketId }) {
  const [src, setSrc] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    if (src) return
    setLoading(true); setErr('')
    try {
      const blob = await ticketApi.audioBlob(ticketId)
      setSrc(URL.createObjectURL(blob))
    } catch (e) {
      setErr(e?.response?.status === 403 ? 'Not authorised to play this recording.' : 'Could not load recording.')
    } finally {
      setLoading(false)
    }
  }

  if (err) return <div className="mt-2 text-xs text-rose-700">{err}</div>
  if (!src) {
    return (
      <button type="button" onClick={load}
              disabled={loading}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900">
        <Volume2 size={12} /> {loading ? 'Loading…' : 'Play voice note'}
      </button>
    )
  }
  return (
    <audio src={src} controls className="mt-2 h-9 w-full max-w-md" />
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending:  'bg-amber-100 text-amber-800 ring-amber-200',
    approved: 'bg-rose-100 text-rose-800 ring-rose-200',
    rejected: 'bg-rose-100 text-rose-800 ring-rose-200',
    closed:   'bg-slate-200 text-slate-700 ring-slate-300',
  }
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{status}</span>
}

function categoryStyle(cat) {
  return {
    decision: 'bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700',
    support:  'bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700',
    data:     'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700',
  }[cat] || 'bg-slate-100 text-slate-700'
}

function priorityStyle() {
  // Unified light-red for every priority level (low / medium / high).
  return 'bg-rose-100 text-rose-700 ring-rose-200'
}

function Empty({ onCreate }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 grid place-items-center shadow-soft">
        <TicketIcon size={26} />
      </div>
      <div className="mt-4 font-bold text-slate-900 text-lg">No tickets yet</div>
      <p className="text-sm text-slate-600 mt-1.5 max-w-sm mx-auto">Submit your first decision ticket admins will review and approve.</p>
      <button onClick={onCreate} className="btn-primary mt-5 mx-auto">
        <Plus size={16} /> New ticket
      </button>
    </div>
  )
}

export function Modal({ title, children, onClose }) {
  // z-[70] keeps the modal above the FloatingAgent (z-[55]) and the
  // SearchPalette (z-[60]). Inner layout: sticky header on top, sticky
  // footer is up to the consumer; the body scrolls so every control
  // (Cancel, Save, etc.) is always reachable on small screens.
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card animate-pop-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white/80 dark:bg-slate-900/40 backdrop-blur rounded-t-2xl">
          <div className="font-bold text-slate-900 dark:text-white text-lg truncate">{title}</div>
          <button className="btn-soft !px-2.5 !py-1.5 shrink-0" onClick={onClose}>Close</button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
