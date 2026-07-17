import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function KPICard({
  label, value, hint, icon: Icon,
  accent = 'brand',
  trend,    // { dir: 'up'|'down', value: '+12%' }
  spark,    // optional: array of numbers for a tiny sparkline
  to,       // optional: when set, the whole card becomes a link to this route
}) {
  const ring = {
    brand:   'from-brand-500/15 to-transparent text-brand-700',
    emerald: 'from-emerald-500/15 to-transparent text-emerald-700',
    amber:   'from-amber-500/15 to-transparent text-amber-700',
    rose:    'from-rose-500/15 to-transparent text-rose-700',
    violet:  'from-violet-500/15 to-transparent text-violet-700',
    sky:     'from-sky-500/15 to-transparent text-sky-700',
  }[accent]

  const trendCls = trend?.dir === 'down'
    ? 'text-rose-600 bg-rose-50 ring-rose-100'
    : 'text-emerald-600 bg-emerald-50 ring-emerald-100'

  const inner = (
    <div className="card card-hover p-5 relative overflow-hidden h-full">
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${ring}`} />
      <div className="flex items-start justify-between gap-3 relative min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold truncate">{label}</div>
          <div className="mt-1 flex items-baseline gap-2 min-w-0">
            <div
              className="nums font-extrabold text-slate-900 leading-none truncate"
              style={{ fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)' }}
              title={typeof value === 'string' ? value : undefined}
            >
              {value}
            </div>
            {trend && (
              <span className={`badge ring-1 shrink-0 ${trendCls}`}>
                {trend.dir === 'down' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                <span className="ml-0.5">{trend.value}</span>
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${ring} grid place-items-center shadow-soft`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {spark && spark.length > 1 && <Sparkline values={spark} accent={accent} />}

      {hint && <div className="mt-3 text-xs text-slate-500 relative truncate">{hint}</div>}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
        {inner}
      </Link>
    )
  }
  return inner
}

function Sparkline({ values, accent }) {
  const stroke = {
    brand:   '#2548e0', emerald: '#059669', amber: '#d97706',
    rose:    '#e11d48', violet:  '#7c3aed', sky:   '#0284c7',
  }[accent]
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const w = 100, h = 28
  const step = w / (values.length - 1)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full h-7" preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}
