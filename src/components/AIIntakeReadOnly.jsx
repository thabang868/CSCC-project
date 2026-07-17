import { Sparkles, Building2, User as UserIcon, Box, Tag, Flame } from 'lucide-react'

/**
 * Read-only mirror of AIIntakePanel — renders the AI intake fields that
 * are ALREADY persisted on a ticket (no API call). Used on the reviewer
 * surfaces (admin / company-side):
 *
 *   <AIIntakeReadOnly ticket={t} />
 *
 * Renders nothing when the ticket has no AI metadata at all, so existing
 * pre-v1.6 tickets don't get an empty card.
 */
export default function AIIntakeReadOnly({ ticket }) {
  if (!ticket) return null

  const has =
    ticket.ai_company ||
    ticket.ai_person_name ||
    ticket.ai_affected_system ||
    ticket.ai_summary ||
    ticket.ai_keywords ||
    ticket.ai_source

  if (!has) return null

  const keywords =
    (ticket.ai_keywords || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  return (
    <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-brand-50/40
                    dark:from-violet-950/30 dark:via-slate-900 dark:to-brand-950/30 dark:border-violet-900/50 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-violet-700 dark:text-violet-300">
          <Sparkles size={13} /> AI intake
          {ticket.ai_source && (
            <span className="ml-1 normal-case font-medium text-violet-500/80 dark:text-violet-400/80">
              · {ticket.ai_source}
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
          Captured at submit
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        <Field icon={Building2} label="Company"         value={ticket.ai_company} />
        <Field icon={UserIcon}  label="Person"          value={ticket.ai_person_name} />
        <Field icon={Box}       label="Affected system" value={ticket.ai_affected_system} />
        <Field icon={Tag}       label="Category"
               value={<span className="capitalize">{ticket.category}</span>} />
        <Field icon={Flame}     label="Priority"
               value={<PriorityChip level={ticket.priority} />} />
        <Field icon={UserIcon}  label="Matched user"
               value={ticket.ai_matched_user_id
                        ? `#${ticket.ai_matched_user_id}`
                        : <span className="text-slate-400">no match</span>} />
      </div>

      {ticket.ai_summary && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Summary</div>
          <div className="text-[12px] text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/5 rounded-lg px-2.5 py-2 border border-slate-200 dark:border-white/10 break-words">
            {ticket.ai_summary}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keywords.map((k) => (
            <span key={k} className="badge bg-slate-100 text-slate-700 ring-slate-200 text-[10px]">{k}</span>
          ))}
        </div>
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
