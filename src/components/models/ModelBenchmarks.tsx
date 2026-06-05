import { useMemo, useState } from 'react'
import { Download, ArrowUpDown } from 'lucide-react'
import { models, blendedPrice, labColor, METRICS, type AIModel, type MetricKey } from '../../lib/models'
import { useAtlas } from '../../store'

type ColKind = 'text' | 'num' | 'metric'
interface Col {
  k: string
  label: string
  kind: ColKind
  pct?: boolean
}
const COLS: Col[] = [
  { k: 'name', label: 'Model', kind: 'text' },
  { k: 'lab', label: 'Lab', kind: 'text' },
  { k: 'type', label: 'Type', kind: 'text' },
  { k: 'released', label: 'Released', kind: 'text' },
  { k: 'context_k', label: 'Ctx(k)', kind: 'num' },
  { k: 'price_in', label: '$in', kind: 'num' },
  { k: 'price_out', label: '$out', kind: 'num' },
  { k: 'blended', label: '$blend', kind: 'num' },
  { k: 'arena_elo', label: 'Arena', kind: 'metric' },
  { k: 'intelligence_index', label: 'Index', kind: 'metric' },
  { k: 'gpqa', label: 'GPQA', kind: 'metric', pct: true },
  { k: 'aime', label: 'AIME', kind: 'metric', pct: true },
  { k: 'swe_bench', label: 'SWE', kind: 'metric', pct: true },
  { k: 'mmlu_pro', label: 'MMLU-Pro', kind: 'metric', pct: true },
  { k: 'hle', label: 'HLE', kind: 'metric', pct: true },
]
const METRIC_KEYS = COLS.filter((c) => c.kind === 'metric').map((c) => c.k) as MetricKey[]

function val(m: AIModel, k: string): string | number | null {
  if (k === 'type') return m.open_weights ? 'open' : 'closed'
  if (k === 'blended') return blendedPrice(m)
  const v = (m as any)[k]
  return v == null ? null : v
}

function exportCsv(rows: AIModel[]) {
  const keys = ['id', 'name', 'lab', 'open_weights', 'license', 'released', 'context_k', 'params_b', 'price_in', 'price_out', 'arena_elo', 'arena_rank', 'intelligence_index', 'gpqa', 'aime', 'swe_bench', 'mmlu_pro', 'hle', 'speed_tok_s', 'confidence', 'sources']
  const esc = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join(' | ') : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [keys.join(','), ...rows.map((m) => keys.map((k) => esc((m as any)[k])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-models_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ModelBenchmarks() {
  const select = useAtlas((s) => s.selectModel)
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'intelligence_index', dir: -1 })

  const ranges = useMemo(() => {
    const r: Record<string, { min: number; max: number }> = {}
    METRIC_KEYS.forEach((k) => {
      const vals = models.map((m) => m[k]).filter((v): v is number => typeof v === 'number')
      r[k] = { min: Math.min(...vals), max: Math.max(...vals) }
    })
    return r
  }, [])

  const rows = useMemo(() => {
    const arr = [...models]
    arr.sort((a, b) => {
      const va = val(a, sort.k)
      const vb = val(b, sort.k)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir
      return String(va).localeCompare(String(vb)) * sort.dir
    })
    return arr
  }, [sort])

  const cellBg = (k: string, v: number | null) => {
    if (v == null || !ranges[k]) return undefined
    const { min, max } = ranges[k]
    const t = max > min ? (v - min) / (max - min) : 1
    return `rgba(63,182,255,${0.1 + 0.55 * t})`
  }
  const clickSort = (k: string) =>
    setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' || k === 'lab' ? 1 : -1 }))

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[11px] text-slate-400">
          {rows.length} models · scores heat-mapped per column · ○ = open weights · click a header to sort
        </span>
        <button
          onClick={() => exportCsv(rows)}
          className="flex items-center gap-1.5 rounded border border-ink-500/60 bg-ink-800/60 px-2 py-1 text-[11px] text-slate-300 hover:border-accent/60 hover:text-accent"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>
      <div className="max-h-[64vh] overflow-auto rounded-lg border border-ink-600/60">
        <table className="w-full min-w-[760px] border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-ink-800">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.k}
                  onClick={() => clickSort(c.k)}
                  title={METRICS.find((d) => d.key === c.k)?.desc ?? c.label}
                  className={
                    'cursor-pointer select-none whitespace-nowrap border-b border-ink-600 px-2 py-1.5 font-medium text-slate-400 hover:text-slate-200 ' +
                    (c.kind === 'text' ? 'text-left' : 'text-right')
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort.k === c.k && <ArrowUpDown size={9} className="text-accent" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                onClick={() => select(m.id)}
                className="cursor-pointer border-b border-ink-700/50 hover:bg-ink-800/40"
              >
                <td className="whitespace-nowrap px-2 py-1 text-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: labColor(m.lab) }} />
                    {m.name}
                    {m.open_weights && <span className="text-[9px] text-lime-400/80">○</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-slate-400">{m.lab}</td>
                <td className="px-2 py-1 text-right text-slate-400">{m.open_weights ? 'open' : 'closed'}</td>
                <td className="px-2 py-1 text-right text-slate-400">{m.released}</td>
                <td className="tnum px-2 py-1 text-right text-slate-300">{m.context_k ?? '—'}</td>
                <td className="tnum px-2 py-1 text-right text-slate-300">{m.price_in ?? '—'}</td>
                <td className="tnum px-2 py-1 text-right text-slate-300">{m.price_out ?? '—'}</td>
                <td className="tnum px-2 py-1 text-right text-slate-300">
                  {blendedPrice(m) == null ? '—' : `$${blendedPrice(m)!.toFixed(1)}`}
                </td>
                {METRIC_KEYS.map((k) => {
                  const v = typeof m[k] === 'number' ? (m[k] as number) : null
                  const col = COLS.find((c) => c.k === k)!
                  return (
                    <td key={k} className="tnum px-2 py-1 text-right text-slate-100" style={{ background: cellBg(k, v) }}>
                      {v == null ? '—' : col.pct ? `${v}%` : v}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
