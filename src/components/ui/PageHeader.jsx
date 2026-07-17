export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {title && (
            <h1 className="font-display mt-1 text-display sm:text-display-lg font-extrabold text-slate-900 leading-tight tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && <p className={`${title ? 'mt-2' : 'mt-1.5'} text-slate-600 max-w-2xl text-base`}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="mt-5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </div>
  )
}
