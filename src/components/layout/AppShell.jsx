import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Boxes, Activity,
  Ticket, ShieldCheck, LogOut, Menu, X, Search,
  ChevronRight, UserCircle2, RefreshCw, Headphones,
} from 'lucide-react'
import Logo from './Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useRefresh } from '../../context/RefreshContext.jsx'
import SearchPalette from '../SearchPalette.jsx'
import FloatingAgent from '../FloatingAgent.jsx'
import AccessWatcher from '../AccessWatcher.jsx'
import NotificationBell from '../NotificationBell.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import useAccess from '../../hooks/useAccess.js'
import { roleLabel } from '../../utils/roles.js'

const NAV = [
  { to: '/app',                       label: 'Overview',         icon: LayoutDashboard, group: 'Workspace' },
  { to: '/app/dashboards/executive',  label: 'Client_A', icon: TrendingUp, group: 'Dashboards' },
  { to: '/app/dashboards/operations', label: 'Client_B', icon: Boxes,      group: 'Dashboards' },
  { to: '/app/dashboards/analytics',  label: 'Client_C', icon: Activity,   group: 'Dashboards' },
  { to: '/app/tickets',               label: 'My Tickets',       icon: Ticket,          group: 'Tools' },
  { to: '/app/support',               label: 'Support Connect',  icon: Headphones,      group: 'Tools' },
  { to: '/app/profile',               label: 'Profile',          icon: UserCircle2,     group: 'Account' },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const access = useAccess()
  const { bump } = useRefresh()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation()

  useEffect(() => { setOpen(false); setProfileOpen(false) }, [loc.pathname])

  // Cmd/Ctrl+K opens the search palette globally.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    bump()
    toast.success('Refreshing live data', 'Pulling the latest from your warehouse.', { duration: 2500 })
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 sticky top-0 h-screen">
        <SidebarInner access={access} />
      </aside>

      {/* Sidebar (mobile drawer) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] flex flex-col">
            <SidebarInner access={access} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <div className="glass rounded-2xl px-3 sm:px-4 h-14 flex items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2 lg:hidden">
                <Logo className="h-6 w-auto" />
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100/70 hover:bg-slate-200/70 px-3 h-9 text-sm text-slate-500 flex-1 max-w-md transition"
                aria-label="Open search"
              >
                <Search size={16} />
                <span className="flex-1 text-left text-slate-400">Search dashboards, tickets…</span>
                <kbd className="hidden sm:inline-flex text-[10px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 ml-auto"
                title="Search (⌘K)"
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              <button
                onClick={handleRefresh}
                className="lg:ml-2 p-2 rounded-lg hover:bg-slate-100 disabled:opacity-60"
                title="Refresh live data"
                aria-label="Refresh"
                disabled={refreshing}
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>

              <NotificationBell />

              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 hover:bg-slate-100"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-sm font-bold shadow-glow">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      user?.full_name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">{user?.full_name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">{roleLabel(user?.role)}</div>
                  </div>
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-12 w-60 z-20 glass rounded-2xl p-2 animate-pop-in">
                      <div className="px-3 py-2.5">
                        <div className="text-sm font-bold text-slate-900 truncate">{user?.full_name}</div>
                        <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                      </div>
                      <div className="h-px bg-slate-200 my-1" />
                      <NavLink to="/app/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100">
                        <UserCircle2 size={16} /> Profile
                      </NavLink>
                      <NavLink to="/app/tickets" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100">
                        <Ticket size={16} /> My tickets
                      </NavLink>
                      <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50">
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FloatingAgent />
      <AccessWatcher />
    </div>
  )
}

function SidebarInner({ access, onClose }) {
  const visibleNav = NAV.filter((n) => {
    if (n.to === '/app')                              return access.canViewOverview || access.role === 'client'
    if (n.to === '/app/dashboards/executive')         return access.dashboards.includes('executive')
    if (n.to === '/app/dashboards/operations')        return access.dashboards.includes('operations')
    if (n.to === '/app/dashboards/analytics')         return access.dashboards.includes('analytics')
    return true // tickets / profile always visible
  })
  const grouped = visibleNav.reduce((acc, n) => {
    acc[n.group] = acc[n.group] || []
    acc[n.group].push(n)
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200/80 lg:bg-transparent lg:border-r-0">
      {/* Logo card */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl px-3 py-3 bg-white text-slate-900 border border-slate-200/80 shadow-soft relative overflow-hidden">
          <Logo className="h-11 w-auto" />
          {onClose && (
            <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-slate-100" aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-4 overflow-y-auto">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] font-extrabold text-slate-400">
              {group}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.to} {...item} end={item.to === '/app'} />
              ))}
            </div>
          </div>
        ))}

        {/* Company-side users are part of the approval workflow (admin
            stays the only role that can manage Users). Show Approvals +
            Support Live to them too. */}
        {access.canViewOverview && !access.canViewAdmin && (
          <div>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] font-extrabold text-slate-400">Live</div>
            <NavItem to="/app/admin/tickets"   label="Approvals"  icon={ShieldCheck} />
            <NavItem to="/app/support/dashboard" label="Support Live" icon={Headphones} />
          </div>
        )}
        {access.canViewAdmin && (
          <div>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] font-extrabold text-slate-400">Admin</div>
            <NavItem to="/app/admin/users" label="Users" icon={UserCircle2} />
            <NavItem to="/app/admin/tickets" label="Approvals" icon={ShieldCheck} />
            <NavItem to="/app/support/dashboard" label="Support Live" icon={Headphones} />
          </div>
        )}
      </nav>

    </div>
  )
}

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isActive
            ? 'bg-white text-brand-800 shadow-soft border border-slate-200/70'
            : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className={`shrink-0 ${isActive ? 'text-brand-700' : 'text-slate-500'}`} />
          <span className="flex-1 leading-tight">{label}</span>
          {isActive && <ChevronRight size={14} className="text-brand-600 shrink-0" />}
        </>
      )}
    </NavLink>
  )
}
