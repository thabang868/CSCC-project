import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import Logo from '../components/layout/Logo.jsx'
import { authApi } from '../services/api.js'
import { AuthShell } from './Login.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function ResetPassword() {
  const toast = useToast()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [token, setToken] = useState(params.get('token') || '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (pw !== pw2) { setErr('Passwords do not match.'); return }
    setErr(''); setBusy(true)
    try {
      await authApi.reset(token, pw)
      setDone(true)
      toast.success('Password updated', 'You can now sign in with your new password.')
      setTimeout(() => nav('/login', { replace: true }), 1500)
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Could not reset password.'
      setErr(detail)
      toast.error('Reset failed', detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="text-center">
        <Logo className="h-10 w-auto mx-auto" />
        <h1 className="font-display mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-sm text-slate-600">The link expires in 30 minutes.</p>
      </div>

      {done ? (
        <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-sm flex items-center gap-2 text-emerald-800 font-semibold">
          <CheckCircle2 size={18} /> Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
            </div>
          )}
          {!params.get('token') && (
            <div>
              <label className="label">Reset token</label>
              <textarea className="input min-h-[80px] font-mono text-xs" required value={token}
                        onChange={(e) => setToken(e.target.value)} placeholder="Paste the reset token" />
            </div>
          )}
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" required minLength={6} className="input pl-9"
                     value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" required minLength={6} className="input pl-9"
                     value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
          </div>
          <button disabled={busy} className="btn-primary w-full !py-3">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Don’t have a token? <Link to="/forgot-password" className="link">Request one</Link>
      </p>
    </AuthShell>
  )
}
