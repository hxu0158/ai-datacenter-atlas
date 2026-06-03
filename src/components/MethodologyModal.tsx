import { X, ExternalLink, Info } from 'lucide-react'
import { meta } from '../lib/data'

export default function MethodologyModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-500/70 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-600/70 bg-ink-900 p-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-accent" />
            <span className="font-semibold text-slate-100">Methodology & sources</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 text-sm">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] leading-relaxed text-amber-100/90">
            {meta.disclaimer}
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              How figures are derived
            </div>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[12px] leading-relaxed text-slate-300">
              {meta.methodology.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Key sources
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {meta.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-accent hover:underline"
                >
                  <ExternalLink size={11} className="shrink-0" />
                  <span className="truncate">{s.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="border-t border-ink-600/60 pt-3 text-[11px] text-slate-500">
            Dataset v{meta.version} · as of {meta.as_of}. Refresh in a Claude Code session with{' '}
            <code className="rounded bg-ink-700 px-1 text-slate-300">/refresh-data</code>.
          </div>
        </div>
      </div>
    </div>
  )
}
