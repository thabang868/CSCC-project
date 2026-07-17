import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, ShieldCheck, BadgeCheck, Calendar,
  Headphones, Ticket, Clock, RefreshCw, Activity, MessageSquare,
  Video, AlertTriangle, Lock, ChevronRight, User as UserIcon,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import { Modal } from './Tickets.jsx'
import { api, supportApi } from '../services/api.js'
import { roleLabel } from '../utils/roles.js'
import { useToast } from '../context/ToastContext.jsx'
import { useRefresh } from '../context/RefreshContext.jsx'
import useAccess from '../hooks/useAccess.js'

const fmtNum = (v) => Number(v || 0).toLocaleString()
const fmtDur = (sec) => {
  const s = Math.max(0, Number(sec || 0))
  const m = Math.floor(s / 60)
  return s < 60 ? `${s}s` : m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : ''

const CHANNEL_ICON = { teams: Video, email: Mail, phone: Phone }

export default function Customer360() {
  const { id } = useParams()
  const access = useAccess()
  const toast = useToast()
  const nav = useNavigate()
  const { refreshKey, bump } = useRefresh()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true); setErr('')
    supportApi.customer360(id)
      .then(setData)
      .catch((e) => setErr(e?.response?.data?.detail || 'Could not load Customer 360.'))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  if (loading) return <Loader label="Loading Customer 360…" />
  if (err) {
    return (
      <div className="card p-10 text-center">
        <AlertTriangle className="mx-auto text-rose-600" size={28} />
        <div className="mt-3 font-bold text-rose-900">{err}</div>
        <button onClick={() => nav(-1)} className="btn-ghost mt-4"><ArrowLeft size={14} /> Back</button>
      </div>
    )
  }
  if (!data) return null

  const u = data.user
  const s = data.summary

  // Admin + company agents both see call records. Only admins may decrypt
  // and play the audio; company agents are limited to the transcript.
  const canSeeCallRecords = access.isAdmin || access.role === 'company'
  const canDecryptAudio = access.isAdmin

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer 360 · Single-pane view"
        actions={
          <>
            <button onClick={() => nav(-1)} className="btn-ghost text-xs">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={bump} className="btn-ghost text-xs">
              <RefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      {/* HERO */}
      <div className="card p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-brand-900 to-brand-950 text-white">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur ring-2 ring-white/20 grid place-items-center text-white text-3xl font-extrabold shadow-glow">
            {u.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{u.full_name}</div>
            <div className="text-sm text-white/80">{u.email}</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Badge>{roleLabel(u.role).toUpperCase()}</Badge>
              {u.client_group && <Badge>{u.client_group.toUpperCase()}</Badge>}
              {u.email_verified && <Badge tone="success"><BadgeCheck size={11} className="mr-1" /> Verified</Badge>}
              {!u.is_active && <Badge tone="danger">Disabled</Badge>}
              {u.phone && <Badge><Phone size={11} className="mr-1" /> {u.phone}</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:max-w-md">
            <Mini value={fmtNum(s.total_requests)}        label="Requests" />
            <Mini value={fmtNum(s.total_calls)}           label="Calls" />
            <Mini value={fmtDur(s.total_call_seconds)}    label="Talk time" />
            <Mini value={fmtNum(s.total_tickets)}         label="Tickets" />
          </div>
        </div>
      </div>

      {/* PROFILE + STATUS */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <div className="eyebrow">Profile</div>
          <div className="font-bold text-slate-900 dark:text-white mt-1 mb-3">Account details</div>
          <dl className="space-y-2 text-sm">
            <Row icon={Mail}        label="Email"        value={u.email} />
            <Row icon={Phone}       label="Phone"        value={u.phone || ''} />
            <Row icon={ShieldCheck} label="Role"         value={roleLabel(u.role)} />
            <Row icon={UserIcon}    label="Client group" value={u.client_group || ''} />
            <Row icon={Calendar}    label="Member since" value={new Date(u.created_at).toLocaleDateString()} />
            <Row icon={Clock}       label="Last contact" value={fmtDate(s.last_contact)} />
          </dl>

          <div className="h-px bg-slate-100 dark:bg-white/10 my-5" />

          <div className="eyebrow">Open</div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Counter n={s.open_requests} label="Open requests" cls="bg-amber-50 text-amber-800 ring-amber-200" />
            <Counter n={s.open_tickets}  label="Open tickets"  cls="bg-brand-50 text-brand-800 ring-brand-200" />
          </div>
        </div>

        {/* Recent support requests */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="eyebrow flex items-center gap-1.5"><Headphones size={12} /> Support history</div>
              <div className="font-bold text-slate-900 dark:text-white mt-1">Recent support requests</div>
            </div>
            <Link to="/app/support/dashboard" className="text-xs link">All requests →</Link>
          </div>
          {data.requests.length === 0 ? (
            <Empty label="No support requests yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {data.requests.slice(0, 6).map((r) => {
                const C = CHANNEL_ICON[r.Channel] || Phone
                return (
                  <li key={r.RequestID} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 grid place-items-center">
                      <C size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{r.Subject}</div>
                      <div className="text-[11px] text-slate-500">
                        #{r.RequestID} · {r.Channel} · {r.Priority} · {fmtDate(r.CreatedAt)}
                      </div>
                    </div>
                    <StatusBadge status={r.Status} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* CALLS */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="eyebrow flex items-center gap-1.5"><Lock size={12} /> Encrypted call records</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1">Calls captured</div>
          </div>
          <span className="text-xs text-slate-500">AES-256-GCM at rest</span>
        </div>
        {data.calls.length === 0 ? (
          <Empty label="No calls captured yet." />
        ) : (
          // table-fixed + w-full keeps the table exactly the card width, so it
          // never overflows / scrolls sideways. Long values truncate; the
          // action buttons wrap within their cell on tight widths.
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              {canSeeCallRecords && <col className="w-[21%]" />}
            </colgroup>
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <th className="text-left  px-3 py-2 font-bold">Call</th>
                <th className="text-left  px-3 py-2 font-bold">Channel</th>
                <th className="text-right px-3 py-2 font-bold">Duration</th>
                <th className="text-left  px-3 py-2 font-bold">Status</th>
                <th className="text-right px-3 py-2 font-bold">When</th>
                {canSeeCallRecords && <th className="text-right px-3 py-2 font-bold">Records</th>}
              </tr>
            </thead>
            <tbody>
              {data.calls.slice(0, 20).map((c) => {
                const C = CHANNEL_ICON[c.Channel] || Phone
                return (
                  <tr key={c.CallID} className="border-t border-slate-100 dark:border-white/10 align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{c.Subject}</div>
                      <div className="text-[11px] text-slate-500">#{c.CallID} · request #{c.RequestID}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 capitalize text-slate-700 dark:text-slate-200">
                        <C size={13} /> {c.Channel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right nums whitespace-nowrap">{fmtDur(c.DurationSeconds)}</td>
                    <td className="px-3 py-3"><span className="badge bg-emerald-100 text-emerald-800 ring-emerald-200">{c.ProcessingStatus}</span></td>
                    <td className="px-3 py-3 text-right text-xs text-slate-500">{fmtDate(c.StartedAt)}</td>
                    {canSeeCallRecords && (
                      <td className="px-3 py-3">
                        <AdminCallActions
                          callId={c.CallID}
                          hasAudio={!!c.HasAudio}
                          hasTranscript={!!c.HasTranscript}
                          canDecryptAudio={canDecryptAudio}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* TICKETS + AUDIT */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="eyebrow flex items-center gap-1.5"><Ticket size={12} /> Decision tickets</div>
          <div className="font-bold text-slate-900 dark:text-white mt-1 mb-3">Recent tickets raised</div>
          {data.tickets.length === 0 ? (
            <Empty label="No tickets yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {data.tickets.slice(0, 6).map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 grid place-items-center">
                    <Ticket size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{t.title}</div>
                    <div className="text-[11px] text-slate-500">{t.category} · {t.priority} · {fmtDate(t.created_at)}</div>
                  </div>
                  <TicketStatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="eyebrow flex items-center gap-1.5"><Activity size={12} /> Audit trail</div>
          <div className="font-bold text-slate-900 dark:text-white mt-1 mb-3">Recent activity</div>
          {data.audit.length === 0 ? (
            <Empty label="No activity recorded yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {data.audit.slice(0, 12).map((a) => (
                <li key={a.AuditID} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-slate-700 dark:text-slate-200 truncate">{a.Action}</div>
                    <div className="text-[10px] text-slate-500">{fmtDate(a.CreatedAt)} · {a.TargetType || ''} #{a.TargetID || ''}</div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function Mini({ value, label }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/20 px-3 py-2.5 text-center">
      <div className="nums text-xl font-extrabold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">{label}</div>
    </div>
  )
}

function Badge({ children, tone }) {
  const map = {
    success: 'bg-emerald-500/20 text-white ring-1 ring-emerald-300/30',
    danger:  'bg-rose-500/20    text-white ring-1 ring-rose-300/30',
  }
  const cls = map[tone] || 'bg-white/15 text-white ring-1 ring-white/20'
  return <span className={`badge ${cls}`}>{children}</span>
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 grid place-items-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold">{label}</dt>
        <dd className="text-slate-800 dark:text-slate-100 font-semibold truncate">{value || '-'}</dd>
      </div>
    </div>
  )
}

function Counter({ n, label, cls }) {
  return (
    <div className={`rounded-xl ring-1 px-3 py-3 ${cls}`}>
      <div className="nums text-2xl font-extrabold">{n ?? 0}</div>
      <div className="text-[10px] uppercase tracking-widest font-bold mt-0.5 opacity-80">{label}</div>
    </div>
  )
}

function Empty({ label }) {
  return <div className="text-center py-8 text-sm text-slate-500">{label}</div>
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

function TicketStatusBadge({ status }) {
  const map = {
    pending:  'bg-amber-100 text-amber-800 ring-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 ring-rose-200',
    closed:   'bg-slate-200 text-slate-700 ring-slate-300',
  }
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{status}</span>
}

function AdminCallActions({ callId, hasAudio, hasTranscript, canDecryptAudio = false }) {
  const [busy, setBusy] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [transcript, setTranscript] = useState(null) // string while open, null when closed
  const toast = useToast()

  const showTranscript = async () => {
    setBusy(true)
    try {
      const r = await supportApi.transcript(callId)
      setTranscript(r.transcript || '')
    } catch (e) {
      toast.error('Could not decrypt', e?.response?.data?.detail || 'Try again later.')
    } finally {
      setBusy(false)
    }
  }

  const fetchAudio = async () => {
    setBusy(true)
    try {
      const r = await api.get(`/api/support/calls/${callId}/audio`, { responseType: 'blob' })
      setAudioUrl(URL.createObjectURL(r.data))
    } catch (e) {
      toast.error('Could not decrypt', e?.response?.data?.detail || 'Try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {hasTranscript ? (
          <button onClick={showTranscript} disabled={busy} className="btn-soft !px-2 !py-1 text-[11px]">
            <MessageSquare size={12} /> Transcript
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 ring-1 ring-slate-200 dark:ring-white/10 px-2 py-1 text-[11px]"
                title="No transcript saved for this call">
            <MessageSquare size={12} /> No transcript
          </span>
        )}
        {/* Audio is admin-only. Show the live Decrypt control when a
            recording exists; otherwise an explicit "No audio" marker so it's
            clear the recording is absent (not hidden by a bug). */}
        {canDecryptAudio && (
          hasAudio ? (
            !audioUrl && (
              <button onClick={fetchAudio} disabled={busy} className="btn-soft !px-2 !py-1 text-[11px]">
                <Headphones size={12} /> {busy ? 'Decrypting…' : 'Decrypt audio'}
              </button>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 ring-1 ring-slate-200 dark:ring-white/10 px-2 py-1 text-[11px]"
                  title="No audio recording stored for this call">
              <Headphones size={12} /> No audio
            </span>
          )
        )}
      </div>
      {audioUrl && <audio src={audioUrl} controls className="h-7 max-w-[220px] w-full" />}
      {transcript !== null && (
        <TranscriptDialog callId={callId} text={transcript} onClose={() => setTranscript(null)} />
      )}
    </div>
  )
}

/* Parse a stored "Name: text" dialogue transcript into speaker turns. Falls
   back to a single block for legacy flat transcripts (no speaker labels). */
function parseDialogue(text) {
  const lines = (text || '').split(/\r?\n/)
  const turns = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^([^:]{1,60}):\s?(.*)$/)
    if (m && m[2]) {
      turns.push({ speaker: m[1].trim(), text: m[2].trim() })
    } else if (turns.length) {
      turns[turns.length - 1].text += ' ' + line
    } else {
      turns.push({ speaker: '', text: line })
    }
  }
  return turns
}

const SPEAKER_TONES = [
  'bg-brand-50 text-brand-900',
  'bg-violet-50 text-violet-900',
  'bg-emerald-50 text-emerald-900',
  'bg-amber-50 text-amber-900',
  'bg-sky-50 text-sky-900',
]

function TranscriptDialog({ callId, text, onClose }) {
  const turns = parseDialogue(text)
  // Stable colour per distinct speaker name.
  const speakers = []
  const toneFor = (name) => {
    const key = name || '—'
    let i = speakers.indexOf(key)
    if (i === -1) { speakers.push(key); i = speakers.length - 1 }
    return SPEAKER_TONES[i % SPEAKER_TONES.length]
  }

  return (
    <Modal title={`Transcript · call #${callId}`} onClose={onClose}>
      {turns.length === 0 ? (
        <div className="text-center text-sm text-slate-500 py-8">No transcript saved for this call.</div>
      ) : (
        <div className="space-y-3">
          {turns.map((t, idx) => (
            <div key={idx} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0 bg-slate-200 text-slate-700">
                {(t.speaker || '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                {t.speaker && (
                  <div className="text-[11px] font-bold text-slate-600">{t.speaker}</div>
                )}
                <div className={`inline-block rounded-2xl px-3 py-2 text-sm mt-0.5 whitespace-pre-wrap ${toneFor(t.speaker)}`}>
                  {t.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
