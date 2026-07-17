import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mail, ShieldCheck, BadgeCheck, Calendar, Ticket, KeyRound, LogOut,
  CheckCircle2, Camera, Trash2, ImagePlus,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi, ticketApi } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { roleLabel } from '../utils/roles.js'

// Resize the picked image client-side to keep payloads small and avatars crisp.
async function fileToResizedDataUrl(file, { max = 384, mime = 'image/jpeg', quality = 0.86 } = {}) {
  const dataUrl = await new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })
  const img = await new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = dataUrl
  })
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL(mime, quality)
}

export default function Profile() {
  const { user, logout, refreshMe } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    ticketApi.mine().then(setTickets).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (!user) return <Loader label="Loading…" />

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {})

  const onSignOut = () => { logout(); toast.success('Signed out'); nav('/login', { replace: true }) }

  const pickPicture = () => fileRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''   // allow re-picking the same file later
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return toast.error('Please choose an image file (PNG, JPG, WebP).')
    }
    if (file.size > 8 * 1024 * 1024) {
      return toast.error('Image too large (max 8 MB).')
    }
    setUploading(true)
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      await authApi.updateAvatar(dataUrl)
      await refreshMe()
      toast.success('Profile picture updated')
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Upload failed. Please try again.'
      toast.error('Could not update picture', detail)
    } finally {
      setUploading(false)
    }
  }

  const onRemove = async () => {
    setUploading(true)
    try {
      await authApi.removeAvatar()
      await refreshMe()
      toast.success('Profile picture removed')
    } catch {
      toast.error('Could not remove picture')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Profile" subtitle="Your account details and activity summary." />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identity */}
        <div className="card p-6 lg:col-span-1 text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="relative">
            <div className="relative mx-auto w-28 h-28">
              <button
                type="button"
                onClick={pickPicture}
                disabled={uploading}
                title={user.avatar ? 'Change profile picture' : 'Upload a profile picture'}
                aria-label={user.avatar ? 'Change profile picture' : 'Upload a profile picture'}
                className="group w-full h-full rounded-full overflow-hidden ring-4 ring-white shadow-glow
                           bg-gradient-to-br from-brand-500 to-brand-700 text-white
                           grid place-items-center text-3xl font-extrabold
                           disabled:opacity-70 cursor-pointer"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                    draggable="false"
                  />
                ) : (
                  <span>{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 grid place-items-center bg-black/40 text-white
                                opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <div className="flex flex-col items-center gap-0.5">
                    {uploading ? (
                      <div className="text-[10px] font-bold uppercase tracking-widest">Saving…</div>
                    ) : (
                      <>
                        <Camera size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {user.avatar ? 'Change' : 'Upload'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Camera badge button (always visible, sits on the bottom-right) */}
              <button
                type="button"
                onClick={pickPicture}
                disabled={uploading}
                aria-label="Upload picture"
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white text-brand-700
                           ring-2 ring-white shadow-soft grid place-items-center
                           hover:bg-brand-50 disabled:opacity-60"
              >
                <ImagePlus size={16} />
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
                onChange={onFile}
              />
            </div>

            {user.avatar && (
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold
                           text-rose-600 hover:text-rose-800 disabled:opacity-50"
              >
                <Trash2 size={12} /> Remove picture
              </button>
            )}

            <div className="mt-4 font-display font-extrabold text-slate-900 text-xl">{user.full_name}</div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              <span className="badge bg-brand-100 text-brand-800 ring-brand-200">
                <ShieldCheck size={12} className="mr-1" /> {roleLabel(user.role).toUpperCase()}
              </span>
              {user.email_verified && (
                <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-200">
                  <BadgeCheck size={12} className="mr-1" /> Verified
                </span>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/forgot-password" className="btn-ghost">
                <KeyRound size={16} /> Change password
              </Link>
              <button onClick={onSignOut} className="btn-danger">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Details + activity */}
        <div className="card p-6 lg:col-span-2">
          <div className="eyebrow">Account details</div>
          <div className="font-bold text-slate-900 mt-1 mb-4">Personal information</div>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <Detail icon={Mail}        label="Email"        value={user.email} />
            <Detail icon={ShieldCheck} label="Role"         value={roleLabel(user.role)} />
            <Detail icon={BadgeCheck}  label="Status"       value={user.is_active ? 'Active' : 'Disabled'} />
            <Detail icon={Calendar}    label="Member since" value={new Date(user.created_at).toLocaleDateString()} />
          </dl>

          <div className="h-px bg-slate-100 my-6" />

          <div className="eyebrow flex items-center gap-1.5"><Ticket size={12} /> Activity</div>
          <div className="font-bold text-slate-900 mt-1 mb-3">Ticket summary</div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Mini label="Total"     n={tickets.length}        accent="brand" />
              <Mini label="Pending"   n={counts.pending  || 0}  accent="amber" />
              <Mini label="Approved"  n={counts.approved || 0}  accent="emerald" />
              <Mini label="Rejected"  n={counts.rejected || 0}  accent="rose" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 px-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold">{label}</dt>
        <dd className="text-slate-800 font-semibold truncate">{value}</dd>
      </div>
    </div>
  )
}

function Mini({ label, n }) {
  // Neutral slate surface for every summary tile (matches the
  // closed / support / decision badge styling).
  const cls = 'bg-slate-100 text-slate-700 ring-slate-200'
  return (
    <div className={`rounded-2xl ring-1 px-4 py-3.5 ${cls} shadow-soft`}>
      <div className="nums text-2xl font-extrabold">{n}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold mt-0.5 opacity-80">{label}</div>
    </div>
  )
}

export { CheckCircle2 }
