import { Hourglass } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function AwaitingAccess() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Welcome"
        title="Your workspace is being prepared"
        subtitle="Your dashboard will appear here as soon as it's ready."
      />

      <div className="card p-10 text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="relative">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white grid place-items-center shadow-glow">
            <Hourglass size={26} />
          </div>
          <div className="mt-5 font-display text-2xl font-extrabold text-slate-900 dark:text-white">Almost there</div>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Your account is set up. Hang tight - your dashboard will be ready shortly.
            You'll be redirected automatically when it appears.
          </p>
        </div>
      </div>
    </div>
  )
}
