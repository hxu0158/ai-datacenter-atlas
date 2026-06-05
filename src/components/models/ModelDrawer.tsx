import type { ReactNode } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { useAtlas } from '../../store'
import { models, METRICS, blendedPrice, labColor, metricVal } from '../../lib/models'

const CONF: Record<string, string> = { high: '#34d399', medium: '#fbbf24', low: '#94a3b8' }

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ color, background: `${color}22`, border: `1px solid ${color}55` }}
    >
      {label}
    </span>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="tnum text-right text-slate-200">{value}</span>
    </div>
  )
}

export default function ModelDrawer() {
  const id = useAtlas((s) => s.selectedModel)
  const select = useAtlas((s) => s.selectModel)
  if (!id) return null
  const m = models.find((x) => x.id === id)
  if (!m) return null

  return (
    <div className="fixed right-0 top-0 z-[1000] flex h-screen w-[360px] max-w-[88vw] flex-col overflow-y-auto border-l border-ink-500/70 bg-ink-900/95 shadow-2xl backdrop-blur">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-ink-600/70 bg-ink-900/95 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: labColor(m.lab) }} />
          <div>
            <div className="text-sm font-semibold leading-snug text-slate-100">{m.name}</div>
            <div className="text-[11px] text-slate-400">{m.lab}</div>
          </div>
        </div>
        <button onClick={() => select(null)} className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge label={m.open_weights ? 'open weights' : 'closed'} color={m.open_weights ? '#a3e635' : '#94a3b8'} />
          <Badge label={`${m.confidence} confidence`} color={CONF[m.confidence]} />
          {m.modality.map((x) => (
            <Badge key={x} label={x} color="#60a5fa" />
          ))}
        </div>

        <div>
          <Row label="Released" value={m.released} />
          {m.license && <Row label="License" value={m.license} />}
          {m.context_k != null && <Row label="Context" value={`${m.context_k.toLocaleString()}k tokens`} />}
          {m.params_b != null && <Row label="Parameters" value={`${m.params_b}B total`} />}
          {m.speed_tok_s != null && <Row label="Speed" value={`${m.speed_tok_s} tok/s`} />}
        </div>

        <div className="border-t border-ink-600/60 pt-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pricing ($/Mtok)</div>
          <Row label="Input" value={m.price_in == null ? '—' : `$${m.price_in}`} />
          <Row label="Output" value={m.price_out == null ? '—' : `$${m.price_out}`} />
          <Row label="Blended (3:1)" value={blendedPrice(m) == null ? '—' : `$${blendedPrice(m)!.toFixed(2)}`} />
        </div>

        <div className="border-t border-ink-600/60 pt-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Leaderboard & benchmarks
          </div>
          {m.arena_elo != null && (
            <Row label="LMArena ELO (votes)" value={`${m.arena_elo}${m.arena_rank ? ` · #${m.arena_rank}` : ''}`} />
          )}
          {METRICS.filter((d) => d.key !== 'arena_elo').map((d) => {
            const v = metricVal(m, d.key)
            return <Row key={d.key} label={d.short} value={v == null ? '—' : d.pct ? `${v}%` : v} />
          })}
        </div>

        {m.notes && (
          <div className="border-t border-ink-600/60 pt-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Analyst note</div>
            <p className="text-[11px] leading-relaxed text-slate-300">{m.notes}</p>
          </div>
        )}

        {m.sources.length > 0 && (
          <div className="border-t border-ink-600/60 pt-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Sources ({m.sources.length})
            </div>
            <div className="flex flex-col gap-1">
              {m.sources.map((u) => {
                let host = u
                try {
                  host = new URL(u).hostname.replace('www.', '')
                } catch {
                  /* keep raw */
                }
                return (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-accent hover:underline">
                    <ExternalLink size={11} className="shrink-0" />
                    <span className="truncate">{host}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
