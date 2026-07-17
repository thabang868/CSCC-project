import { useEffect, useRef, useState } from 'react'
import { Sparkles, Building2, User as UserIcon, Box, Tag, Flame, Loader2 } from 'lucide-react'
import { intakeApi } from '../services/api.js'

/**
 * Shows the AI's live read of a transcript: company, person, affected
 * system, suggested category and priority. The parent passes in the
 * transcript; we debounce 800 ms and call POST /api/intake/analyze.
 *
 *   <AIIntakePanel transcript={text} speakerEmail={user.email}
 *                  onResult={(r) => setIntake(r)} />
 *
 * The parent can read `onResult` to pre-fill its form fields.
 */
export default function AIIntakePanel({ transcript, speakerEmail = null, onResult }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef(null)
  const lastSent = useRef('')

  useEffect(() => {
    const t = (transcript || '').trim()
    if (!t || t.length < 4) {
      setResult(null); setErr('')
      return
    }
    // Debounce 800 ms so we don't hammer the endpoint while typing /
    // dictating.
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (t === lastSent.current) return
      lastSent.current = t
      setLoading(true); setErr('')
      try {
        const r = await intakeApi.analyze(t, speakerEmail)
        setResult(r)
        onResult?.(r)
      } catch (e) {
        setErr(e?.response?.data?.detail || 'Could not analyse the transcript.')
      } finally {
        setLoading(false)
      }
    }, 800)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [transcript, speakerEmail, onResult])

  if (!transcript || transcript.trim().length < 4) return null

  return (
    <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-brand-50/40
                    dark:from-violet-950/30 dark:via-slate-900 dark:to-brand-950/30 dark:border-violet-900/50 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-violet-700 dark:text-violet-300">
          <Sparkles size={13} /> AI intake
          {result?.source && (
            <span className="ml-1 normal-case font-medium text-violet-500/80 dark:text-violet-400/80">
              · {result.source}
            </span>
          )}
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Loader2 size={11} className="animate-spin" /> Analysing…
          </span>
        )}
      </div>

      {err ? (
        <div className="text-xs text-rose-700">{err}</div>
      ) : !result ? (
        <div className="text-xs text-slate-500">Waiting for transcript…</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            <Field icon={Building2} label="Company"        value={result.company} />
            <Field icon={UserIcon}  label="Person"         value={result.person_name} />
            <Field icon={Box}       label="Affected system" value={result.affected_system} />
            <Field icon={Tag}       label="Category"
                   value={<span className="capitalize">{result.category}</span>} />
            <Field icon={Flame}     label="Priority"
                   value={<PriorityChip level={result.priority} />} />
            <Field icon={UserIcon}  label="Matched user"
                   value={result.matched_user_id
                            ? `#${result.matched_user_id}`
                            : <span className="text-slate-400">no match</span>} />
          </div>
          {result.summary && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Summary</div>
              <div className="text-[12px] text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/5 rounded-lg px-2.5 py-2 border border-slate-200 dark:border-white/10">
                {result.summary}
              </div>
            </div>
          )}
          {Array.isArray(result.keywords) && result.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.keywords.map((k) => (
                <span key={k} className="badge bg-slate-100 text-slate-700 ring-slate-200 text-[10px]">{k}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={12} className="text-violet-600 dark:text-violet-300 shrink-0" />
      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold w-24 shrink-0">{label}</span>
      <span className="text-slate-800 dark:text-slate-100 truncate">
        {value || <span className="text-slate-400">—</span>}
      </span>
    </div>
  )
}

function PriorityChip({ level }) {
  const cls = {
    low:    'bg-slate-100 text-slate-700 ring-slate-200',
    medium: 'bg-amber-100 text-amber-800 ring-amber-200',
    high:   'bg-rose-100 text-rose-700 ring-rose-200',
  }[level] || 'bg-slate-100 text-slate-700 ring-slate-200'
  return <span className={`badge ${cls}`}>{level}</span>
}
