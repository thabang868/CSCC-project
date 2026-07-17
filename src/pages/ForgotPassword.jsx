import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, AlertCircle, CheckCircle2, KeyRound, ExternalLink } from 'lucide-react'
import Logo from '../components/layout/Logo.jsx'
import { authApi } from '../services/api.js'
import { AuthShell } from './Login.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [token, setToken] = useState('')
  const [err, setErr] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr(''); setMsg(''); setToken('')
    setBusy(true)
    try {
      const r = await authApi.forgot(email)
      setMsg(r.message)
      setToken(r.dev_reset_token || '')
      if (r.dev_reset_token) toast.info('Reset token issued', 'Use the link below to set a new password (dev mode).')
      else                   toast.success('Check your inbox', 'We sent you a password-reset email.')
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Something went wrong.'
      setErr(detail)
      toast.error('Could not send reset email', detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="text-center">
        <Logo className="h-10 w-auto mx-auto" />
        <h1 className="font-display mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Reset your password</h1>
        <p className="mt-1.5 text-sm text-slate-600">We’ll email you a one-time reset link.</p>
      </div>

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
            <input type="email" required className="input pl-9" value={email}
                   onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
        </div>
        <button disabled={busy} className="btn-primary w-full !py-3">
          {busy ? 'Sending…' : 'Send reset email'}
        </button>
      </form>

      {msg && (
        <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 size={16} /> {msg}
          </div>
          {token && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-slate-600">SMTP not configured - use this dev link:</div>
              <Link to={`/reset-password?token=${encodeURIComponent(token)}`} className="btn-primary w-full">
                <KeyRound size={16} /> Set a new password
              </Link>
              <a href={`/reset-password?token=${encodeURIComponent(token)}`} className="text-[11px] text-slate-500 inline-flex items-center gap-1 hover:text-slate-700">
                <ExternalLink size={11} /> open in new tab
              </a>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it? <Link to="/login" className="link">Back to sign in</Link>
      </p>
    </AuthShell>
  )
}
