import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import Logo from '../components/layout/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { AuthShell } from './Login.jsx'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  // role is intentionally hard-coded to `client`. Admins promote accounts
  // to Executive_Team or Admin from the Users page after sign-up.
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'client' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const res = await register(form)
      const body = res?.email_sent
        ? 'We sent you a verification email. Please verify your inbox, then sign in.'
        : 'Account created. Please sign in to continue.'
      toast.success('Successfully registered 🎉', body, { duration: 6000 })
      nav('/login', {
        replace: true,
        state: {
          justRegistered: true,
          devVerificationLink: res?.dev_verification_link || null,
          email: form.email,
        },
      })
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Could not create account.'
      setErr(detail)
      const looksLikeDuplicate = /already registered/i.test(detail)
      toast.error(
        looksLikeDuplicate ? 'Email already in use' : 'Registration failed',
        looksLikeDuplicate
          ? 'It looks like you already have an account. Try signing in instead.'
          : detail,
      )
      if (looksLikeDuplicate) {
        setTimeout(() => nav('/login', { replace: true, state: { email: form.email } }), 1500)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="text-center">
        <Logo className="h-10 w-auto mx-auto" />
        <h1 className="font-display mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate-600">Decision-grade analytics in 30 seconds.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        {err && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
          </div>
        )}
        <Field label="Full name" icon={User}>
          <input className="input pl-9" required minLength={2} value={form.full_name} onChange={upd('full_name')} placeholder="Jane Doe" />
        </Field>
        <Field label="Email" icon={Mail}>
          <input type="email" className="input pl-9" required value={form.email} onChange={upd('email')} placeholder="you@company.com" />
        </Field>
        <Field label="Password" icon={Lock}>
          <input type="password" className="input pl-9" required minLength={6} value={form.password} onChange={upd('password')} placeholder="At least 6 characters" />
        </Field>
        <PasswordStrength value={form.password} />

        <ul className="text-xs text-slate-500 space-y-1.5 pt-1">
          <li className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Email verification</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> JWT-secured session</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Live access to AdventureWorks_DW</li>
        </ul>

        <button disabled={busy} className="btn-primary w-full !py-3">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link to="/login" className="link">Sign in</Link>
      </p>
    </AuthShell>
  )
}

function PasswordStrength({ value }) {
  if (!value) return null
  let score = 0
  if (value.length >= 8)         score++
  if (/[A-Z]/.test(value))       score++
  if (/[0-9]/.test(value))       score++
  if (/[^A-Za-z0-9]/.test(value)) score++

  const meta = [
    { label: 'Too short', cls: 'bg-rose-500'    },
    { label: 'Weak',      cls: 'bg-rose-500'    },
    { label: 'Fair',      cls: 'bg-amber-500'   },
    { label: 'Good',      cls: 'bg-emerald-500' },
    { label: 'Strong',    cls: 'bg-emerald-600' },
  ][score]

  return (
    <div className="-mt-2">
      <div className="flex gap-1">
        {[0,1,2,3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? meta.cls : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">Password strength: <span className="font-bold text-slate-700">{meta.label}</span></div>
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  )
}
