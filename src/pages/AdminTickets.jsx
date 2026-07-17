import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, AlertCircle, CheckCircle2, XCircle, Lock } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import AIIntakeReadOnly from '../components/AIIntakeReadOnly.jsx'
import { ticketApi } from '../services/api.js'
import { useRefresh } from '../context/RefreshContext.jsx'
import { TicketRow, Modal } from './Tickets.jsx'

const FILTERS = [
  { key: '',         label: 'All' },
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'closed',   label: 'Closed'   },
]
const VALID_STATUSES = ['', 'pending', 'approved', 'rejected', 'closed']

export default function AdminTickets() {
  // Deep-linkable filter: Overview KPI cards link here with ?status=…
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status')
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(
    VALID_STATUSES.includes(initialStatus) ? initialStatus : 'pending',
  )
  const [reviewing, setReviewing] = useState(null)
  const [action, setAction] = useState('approve')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { refreshKey } = useRefresh()

  // Re-sync the active filter when the ?status= query changes (e.g. the user
  // clicks a different KPI card while already on this page).
  useEffect(() => {
    const s = searchParams.get('status')
    if (s !== null && VALID_STATUSES.includes(s)) setFilter(s)
  }, [searchParams])

  // Fetch the full ticket set once so the filter pill counts always reflect
  // every status — then filter for display on the client. (Previously the
  // counts were derived from the server-filtered list, so every status other
  // than the active filter showed 0.)
  const load = () => {
    setLoading(true)
    ticketApi.all().then(setAllItems).finally(() => setLoading(false))
  }
  useEffect(load, [refreshKey])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, closed: 0 }
    allItems.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1 })
    return c
  }, [allItems])

  const items = useMemo(
    () => (filter ? allItems.filter((t) => t.status === filter) : allItems),
    [allItems, filter],
  )

  const submitReview = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await ticketApi.review(reviewing.id, { action, note })
      setReviewing(null); setNote(''); load()
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not save the review.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decision workflow"
        title="Approvals"
        subtitle="Review decision tickets raised by analysts and managers. Every action is auditable."
        actions={
          <span className="badge bg-brand-50 text-brand-800 ring-brand-200">
            <ShieldCheck size={14} className="mr-1" /> Admin &amp; Executive_Team
          </span>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? 'btn-primary text-xs !px-3 !py-1.5' : 'btn-ghost text-xs !px-3 !py-1.5'}
          >
            {f.label}
            {f.key && (
              <span className={`badge ml-2 ${filter === f.key ? 'bg-white/25 text-white ring-white/30' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                {counts[f.key] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Loading tickets…" />
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">No tickets in this view.</div>
      ) : (
        <div className="grid gap-3 min-w-0">
          {items.map((t) => (
            <div key={t.id} className="space-y-2 min-w-0">
              <TicketRow
                t={t}
                showRequester
                action={
                  t.status !== 'closed' ? (
                    <button
                      onClick={() => {
                        setReviewing(t)
                        // A decided ticket can only be closed; a pending one
                        // defaults to Approve.
                        setAction(t.status === 'pending' ? 'approve' : 'close')
                        setNote('')
                      }}
                      className={t.status === 'pending' ? 'btn-primary self-start' : 'btn-soft self-start'}
                    >
                      {t.status === 'pending'
                        ? <><ShieldCheck size={16} /> Review</>
                        : <><Lock size={16} /> Close</>}
                    </button>
                  ) : null
                }
              />
              {/* The reviewer sees exactly the same AI intake the requester
                  saw at submit. Renders nothing for pre-v1.6 rows that
                  don't carry any AI metadata. */}
              <AIIntakeReadOnly ticket={t} />
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <Modal onClose={() => setReviewing(null)} title={`${reviewing.status === 'pending' ? 'Review' : 'Close'} ticket #${reviewing.id}`}>
          <form onSubmit={submitReview} className="space-y-4">
            {err && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">{reviewing.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">From user #{reviewing.requester_id} · {reviewing.category} · {reviewing.priority}</div>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{reviewing.description}</p>
            </div>

            {/* AI intake captured at submit. Helps the reviewer decide
                without re-reading the whole transcript. */}
            <AIIntakeReadOnly ticket={reviewing} />

            {/* A pending ticket can be approved / rejected / closed. Once it
                has been decided (approved or rejected) the only remaining
                action is Close — it can't be approved again or flipped. */}
            {reviewing.status === 'pending' ? (
              <div className="grid grid-cols-3 gap-2">
                <ActionTile current={action} value="approve" onClick={() => setAction('approve')} icon={CheckCircle2} label="Approve" tone="emerald" />
                <ActionTile current={action} value="reject"  onClick={() => setAction('reject')}  icon={XCircle}        label="Reject"  tone="rose" />
                <ActionTile current={action} value="close"   onClick={() => setAction('close')}   icon={Lock}            label="Close"   tone="slate" />
              </div>
            ) : (
              <div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[12px] text-slate-600 mb-2">
                  This ticket is already <span className="font-bold capitalize text-slate-900">{reviewing.status}</span>. It can only be closed now.
                </div>
                <div className="grid grid-cols-1">
                  <ActionTile current={action} value="close" onClick={() => setAction('close')} icon={Lock} label="Close ticket" tone="slate" />
                </div>
              </div>
            )}

            <div>
              <label className="label">Reviewer note (optional)</label>
              <textarea className="input min-h-[100px]" value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add context for the requester (e.g. why approved, conditions, etc.)" />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReviewing(null)} className="btn-ghost">Cancel</button>
              <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save review'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function ActionTile({ current, value, onClick, icon: Icon, label, tone }) {
  const active = current === value
  const toneMap = {
    emerald: active ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-soft' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    rose:    active ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-soft'       : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    slate:   active ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-soft'     : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70',
  }[tone]

  return (
    <button type="button" onClick={onClick}
            className={`rounded-xl px-3 py-3.5 text-sm font-bold flex flex-col items-center gap-1.5 transition-all ${toneMap}`}>
      <Icon size={20} /> {label}
    </button>
  )
}
