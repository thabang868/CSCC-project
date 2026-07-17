import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import PublicNav from '../components/layout/PublicNav.jsx'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <PublicNav />

      <section className="relative isolate flex-1 flex items-center overflow-hidden">
        {/* Calm, single-hue ambient backdrop adapts to OS theme */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900" />
        <div className="absolute -z-10 -top-40 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-brand-300/30 dark:bg-brand-500/20 blur-3xl" />
        <div className="absolute -z-10 inset-0 bg-hero-grid [background-size:24px_24px] opacity-[0.04] dark:opacity-[0.06]" />

        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 backdrop-blur">
            <Sparkles size={12} className="text-brand-600 dark:text-brand-400" />
            Live BI · AI Insights · Decision Workflow
          </div>

          {/* Headline smaller, tighter, monochrome with one gradient accent */}
          <h1 className="mt-5 font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08]">
            Every decision,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700 dark:from-brand-300 dark:to-brand-500">
              defensible.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            Live dashboards. Grounded AI. Auditable approvals, on your warehouse.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link to="/register" className="btn-primary !px-5 !py-2.5 text-sm">
              Get started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-ghost !px-5 !py-2.5 text-sm">
              Sign in
            </Link>
          </div>

          {/* Tiny stat strip - minimal, mono */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <Stat n="3"    label="Dashboard categories" />
            <Stat n="Live" label="Warehouse feed" />
            <Stat n="JWT"  label="Secure auth" />
            <Stat n="AI"   label="Chat assistant" />
          </div>

          <div className="mt-10 text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 font-semibold">
            One platform · One workflow · Real decisions
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ n, label }) {
  return (
    <div className="rounded-xl bg-white/70 dark:bg-white/5 ring-1 ring-slate-200/80 dark:ring-white/10 backdrop-blur px-4 py-3 text-center">
      <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white nums">{n}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
