import Logo from './Logo.jsx'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="w-8 h-8" />
            <div className="font-display font-extrabold text-slate-900">Decision Making</div>
          </div>
          <p className="mt-3 text-sm text-slate-600 max-w-sm">
            An enterprise BI &amp; decision-support platform combining live dashboards, an AI assistant,
            and an approval-based ticket workflow.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-3">Modules</div>
          <ul className="space-y-1.5 text-sm text-slate-700">
            <li>Executive Sales Overview</li>
            <li>Operational Insights</li>
            <li>Customer Performance</li>
            <li>AI Assistant</li>
            <li>Decision Tickets</li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">Stack</div>
          <ul className="space-y-1.5 text-sm text-slate-700">
            <li>FastAPI · SQLAlchemy</li>
            <li>SQL Server (AdventureWorks_DW)</li>
            <li>PostgreSQL · JWT</li>
            <li>React · Vite · Tailwind</li>
            <li>Azure OpenAI</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} Decision Making. All rights reserved.</div>
          <div className="uppercase tracking-[0.18em] font-bold">One platform · One workflow · Real decisions</div>
        </div>
      </div>
    </footer>
  )
}
