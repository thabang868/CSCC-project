import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react'
import Logo from '../components/layout/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()

  const justRegistered = loc.state?.justRegistered
  const devVerificationLink = loc.state?.devVerificationLink

  const [email, setEmail] = useState(loc.state?.email || '')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const u = await login(email, password)
      toast.success(`Welcome back, ${u.full_name.split(' ')[0]}!`)
      nav(loc.state?.from || '/app', { replace: true })
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Sign in failed. Please try again.'
      setErr(detail)
      toast.error('Sign in failed', detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="text-center">
        <Logo className="h-10 w-auto mx-auto" />
        <h1 className="font-display mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-600">Sign in to access your dashboards.</p>
      </div>

      {justRegistered && (
        <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 size={16} /> Successfully registered
          </div>
          <div className="text-emerald-700 mt-1">Verify your email, then sign in below.</div>
          {devVerificationLink && (
            <a href={devVerificationLink} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900">
              <ExternalLink size={12} /> Open verification link (dev mode)
            </a>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        {err && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" type="email" required value={email}
                   onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Password</label>
            <Link to="/forgot-password" className="text-xs link">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" type="password" required value={password}
                   onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <button disabled={busy} className="btn-primary w-full !py-3">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don’t have an account? <Link to="/register" className="link">Create one</Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 sm:px-6 py-10 overflow-hidden">
      {/* Soft ambient backdrop */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(at 25% 0%, rgba(99,102,241,0.10), transparent 55%),' +
            'radial-gradient(at 75% 100%, rgba(168,85,247,0.10), transparent 55%),' +
            'radial-gradient(at 50% 50%, rgba(20,184,166,0.06), transparent 60%)',
        }}
      />
      <div className="absolute -z-10 -top-24 -right-24 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="absolute -z-10 -bottom-24 -left-24 w-96 h-96 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="w-full max-w-md card p-8 sm:p-10 relative">
        {children}
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">
        One platform · One workflow · Real decisions
      </div>
    </div>
  )
}
