import { useState } from 'react'
import { LayoutGrid, BarChart3 } from 'lucide-react'
import { models, METRICS, type MetricKey, type MetricDef, labColor, metricVal, LABS } from '../../lib/models'
import { useAtlas } from '../../store'

function ratedFor(key: MetricKey) {
  const rated = models.filter((m) => metricVal(m, key) != null)
  const missing = models.filter((m) => metricVal(m, key) == null)
  return { rated, missing }
}

function MetricBars({ metricKey, limit }: { metricKey: MetricKey; limit?: number }) {
  const def = METRICS.find((d) => d.key === metricKey)!
  const select = useAtlas((s) => s.selectModel)
  const rated = models
    .map((m) => ({ m, v: metricVal(m, metricKey) }))
    .filter((r): r is { m: (typeof models)[number]; v: number } => r.v != null)
    .sort((a, b) => b.v - a.v)
  const vals = rated.map((r) => r.v)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const width = (v: number) => {
    const t = max > min ? (v - min) / (max - min) : 1
    return 10 + 88 * t
  }
  const shown = limit ? rated.slice(0, limit) : rated
  return (
    <div className="flex flex-col gap-1">
      {shown.map(({ m, v }) => (
        <button
          key={m.id}
          onClick={() => select(m.id)}
          className="group flex w-full items-center gap-2 text-[11px]"
          title="Click for model detail + sources"
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: labColor(m.lab) }} />
          <span className="w-24 shrink-0 truncate text-left text-slate-300 group-hover:text-slate-100">
            {m.name}
          </span>
          <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-ink-700/40">
            <div
              className="h-full rounded"
              style={{ width: `${width(v)}%`, background: labColor(m.lab), opacity: m.open_weights ? 0.5 : 0.95 }}
            />
          </div>
          <span className="tnum w-9 shrink-0 text-right text-slate-200">{def.pct ? `${v}%` : v}</span>
        </button>
      ))}
    </div>
  )
}

function MissingNote({ metricKey, max }: { metricKey: MetricKey; max?: number }) {
  const { missing } = ratedFor(metricKey)
  if (!missing.length) return null
  const cap = max ?? 6
  const names = missing.slice(0, cap).map((m) => m.name).join(', ')
  return (
    <div className="mt-1.5 text-[10px] leading-snug text-slate-600">
      No published figure: {names}
      {missing.length > cap ? ` +${missing.length - cap} more` : ''}
    </div>
  )
}

function BenchmarkWidget({ def }: { def: MetricDef }) {
  const { rated } = ratedFor(def.key)
  return (
    <div className="flex flex-col rounded-lg border border-ink-600/60 bg-ink-800/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-slate-200">{def.short}</div>
        <span className="tnum shrink-0 text-[10px] text-slate-500">{rated.length}/{models.length} rated</span>
      </div>
      <div className="mb-2 text-[10px] leading-snug text-slate-500">{def.desc}</div>
      <MetricBars metricKey={def.key} limit={8} />
      <MissingNote metricKey={def.key} max={5} />
    </div>
  )
}

export default function ModelLeaderboard() {
  const [mode, setMode] = useState<'all' | 'single'>('all')
  const [metric, setMetric] = useState<MetricKey>('intelligence_index')
  const def = METRICS.find((m) => m.key === metric)!
  const labs = LABS.filter((l) => models.some((m) => m.lab === l))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-md border border-ink-500/60 text-[11px]">
          <button
            onClick={() => setMode('all')}
            className={'flex items-center gap-1.5 px-2.5 py-1 ' + (mode === 'all' ? 'bg-accent/20 text-slate-100' : 'text-slate-400 hover:text-slate-200')}
          >
            <LayoutGrid size={12} /> Compare all benchmarks
          </button>
          <button
            onClick={() => setMode('single')}
            className={'flex items-center gap-1.5 px-2.5 py-1 ' + (mode === 'single' ? 'bg-accent/20 text-slate-100' : 'text-slate-400 hover:text-slate-200')}
          >
            <BarChart3 size={12} /> Rank by one
          </button>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          {labs.map((l) => (
            <span key={l} className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ background: labColor(l) }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {mode === 'all' ? (
        <>
          <div className="text-[11px] leading-snug text-slate-500">
            Top 8 per benchmark · bar color = lab · faded = open weights · click a model for its full profile &amp; sources. A blank means the lab hasn&apos;t cleanly published that figure (we leave it blank rather than guess — see "no published figure" under each).
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {METRICS.map((d) => (
              <BenchmarkWidget key={d.key} def={d} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] uppercase tracking-wide text-slate-500">Rank by</span>
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={
                  'rounded-md border px-2 py-1 text-[11px] transition ' +
                  (metric === m.key
                    ? 'border-accent/60 bg-accent/15 text-slate-100'
                    : 'border-ink-500/60 bg-ink-800/40 text-slate-400 hover:text-slate-200')
                }
              >
                {m.short}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-ink-600/60 bg-ink-800/40 p-3">
            <div className="text-sm font-semibold text-slate-100">{def.label}</div>
            <div className="mb-3 mt-0.5 text-[11px] leading-snug text-slate-400">{def.desc}</div>
            <MetricBars metricKey={metric} />
            <MissingNote metricKey={metric} max={20} />
          </div>
        </div>
      )}
    </div>
  )
}
