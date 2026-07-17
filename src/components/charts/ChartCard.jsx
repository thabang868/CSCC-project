export default function ChartCard({ title, subtitle, children, action, eyebrow, className = '', bodyClass = 'h-72 sm:h-80' }) {
  return (
    <div className={`card card-hover p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <div className="font-bold text-slate-900 leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className={bodyClass}>{children}</div>
    </div>
  )
}
