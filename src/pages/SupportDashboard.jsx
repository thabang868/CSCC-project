import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Phone, Video, Mic, Square, X,
  CheckCircle2, RefreshCw, Headphones, Lock, UserCircle2, Clock,
  Plus, Trash2, Users, Pencil, Send,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import AIIntakePanel from '../components/AIIntakePanel.jsx'
import { supportApi } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { useRefresh } from '../context/RefreshContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { Modal } from './Tickets.jsx'

// Turn a registered email into a friendly display name when we don't have a
// full name to hand (e.g. "daniel.lukayi@x.com" -> "Daniel Lukayi").
function nameFromEmail(email) {
  if (!email) return ''
  const local = String(email).split('@')[0] || ''
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

// Serialise a list of speaker turns into a Teams-style dialogue transcript:
//   Thabang Maleka: Hello, how can I help?
//   Daniel Lukayi: I can't log into the portal.
// Stored as plain text (then AES-256-GCM encrypted server-side) so the admin
// can read exactly who said what, and the AI intake can still parse it.
function serializeDialogue(turns, participants) {
  const who = (id) => {
    const p = participants.find((x) => x.id === id)
    return (p && (p.name || p.email)) || 'Speaker'
  }
  return turns
    .map((t) => ({ ...t, text: (t.text || '').trim() }))
    .filter((t) => t.text)
    .map((t) => `${who(t.speakerId)}: ${t.text}`)
    .join('\n')
}

const POLL_MS = 8000

const CHANNEL_ICONS = { teams: Video, phone: Phone }

export default function SupportDashboard() {
  const toast = useToast()
  const { refreshKey, bump } = useRefresh()
  const [stats, setStats] = useState(null)
  const [items, setItems] = useState([])
  const [agents, setAgents] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [openCall, setOpenCall] = useState(null) // request being acted on

  const load = () => {
    setLoading(true)
    Promise.all([
      supportApi.dashboard().catch(() => null),
      supportApi.listAll(filter || undefined).catch(() => []),
      supportApi.agents().catch(() => []),
    ]).then(([s, list, ags]) => {
      setStats(s); setItems(list)
      setAgents(Object.fromEntries(ags.map((a) => [a.id, a])))
    }).finally(() => setLoading(false))
  }
  useEffect(load, [refreshKey, filter])

  // Auto-refresh every 8s while the page is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') bump()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [bump])

  const accept = async (req) => {
    try {
      await supportApi.update(req.RequestID, { status: 'accepted' })
      toast.success('Accepted', `Request #${req.RequestID} is now yours.`)
      bump()
    } catch (e) {
      toast.error('Could not accept', e?.response?.data?.detail || 'Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live Support · Admin & Executive_Team"
        title="Support Connect dashboard"
        actions={
          <>
            <button onClick={bump} className="btn-ghost text-xs">
              <RefreshCw size={14} /> Refresh
            </button>
            <span className="badge bg-brand-50 text-brand-800 ring-brand-200">
              <ShieldCheck size={14} className="mr-1" /> Restricted
            </span>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Pending"   n={stats?.pending} />
        <KPI label="Accepted"  n={stats?.accepted} />
        <KPI label="In call"   n={stats?.in_call} />
        <KPI label="Closed"    n={stats?.closed} />
        <KPI label="Requests"  n={stats?.total_requests} />
        <KPI label="Calls"     n={stats?.total_calls} />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'accepted', 'in_call', 'closed'].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
                  className={filter === s ? 'btn-primary text-xs !px-3 !py-1.5' : 'btn-ghost text-xs !px-3 !py-1.5'}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-3 sm:p-4 overflow-hidden">
        {loading ? (
          <Loader label="Loading dashboard…" />
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Headphones className="mx-auto text-slate-300" size={28} />
            <div className="mt-2 text-sm">No support requests in this view.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="text-left  px-3 py-2 font-bold">Request</th>
                  <th className="text-left  px-3 py-2 font-bold">Channel</th>
                  <th className="text-left  px-3 py-2 font-bold">Status</th>
                  <th className="text-left  px-3 py-2 font-bold">Agent</th>
                  <th className="text-right px-3 py-2 font-bold">Created</th>
                  <th className="text-right px-3 py-2 font-bold sticky right-0 bg-white border-l border-slate-100">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const Icon = CHANNEL_ICONS[r.Channel] || Phone
                  const agent = agents[r.AgentUserID]
                  return (
                    <tr key={r.RequestID} className="border-t border-slate-100 dark:border-white/10">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px]">{r.Subject}</div>
                        <div className="text-[11px] text-slate-500">#{r.RequestID} · from user #{r.RequesterUserID} · {r.Priority}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 capitalize">
                          <Icon size={14} /> {r.Channel}
                        </span>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={r.Status} /></td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                        {agent ? agent.full_name : <span className="text-slate-400">unassigned</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-500">
                        <div>{new Date(r.CreatedAt).toLocaleString()}</div>
                        {r.ScheduledAt && (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                            <Clock size={11} /> {new Date(r.ScheduledAt).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right sticky right-0 bg-white border-l border-slate-100">
                        <div className="inline-flex gap-1.5 whitespace-nowrap">
                          <Link to={`/app/support/customer/${r.RequesterUserID}`}
                                className="btn-ghost text-xs !py-1.5" title="Open Customer 360">
                            <UserCircle2 size={14} /> 360
                          </Link>
                          {r.Status === 'pending' && (
                            <button onClick={() => accept(r)} className="btn-soft text-xs !py-1.5">
                              <CheckCircle2 size={14} /> Accept
                            </button>
                          )}
                          {(r.Status === 'accepted' || r.Status === 'in_call') && (
                            <button onClick={() => setOpenCall(r)} className="btn-primary text-xs !py-1.5">
                              <Phone size={14} /> Connect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openCall && (
        <CallModal request={openCall} onClose={() => { setOpenCall(null); bump() }} />
      )}
    </div>
  )
}

function KPI({ label, n }) {
  return (
    <div className="rounded-2xl ring-1 ring-slate-200 bg-white px-4 py-3 shadow-soft">
      <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">{label}</div>
      <div className="nums text-2xl font-extrabold mt-0.5 text-brand-700">{n ?? ''}</div>
    </div>
  )
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

/* -------------------- Call modal -------------------- */
function CallModal({ request, onClose }) {
  const toast = useToast()
  const { user } = useAuth()
  const [hotline, setHotline] = useState('076 363 9505')
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const tickRef = useRef(null)
  const speechRef = useRef(null)
  const [interim, setInterim] = useState('')
  const [speechSupported] = useState(() => {
    return typeof window !== 'undefined' &&
           ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  })

  // ---- Meeting participants + speaker-tagged dialogue ------------------
  // Seed the conversation with the two known, registered identities: the
  // company agent running the call (current user) and the requester who
  // opened the ticket. The agent can add further participants live.
  const [participants, setParticipants] = useState(() => {
    const reqEmail = request.ContactEmail || ''
    return [
      { id: 'agent', name: user?.full_name || 'Agent', email: user?.email || '' },
      {
        id: 'requester',
        name: nameFromEmail(reqEmail) || `Caller #${request.RequesterUserID}`,
        email: reqEmail,
      },
    ]
  })
  const [turns, setTurns] = useState([])          // { speakerId, text }
  const [activeSpeaker, setActiveSpeaker] = useState('agent')
  const activeSpeakerRef = useRef('agent')        // latest value for the speech callback
  const [editingTurn, setEditingTurn] = useState(null)
  const [manualText, setManualText] = useState('')

  const chooseSpeaker = (id) => { activeSpeakerRef.current = id; setActiveSpeaker(id) }

  // Append a finalised chunk of speech to the dialogue under whoever is the
  // active speaker right now. Consecutive chunks from the same speaker merge
  // into one turn so the transcript reads naturally.
  const appendFinal = (text) => {
    const clean = (text || '').trim()
    if (!clean) return
    const sid = activeSpeakerRef.current
    setTurns((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.speakerId === sid) {
        const copy = prev.slice()
        copy[copy.length - 1] = { ...last, text: `${last.text} ${clean}`.trim() }
        return copy
      }
      return [...prev, { speakerId: sid, text: clean }]
    })
  }

  const addManualLine = () => {
    if (!manualText.trim()) return
    appendFinal(manualText)
    setManualText('')
  }

  const transcriptText = serializeDialogue(turns, participants)
  const activeName = (participants.find((p) => p.id === activeSpeaker) || {}).name || 'speaker'

  useEffect(() => {
    supportApi.hotline().then((h) => setHotline(h.company_hotline)).catch(() => {})
    return stopRecording
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startSpeech = () => {
    if (!speechSupported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (event) => {
      let interimText = ''
      let appendedFinal = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const txt = res[0].transcript
        if (res.isFinal) appendedFinal += (appendedFinal ? ' ' : '') + txt.trim()
        else             interimText  += txt
      }
      // Attribute the finalised segment to the speaker the agent has marked
      // as active — this is what makes the transcript switch names live.
      if (appendedFinal) appendFinal(appendedFinal)
      setInterim(interimText)
    }
    rec.onerror = () => { /* ignore Web Speech is best-effort */ }
    rec.onend = () => { /* recogniser stops automatically on silence */ }
    speechRef.current = rec
    try { rec.start() } catch {}
  }

  const stopSpeech = () => {
    if (speechRef.current) {
      try { speechRef.current.stop() } catch {}
      speechRef.current = null
    }
    setInterim('')
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stopMic()
      }
      recRef.current = rec
      rec.start()
      setRecording(true); setSeconds(0)
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      startSpeech()
    } catch (e) {
      toast.error('Microphone error', 'Could not access the microphone. Check browser permissions.')
    }
  }
  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    if (tickRef.current) clearInterval(tickRef.current)
    setRecording(false)
    stopSpeech()
  }
  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!audioBlob && !transcriptText.trim()) {
      toast.error('Nothing to save', 'Capture the conversation or record audio first.')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('transcript', transcriptText)
      fd.append('duration_seconds', String(seconds || 0))
      if (audioBlob) fd.append('audio', audioBlob, `call-${request.RequestID}.webm`)
      await supportApi.endCall(request.RequestID, fd)
      toast.success('Call captured', 'Audio and transcript encrypted and stored securely.')
      onClose()
    } catch (e) {
      toast.error('Could not save call', e?.response?.data?.detail || 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Build channel deep links from the (registered) target user info we have.
  const targetEmail = request.ContactEmail || ''
  const targetPhone = request.ContactPhone || hotline
  const channels = {
    teams: `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(targetEmail)}`,
    phone: `tel:${targetPhone.replace(/\s/g, '')}`,
  }

  return (
    <Modal onClose={onClose} title={`Connect · #${request.RequestID}`}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
          <div className="text-sm font-bold text-slate-900 dark:text-white">{request.Subject}</div>
          <div className="text-xs text-slate-500 mt-0.5">From user #{request.RequesterUserID} · {request.Priority} · {request.Channel}</div>
          {request.Message && (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{request.Message}</p>
          )}
        </div>

        <div>
          <div className="label">Open the channel</div>
          <div className="grid grid-cols-2 gap-2">
            <a href={channels.teams} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
              <Video size={14} /> Teams
            </a>
            <a href={channels.phone} className="btn-ghost text-xs">
              <Phone size={14} /> Call {targetPhone}
            </a>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            For email correspondence, use My Tickets.
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <div className="label flex items-center justify-between">
              <span>Capture call · audio is encrypted (AES-GCM)</span>
              <span className="text-[11px] font-mono">{formatTime(seconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              {!recording ? (
                <button type="button" onClick={startRecording} className="btn-primary text-xs">
                  <Mic size={14} /> {audioBlob ? 'Record again' : 'Start recording'}
                </button>
              ) : (
                <button type="button" onClick={stopRecording} className="btn-danger text-xs">
                  <Square size={14} /> Stop
                </button>
              )}
              {audioBlob && !recording && (
                <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> Audio ready ({(audioBlob.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Conversation transcript — Teams-style, speaker-tagged. The
              agent marks who is currently talking; finalised speech (and any
              typed lines) is recorded under that registered person live. */}
          <div>
            <div className="label flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><Users size={12} /> Conversation transcript</span>
              {speechSupported ? (
                <span className={`text-[10px] uppercase tracking-widest font-bold inline-flex items-center gap-1 ${
                  recording ? 'text-rose-600' : 'text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${recording ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                  {recording ? 'Live transcription on' : 'Live transcription ready'}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Live transcription not supported — type below</span>
              )}
            </div>

            <SpeakerBar
              participants={participants}
              activeSpeaker={activeSpeaker}
              onChoose={chooseSpeaker}
              onAdd={(p) => { setParticipants((prev) => [...prev, p]); chooseSpeaker(p.id) }}
            />

            <DialogueView
              turns={turns}
              participants={participants}
              interim={recording ? interim : ''}
              activeSpeaker={activeSpeaker}
              editingTurn={editingTurn}
              setEditingTurn={setEditingTurn}
              onEdit={(idx, text) => setTurns((prev) => prev.map((t, i) => (i === idx ? { ...t, text } : t)))}
              onDelete={(idx) => { setTurns((prev) => prev.filter((_, i) => i !== idx)); setEditingTurn(null) }}
            />

            <div className="mt-2 flex items-center gap-2">
              <input
                className="input !py-2 text-sm flex-1"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualLine() } }}
                placeholder={`Type what ${activeName} said…`}
              />
              <button type="button" onClick={addManualLine} className="btn-soft text-xs shrink-0">
                <Send size={14} /> Add
              </button>
            </div>
          </div>

          {/* Live AI intake — runs while the agent talks. Surfaces the
              caller's company, the affected system, suggested category +
              priority. Saving the call also produces an auto-ticket
              server-side using these same signals. */}
          <AIIntakePanel
            transcript={transcriptText}
            speakerEmail={request.ContactEmail || null}
          />

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Lock size={12} /> AES-256-GCM encryption · stored in support.Calls (AdventureWorks_DW)
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">
              <X size={14} /> Cancel
            </button>
            <button disabled={saving} className="btn-primary">
              {saving ? 'Encrypting…' : 'Save & close call'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

/* -------------------- Speaker selector -------------------- */
// Lets the agent mark who is currently talking. Whatever is finalised by
// live transcription (or typed) is then attributed to that registered
// participant, so the transcript switches names live.
function SpeakerBar({ participants, activeSpeaker, onChoose, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const confirmAdd = () => {
    const nm = name.trim()
    if (!nm) return
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    onAdd({ id, name: nm, email: email.trim() })
    setName(''); setEmail(''); setAdding(false)
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-2.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mr-1">Speaking now</span>
        {participants.map((p) => {
          const active = p.id === activeSpeaker
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChoose(p.id)}
              title={p.email || p.name}
              className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-xs font-semibold border transition ${
                active ? 'border-brand-500 bg-brand-600 text-white shadow-glow'
                       : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${
                active ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
              }`}>{(p.name || '?')[0]?.toUpperCase()}</span>
              {p.name}
            </button>
          )
        })}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600"
          >
            <Plus size={12} /> Add participant
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input autoFocus className="input !py-1.5 text-sm w-40" placeholder="Full name"
                 value={name} onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAdd() } }} />
          <input className="input !py-1.5 text-sm w-56" placeholder="Email (optional)"
                 value={email} onChange={(e) => setEmail(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAdd() } }} />
          <button type="button" onClick={confirmAdd} className="btn-primary text-xs">Add</button>
          <button type="button" onClick={() => { setAdding(false); setName(''); setEmail('') }} className="btn-ghost text-xs">Cancel</button>
        </div>
      )}
    </div>
  )
}

/* -------------------- Dialogue view -------------------- */
// Teams-style conversation: each turn rendered under its speaker's name +
// email, the agent's own turns aligned right. Live interim speech shows as a
// dashed bubble under the active speaker.
function DialogueView({ turns, participants, interim, activeSpeaker, editingTurn, setEditingTurn, onEdit, onDelete }) {
  const nameOf  = (id) => { const p = participants.find((x) => x.id === id); return (p && (p.name || p.email)) || 'Speaker' }
  const emailOf = (id) => { const p = participants.find((x) => x.id === id); return (p && p.email) || '' }
  const isAgent = (id) => id === 'agent'
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [turns.length, interim])

  const activeNm = nameOf(activeSpeaker)

  return (
    <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 min-h-[160px] max-h-[280px] overflow-y-auto space-y-2.5">
      {turns.length === 0 && !interim && (
        <div className="text-center text-xs text-slate-400 py-10">
          No conversation captured yet. Start recording, or pick a speaker and type below.
        </div>
      )}
      {turns.map((t, idx) => (
        <div key={idx} className={`flex gap-2 ${isAgent(t.speakerId) ? 'flex-row-reverse text-right' : ''}`}>
          <div className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${
            isAgent(t.speakerId) ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>{(nameOf(t.speakerId) || '?')[0]?.toUpperCase()}</div>
          <div className="group max-w-[80%]">
            <div className="text-[10px] font-bold text-slate-500">
              {nameOf(t.speakerId)}
              {emailOf(t.speakerId) && <span className="font-normal text-slate-400"> · {emailOf(t.speakerId)}</span>}
            </div>
            {editingTurn === idx ? (
              <textarea
                autoFocus
                className="input !py-1.5 text-sm mt-0.5 min-w-[220px]"
                value={t.text}
                onChange={(e) => onEdit(idx, e.target.value)}
                onBlur={() => setEditingTurn(null)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingTurn(null) } }}
              />
            ) : (
              <div className={`inline-block rounded-2xl px-3 py-1.5 text-sm mt-0.5 text-left ${
                isAgent(t.speakerId) ? 'bg-brand-50 text-brand-900' : 'bg-slate-100 text-slate-800'
              }`}>{t.text}</div>
            )}
            <div className={`mt-0.5 flex gap-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition ${
              isAgent(t.speakerId) ? 'justify-end' : ''
            }`}>
              <button type="button" onClick={() => setEditingTurn(idx)} className="inline-flex items-center gap-0.5 hover:text-brand-600"><Pencil size={11} /> edit</button>
              <button type="button" onClick={() => onDelete(idx)} className="inline-flex items-center gap-0.5 hover:text-rose-600"><Trash2 size={11} /> delete</button>
            </div>
          </div>
        </div>
      ))}
      {interim && (
        <div className={`flex gap-2 ${activeSpeaker === 'agent' ? 'flex-row-reverse text-right' : ''}`}>
          <div className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${
            activeSpeaker === 'agent' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>{(activeNm || '?')[0]?.toUpperCase()}</div>
          <div className="max-w-[80%]">
            <div className="text-[10px] font-bold text-slate-500">{activeNm}</div>
            <div className="inline-block rounded-2xl px-3 py-1.5 text-sm mt-0.5 italic text-slate-500 bg-slate-50 border border-dashed border-slate-200 text-left">{interim}…</div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
