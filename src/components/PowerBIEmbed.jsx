import { useEffect, useMemo, useRef, useState } from 'react'
import { PowerBIEmbed } from 'powerbi-client-react'
import { models } from 'powerbi-client'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { pbiApi } from '../services/api.js'
import Loader from './ui/Loader.jsx'

/**
 * Embed strategy (in priority order):
 *   1. Backend `/api/powerbi/embed/{category}` (service principal, real Embed token).
 *   2. Per-category Publish-to-web URL: VITE_PBI_{CATEGORY}_URL.
 *   3. Shared Publish-to-web URL + per-category pageName:
 *        VITE_PBI_BASE_URL  (e.g.  https://app.powerbi.com/view?r=eyJ...)
 *        VITE_PBI_{CATEGORY}_PAGE  (e.g.  ReportSection  /  9624f37881810d377aac)
 *   4. Friendly placeholder.
 */
export default function PowerBIDashboard({ category, title }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const containerRef = useRef(null)

  const iframeUrl = useMemo(() => {
    const env = import.meta.env
    const direct = {
      executive:  env.VITE_PBI_EXECUTIVE_URL,
      operations: env.VITE_PBI_OPERATIONS_URL,
      analytics:  env.VITE_PBI_ANALYTICS_URL,
    }[category]
    if (direct) return direct

    const base = env.VITE_PBI_BASE_URL
    const page = {
      executive:  env.VITE_PBI_EXECUTIVE_PAGE,
      operations: env.VITE_PBI_OPERATIONS_PAGE,
      analytics:  env.VITE_PBI_ANALYTICS_PAGE,
    }[category]
    if (base) {
      const sep = base.includes('?') ? '&' : '?'
      return page ? `${base}${sep}pageName=${encodeURIComponent(page)}` : base
    }
    return ''
  }, [category])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await pbiApi.embed(category)
      setConfig(r?.configured ? r : null)
    } catch {
      setConfig(null)
      if (!iframeUrl) setError('Could not load Power BI embed configuration.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  // If nothing is configured (no service principal, no iframe URL), render
  // nothing at all - the live Recharts visuals below are the dashboard.
  // The embed reappears automatically once env vars are set.
  if (!loading && !config?.configured && !iframeUrl) return null

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-100 text-brand-800">Power BI</span>
          <div className="font-semibold text-slate-800">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost !px-3 !py-1.5 text-xs">
            <RefreshCw size={14} /> Refresh
          </button>
          {iframeUrl && (
            <a href={iframeUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs">
              <ExternalLink size={14} /> Open
            </a>
          )}
        </div>
      </div>

      <div ref={containerRef} className="aspect-video w-full bg-slate-100">
        {loading && <Loader label="Loading Power BI…" />}

        {!loading && config?.configured && (
          <PowerBIEmbed
            embedConfig={{
              type: 'report',
              id: config.reportId,
              embedUrl: config.embedUrl,
              accessToken: config.accessToken,
              tokenType: models.TokenType.Embed,
              settings: {
                navContentPaneEnabled: true,
                filterPaneEnabled: true,
                background: models.BackgroundType.Transparent,
              },
            }}
            cssClassName="w-full h-full"
          />
        )}

        {!loading && !config?.configured && iframeUrl && (
          <iframe
            title={title}
            src={iframeUrl}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
          />
        )}

        {!loading && !config?.configured && !iframeUrl && (
          <div className="h-full grid place-items-center text-center p-6">
            <div className="max-w-md">
              <div className="text-sm font-semibold text-slate-700 mb-1">Power BI not connected yet</div>
              <p className="text-sm text-slate-500">
                Paste a <span className="font-medium">Publish to web</span> URL into{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs">VITE_PBI_BASE_URL</code> in
                <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs ml-1">Frontend/.env</code>,
                or configure a service principal in <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs">Backend/.env</code>.
                The live charts below remain fully functional in the meantime.
              </p>
              {error && <div className="mt-3 text-xs text-rose-600">{error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
