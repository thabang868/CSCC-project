import { useEffect, useRef, useState } from 'react'
import {
  Bell, CheckCheck, Inbox, ArrowLeft, Volume2, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { ticketApi } from '../services/api.js'
import useAccess from '../hooks/useAccess.js'
import AIIntakeReadOnly from './AIIntakeReadOnly.jsx'

const TYPE_TINT = {
  ticket_created:              'bg-brand-100 text-brand-700',
  ticket_approved:             'bg-emerald-100 text-emerald-700',
  ticket_rejected:             'bg-rose-100 text-rose-700',
  ticket_closed:               'bg-slate-200 text-slate-700',
  support_request_created:     'bg-amber-100 text-amber-800',
  support_request_accepted:    'bg-emerald-100 text-emerald-700',
  support_request_scheduled:   'bg-violet-100 text-violet-700',
  support_request_closed:      'bg-slate-200 text-slate-700',
  support_request_cancelled:   'bg-rose-100 text-rose-700',
  profile_avatar_updated:      'bg-violet-100 text-violet-700',
  user_access_updated:         'bg-sky-100 text-sky-700',
  profile_changed:             'bg-sky-100 text-sky-700',
}

function fmtTime(iso) {
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

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead, refresh } = useNotifications()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => { if (!open) setSelected(null) }, [open])

  const openDetail = (n) => {
    if (!n.read_at) markRead(n.id)
    setSelected(n)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) refresh() }}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
        aria-label="Notifications"
        title={unread ? `${unread} unread` : 'Notifications'}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] grid place-items-center
                          rounded-full bg-rose-500 text-white text-[10px] font-bold px-1
                          ring-2 ring-white dark:ring-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-12 z-30 ${selected ? 'w-[480px]' : 'w-[380px]'} max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl p-2 animate-pop-in`}>
          {selected ? (
            <NotificationDetail
              notification={selected}
              onBack={() => setSelected(null)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <Inbox size={16} /> Notifications
                  {unread > 0 && (
                    <span className="badge bg-rose-100 text-rose-800 ring-rose-200">{unread}</span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead}
                          className="text-[11px] inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />

              {items.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  <Bell size={20} className="mx-auto text-slate-300 mb-2" />
                  You're all caught up.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  {items.map((n) => <InboxRow key={n.id} n={n} onClick={() => openDetail(n)} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}


/* ---------------------- inbox row ---------------------- */
function InboxRow({ n, onClick }) {
  // Quick visual hint when a ticket-created notification carries a voice
  // note. The body string already gets " · voice note" appended on the
  // backend (see notification_service push in the tickets router), so we
  // can detect it without an extra fetch.
  const hasVoice = isTicketNotification(n) && /voice note/i.test(n.body || '')

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl
                  transition ${n.read_at ? 'opacity-70 hover:opacity-100' : 'bg-slate-50 dark:bg-white/5'}
                  hover:bg-brand-50/60 dark:hover:bg-white/10`}
    >
      <div className={`w-8 h-8 rounded-lg grid place-items-center text-[10px] font-bold uppercase shrink-0
                      ${TYPE_TINT[n.type] || 'bg-slate-100 text-slate-700'}`}>
        {(n.type || '?').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 break-words">
          {n.title}
        </div>
        {n.body && <div className="text-xs text-slate-500 line-clamp-2 break-words mt-0.5">{n.body}</div>}
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
          <span>{fmtTime(n.created_at)}</span>
          {hasVoice && (
            <span className="inline-flex items-center gap-1 text-rose-700">
              <Volume2 size={10} /> voice note
            </span>
          )}
        </div>
      </div>
      {!n.read_at && (
        <span title="Unread" className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
      )}
    </button>
  )
}


