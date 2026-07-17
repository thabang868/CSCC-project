import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from './Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function PublicNav() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  // Mobile menu only carries the public-facing CTAs (Sign in / Get started).
  // Signed-in users navigate through the in-app sidebar, so we hide the
  // hamburger entirely for them.
  const hasMobileMenu = !user

  return (
    <header className="sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 pt-3">
        <div className="glass rounded-2xl px-4 h-14 max-w-7xl mx-auto flex items-center justify-between dark:bg-slate-900/60 dark:border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-7 w-auto" />
            <div className="leading-tight">
              <div className="font-display font-extrabold text-slate-900 dark:text-white">Decision Making</div>
            </div>
          </Link>

          {hasMobileMenu && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {hasMobileMenu && open && (
        <div className="md:hidden mx-4 mt-2">
          <div className="glass rounded-2xl p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <NavLink to="/login"    onClick={() => setOpen(false)} className="btn-ghost">Sign in</NavLink>
              <NavLink to="/register" onClick={() => setOpen(false)} className="btn-primary">Get started</NavLink>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
