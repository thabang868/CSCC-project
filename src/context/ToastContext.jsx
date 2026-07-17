import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ToastCtx = createContext(null)

let _id = 0
const nextId = () => ++_id

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((arr) => arr.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast) => {
    const id = nextId()
    const duration = toast.duration ?? 5000
    setToasts((arr) => [...arr, { id, ...toast }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const api = useMemo(() => ({
    success: (title, body, opts = {}) => push({ kind: 'success', title, body, ...opts }),
    error:   (title, body, opts = {}) => push({ kind: 'error',   title, body, ...opts }),
    info:    (title, body, opts = {}) => push({ kind: 'info',    title, body, ...opts }),
    dismiss,
  }), [push, dismiss])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

function ToastItem({ t, onClose }) {
  const styles = {
    success: { ring: 'ring-emerald-200', bar: 'bg-emerald-500',  text: 'text-emerald-900', Icon: CheckCircle2,    iconCls: 'text-emerald-600' },
    error:   { ring: 'ring-rose-200',    bar: 'bg-rose-500',     text: 'text-rose-900',    Icon: AlertTriangle,   iconCls: 'text-rose-600'    },
    info:    { ring: 'ring-brand-200',   bar: 'bg-brand-500',    text: 'text-brand-900',   Icon: Info,            iconCls: 'text-brand-600'   },
  }[t.kind || 'info']

  const { Icon } = styles
  return (
    <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 overflow-hidden animate-[slideDown_.25s_ease-out]">
      <div className={`h-1 ${styles.bar}`} />
      <div className="px-4 py-3 flex items-start gap-3">
        <Icon className={`shrink-0 ${styles.iconCls}`} size={22} />
        <div className="flex-1 min-w-0">
          {t.title && <div className={`font-semibold ${styles.text}`}>{t.title}</div>}
          {t.body && <div className="text-sm text-slate-600 mt-0.5 break-words">{t.body}</div>}
          {t.action && <div className="mt-2">{t.action}</div>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
