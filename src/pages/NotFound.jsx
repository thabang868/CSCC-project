import { Link } from 'react-router-dom'
import Logo from '../components/layout/Logo.jsx'

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card p-12 text-center max-w-md relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="relative">
          <Logo className="h-10 w-auto mx-auto" />
          <div className="font-display mt-6 text-display-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-brand-600 to-violet-700">
            404
          </div>
          <p className="mt-2 text-slate-600">The page you’re looking for doesn’t exist.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/" className="btn-ghost">Home</Link>
            <Link to="/app" className="btn-primary">Open app</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
