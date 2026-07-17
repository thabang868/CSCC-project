import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, MailCheck } from 'lucide-react'
import Logo from '../components/layout/Logo.jsx'
import { authApi } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { AuthShell } from './Login.jsx'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  const [state, setState] = useState('verifying') // verifying | done | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setState('error'); setMessage('Missing verification token.'); return }
    authApi.verifyEmail(token)
      .then((r) => {
        setState('done')
        setMessage(r.message || 'Email verified.')
        toast.success('Email verified', 'You can now sign in.')
        setTimeout(() => nav('/login', { replace: true }), 1800)
      })
      .catch((e) => {
        setState('error')
        setMessage(e?.response?.data?.detail || 'Verification failed.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthShell>
      <div className="text-center">
        <Logo className="h-10 w-auto mx-auto" />
        <h1 className="font-display mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Email verification</h1>
      </div>

      <div className="mt-8">
        {state === 'verifying' && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-7 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center shadow-glow">
              <MailCheck size={26} />
            </div>
            <div className="mt-4 font-bold text-slate-800">Verifying your email…</div>
            <div className="text-sm text-slate-500 mt-1">Please wait a moment.</div>
          </div>
        )}

        {state === 'done' && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-7 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white grid place-items-center shadow-soft">
              <CheckCircle2 size={26} />
            </div>
            <div className="mt-4 font-bold text-emerald-900">{message}</div>
            <Link to="/login" className="btn-primary mt-5">Sign in</Link>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-7 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white grid place-items-center shadow-soft">
              <AlertTriangle size={26} />
            </div>
            <div className="mt-4 font-bold text-rose-900">{message}</div>
            <Link to="/login" className="btn-ghost mt-5">Back to sign in</Link>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
