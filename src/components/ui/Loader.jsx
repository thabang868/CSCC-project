export default function Loader({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-12 text-slate-500 ${className}`}>
      <span className="relative inline-flex w-6 h-6">
        <span className="absolute inset-0 rounded-full bg-brand-200 opacity-60 animate-ping" />
        <span className="relative inline-block w-6 h-6 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-xl ${className}`} />
}