/* ---------------------- detail view ---------------------- */
function NotificationDetail({ notification: n, onBack }) {
  // Pull the underlying ticket so we can render the voice-note player
  // when one is attached. We only fetch when the notification really
  // points at a ticket — other notification types skip the call.
  const [ticket, setTicket] = useState(null)
  const [ticketError, setTicketError] = useState('')
  const access = useAccess()

  useEffect(() => {
    if (!isTicketNotification(n)) return
    let cancelled = false
    ticketApi.byId(n.target_id)
      .then((t) => { if (!cancelled) setTicket(t) })
      .catch(() => { if (!cancelled) setTicketError('Could not load the linked ticket.') })
    return () => { cancelled = true }
  }, [n])

  const hasVoice = ticket?.has_voice_note
  // Reviewers (admin + Executive_Team) act on tickets from the Approvals
  // page — never inline here. A pending ticket they can review sends them
  // straight to /app/admin/tickets; everything else uses the notification's
  // own link.
  const isReviewer = access.isAdmin || access.role === 'company'
  const isReviewableTicket = isTicketNotification(n) && isReviewer
  const appLink = isReviewableTicket ? '/app/admin/tickets' : (n.link || null)
  const appLinkLabel = isReviewableTicket ? 'Open in Approvals' : 'Open in app'

  return (
    <>
      <div className="flex items-center justify-between px-2 py-2">
        <button onClick={onBack}
                className="text-[12px] inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold">
          <ArrowLeft size={14} /> Back to inbox
        </button>
        <div className="text-[10px] text-slate-400">{fmtTime(n.created_at)}</div>
      </div>
      <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
      <div className="px-3 py-3 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg grid place-items-center text-[10px] font-bold uppercase shrink-0
                          ${TYPE_TINT[n.type] || 'bg-slate-100 text-slate-700'}`}>
            {(n.type || '?').slice(0, 2)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
            {(n.type || 'notification').replace(/_/g, ' ')}
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">Subject</div>
        <div className="font-bold text-slate-900 dark:text-white text-[16px] leading-snug break-words whitespace-pre-wrap mb-4">
          {n.title}
        </div>

        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">Details</div>
        {n.body ? (
          <div className="text-[14px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed bg-slate-50 dark:bg-white/5 rounded-xl p-3.5 border border-slate-200 dark:border-white/10">
            {n.body}
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic bg-slate-50 dark:bg-white/5 rounded-xl p-3.5 border border-slate-200 dark:border-white/10">
            No additional details.
          </div>
        )}

        {/* Inline voice-note player. The audio bytes are AES-decrypted on
            the server every time it's fetched, so closing & re-opening the
            notification later still plays the same recording. */}
        {hasVoice && (
          <div className="mt-4 rounded-xl border border-rose-200/70 bg-rose-50/60 dark:bg-rose-950/30 dark:border-rose-900/40 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-rose-700 dark:text-rose-300">
                <Volume2 size={13} /> Voice note
              </div>
              {ticket.voice_duration_seconds && (
                <span className="text-[11px] text-slate-500 nums">
                  {fmtDuration(ticket.voice_duration_seconds)}
                </span>
              )}
            </div>
            <NotificationVoicePlayer ticketId={n.target_id} />
          </div>
        )}

        {/* AI intake captured at submit — read-only mirror so the
            reviewer sees the same recognised company / person / system
            the requester saw. Renders nothing if the ticket has no AI
            metadata (pre-v1.6 tickets). */}
        {ticket && (
          <div className="mt-4">
            <AIIntakeReadOnly ticket={ticket} />
          </div>
        )}

        {/* Reviewers act on the Approvals page, not inline — a pending
            ticket prompts them to open it there. */}
        {isReviewableTicket && ticket && ticket.status === 'pending' && (
          <div className="mt-4 rounded-xl border border-brand-200/70 bg-brand-50/60 dark:bg-brand-950/30 dark:border-brand-900/40 p-3 text-[12px] text-slate-600 dark:text-slate-300">
            Open this in <span className="font-semibold text-brand-700 dark:text-brand-300">Approvals</span> to approve, reject or close it.
          </div>
        )}

        {/* Read-only status badge once the ticket has been reviewed,
            so the reviewer can confirm the outcome stuck. */}
        {ticket && ticket.status !== 'pending' && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-[12px] text-slate-600 dark:text-slate-300">
            This ticket is{' '}
            <span className="font-bold capitalize text-slate-900 dark:text-white">{ticket.status}</span>.
            {ticket.review_note && <> Reviewer note: <i>{ticket.review_note}</i>.</>}
          </div>
        )}

        {ticketError && (
          <div className="mt-3 text-[11px] text-rose-700">{ticketError}</div>
        )}

        {appLink && (
          <Link to={appLink} onClick={onBack}
                className="mt-4 w-full btn-primary !py-2 text-[13px]">
            {appLinkLabel} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </>
  )
}


/* ---------------------- voice player (inline) ----------------------
   Lazily fetches the decrypted audio when the user clicks Play. We use
   a blob URL so the JWT Authorization header is preserved (axios sets
   it automatically via the configured interceptor). */
function NotificationVoicePlayer({ ticketId }) {
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
      setErr(
        e?.response?.status === 403
          ? 'You are not authorised to play this recording.'
          : 'Could not load the recording.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => () => { if (src) URL.revokeObjectURL(src) }, [src])

  if (err) return <div className="text-xs text-rose-700">{err}</div>

  if (!src) {
    return (
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold
                   bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg
                   shadow-soft disabled:opacity-60"
      >
        <Volume2 size={12} />
        {loading ? 'Loading…' : 'Play voice note'}
      </button>
    )
  }

  return <audio src={src} controls autoPlay className="w-full h-9" />
}


/* ---------------------- helpers ---------------------- */
function isTicketNotification(n) {
  if (!n) return false
  if (n.target_type === 'ticket' && n.target_id) return true
  // Belt and braces: legacy notifications might have used the type alone.
  return /^ticket_/.test(n.type || '') && !!n.target_id
}

function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
