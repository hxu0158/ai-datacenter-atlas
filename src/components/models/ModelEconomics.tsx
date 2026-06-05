import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Label,
  LabelList,
} from 'recharts'
import { models, blendedPrice, labColor, dateNum } from '../../lib/models'
import { useAtlas } from '../../store'
import { ChartCard, AXIS, GRID_COLOR } from '../charts/chart-ui'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (v: number) => {
  const y = Math.floor(v + 1e-6)
  const m = Math.round((v - y) * 12)
  return `${MON[Math.min(11, Math.max(0, m))]} '${String(y).slice(2)}`
}
const fmtPrice = (v: number) => `$${v >= 1 ? v : v.toFixed(2)}`

interface Pt {
  id: string
  name: string
  lab: string
  open: boolean
  x: number
  y: number
  idx: number
}

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const pt = payload.find((p: any) => p.payload?.id)
  if (!pt) return null
  const d = pt.payload as Pt
  return (
    <div className="rounded-md border border-ink-500/70 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold text-slate-100">{d.name}</div>
      <div className="text-slate-400">{d.lab} · {fmtDate(d.x)}</div>
      <div className="tnum mt-0.5 text-slate-300">${d.y.toFixed(2)}/Mtok · Index {d.idx}</div>
    </div>
  )
}

function IntelPerDollar() {
  const select = useAtlas((s) => s.selectModel)
  const rows = useMemo(() => {
    return models
      .map((m) => {
        const bp = blendedPrice(m)
        return bp != null && bp > 0 && m.intelligence_index != null
          ? { m, v: m.intelligence_index / bp }
          : null
      })
      .filter((r): r is { m: (typeof models)[number]; v: number } => r != null)
      .sort((a, b) => b.v - a.v)
      .slice(0, 16)
  }, [])
  const max = rows.length ? rows[0].v : 1
  return (
    <ChartCard
      title="Intelligence per dollar"
      subtitle="AA Intelligence Index ÷ blended $/Mtok — capability you get per dollar. The cheap-and-capable models (mostly open / Chinese) dominate."
    >
      <div className="flex flex-col gap-1">
        {rows.map(({ m, v }) => (
          <button key={m.id} onClick={() => select(m.id)} className="group flex w-full items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: labColor(m.lab) }} />
            <span className="w-24 shrink-0 truncate text-left text-slate-300 group-hover:text-slate-100">{m.name}</span>
            <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-ink-700/40">
              <div className="h-full rounded" style={{ width: `${10 + 88 * (v / max)}%`, background: labColor(m.lab), opacity: m.open_weights ? 0.5 : 0.95 }} />
            </div>
            <span className="tnum w-10 shrink-0 text-right text-slate-200">{v.toFixed(1)}</span>
          </button>
        ))}
      </div>
    </ChartCard>
  )
}

function TipSpeed({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border border-ink-500/70 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold text-slate-100">{d.name}</div>
      <div className="text-slate-400">{d.lab} · {d.open ? 'open' : 'closed'}</div>
      <div className="tnum mt-0.5 text-slate-300">{d.x} tok/s · ${d.y.toFixed(2)}/Mtok</div>
    </div>
  )
}

interface SPt {
  id: string
  name: string
  lab: string
  open: boolean
  x: number
  y: number
  frontier: boolean
  loff: number
}

function ThroughputCost() {
  const select = useAtlas((s) => s.selectModel)
  const data = useMemo<SPt[]>(() => {
    const base = models
      .map((m) => {
        const bp = blendedPrice(m)
        return bp != null && bp > 0 && m.speed_tok_s != null
          ? { id: m.id, name: m.name, lab: m.lab, open: m.open_weights, x: m.speed_tok_s as number, y: bp }
          : null
      })
      .filter((d): d is Omit<SPt, 'frontier' | 'loff'> => d != null)
    // Pareto: want high speed (x) + low price (y). Sort by speed desc, keep running-min price.
    const bySpeed = [...base].sort((a, b) => b.x - a.x)
    let min = Infinity
    const fset = new Set<string>()
    for (const d of bySpeed) {
      if (d.y < min) {
        min = d.y
        fset.add(d.id)
      }
    }
    const ordered = base.filter((d) => fset.has(d.id)).sort((a, b) => a.x - b.x)
    const off = new Map<string, number>()
    ordered.forEach((d, i) => off.set(d.id, i % 2 === 0 ? -9 : 16))
    return base.map((d) => ({ ...d, frontier: fset.has(d.id), loff: off.get(d.id) ?? -9 }))
  }, [])

  const renderName = (props: any) => {
    const d = data[props.index]
    if (!d || !d.frontier) return null
    return (
      <text x={props.x} y={props.y + d.loff} fill="#e2e8f0" fontSize={9} textAnchor="middle">
        {d.name}
      </text>
    )
  }

  return (
    <ChartCard
      title="Throughput vs. cost — the inference tradeoff"
      subtitle={`Output speed (tok/s) vs blended $/Mtok (log). Bottom-right = fast + cheap. Built from public tok/s + pricing (refreshable via /refresh-data) — our open analog to SemiAnalysis's InferenceX, with no proprietary data. ${data.length} models with a published speed; labeled = the speed/cost frontier.`}
      wide
    >
      <ResponsiveContainer width="100%" height={330}>
        <ScatterChart margin={{ top: 14, right: 24, left: 8, bottom: 24 }}>
          <CartesianGrid stroke={GRID_COLOR} />
          <XAxis type="number" dataKey="x" domain={[0, (max: number) => Math.ceil(max / 20) * 20 + 10]} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`}>
            <Label value="Output speed (tok/s) →" position="bottom" fill="#64748b" fontSize={11} offset={8} />
          </XAxis>
          <YAxis type="number" dataKey="y" scale="log" domain={[0.1, 13]} ticks={[0.1, 0.3, 1, 3, 10]} allowDataOverflow tickFormatter={fmtPrice} tick={AXIS} tickLine={false} axisLine={false}>
            <Label value="Blended $/Mtok (log)" angle={-90} position="left" fill="#64748b" fontSize={11} offset={-2} />
          </YAxis>
          <Tooltip content={<TipSpeed />} cursor={{ strokeDasharray: '3 3', stroke: '#3a4f68' }} />
          <Scatter data={data} onClick={(p: any) => select(p?.id ?? p?.payload?.id ?? null)} className="cursor-pointer" isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={labColor(d.lab)} fillOpacity={d.open ? 0.45 : 0.95} stroke={d.frontier ? '#e2e8f0' : labColor(d.lab)} strokeWidth={d.frontier ? 1.5 : d.open ? 1.2 : 0} />
            ))}
            <LabelList dataKey="name" content={renderName} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export default function ModelEconomics() {
  const select = useAtlas((s) => s.selectModel)
  const [bar, setBar] = useState(50)

  const priced = useMemo<Pt[]>(
    () =>
      models
        .map((m) => {
          const bp = blendedPrice(m)
          return bp != null && bp > 0 && m.intelligence_index != null
            ? { id: m.id, name: m.name, lab: m.lab, open: m.open_weights, x: dateNum(m.released), y: bp, idx: m.intelligence_index }
            : null
        })
        .filter((d): d is Pt => d != null),
    [],
  )

  const { frontier, drop } = useMemo(() => {
    const qual = priced.filter((d) => d.idx >= bar).sort((a, b) => a.x - b.x)
    let min = Infinity
    const f: { x: number; y: number; name?: string }[] = []
    for (const d of qual) {
      if (d.y < min) {
        min = d.y
        f.push({ x: d.x, y: d.y, name: d.name })
      } else {
        f.push({ x: d.x, y: min })
      }
    }
    const first = f.length ? f[0].y : null
    const last = f.length ? f[f.length - 1].y : null
    return { frontier: f, drop: first && last ? first / last : null }
  }, [priced, bar])

  const renderName = (props: any) => {
    const d = priced[props.index]
    // label only the cheapest model at/above the bar (frontier setters get crowded otherwise)
    if (!d) return null
    const isFloor = frontier.some((f) => f.name === d.name && f.y === d.y)
    if (!isFloor) return null
    return (
      <text x={props.x} y={props.y - 8} fill="#e2e8f0" fontSize={9} textAnchor="middle">
        {d.name}
      </text>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-ink-600/50 bg-ink-800/30 p-2.5 text-[11px] leading-snug text-slate-400">
        <span className="font-medium text-slate-300">SemiAnalysis lens — "value capture is shifting to the model labs."</span>{' '}
        The supply side (cost-to-serve, $/GPU-hr, inference margins) is their paid moat, but the demand side — what intelligence costs and how fast it&apos;s deflating — is visible from public data. These two views are the reproducible core.
      </div>

      <ChartCard
        title="The cost of intelligence is collapsing"
        subtitle={`Blended $/Mtok (log) by release date. The line is the cheapest model at or above a chosen capability bar — i.e. the falling price of "Index ≥ ${bar}" intelligence.${drop && drop > 1.05 ? ` It is now ~${drop.toFixed(1)}× cheaper than the first model to clear that bar.` : ''}`}
        wide
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Capability bar: Index ≥</span>
          {[45, 50, 55].map((b) => (
            <button
              key={b}
              onClick={() => setBar(b)}
              className={'rounded border px-2 py-0.5 ' + (bar === b ? 'border-accent/60 bg-accent/15 text-slate-100' : 'border-ink-500/60 text-slate-400 hover:text-slate-200')}
            >
              {b}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={330}>
          <ComposedChart margin={{ top: 14, right: 24, left: 8, bottom: 24 }}>
            <CartesianGrid stroke={GRID_COLOR} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[2025.2, 2026.6]}
              ticks={[2025.25, 2025.5, 2025.75, 2026.0, 2026.25, 2026.5]}
              tickFormatter={fmtDate}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            >
              <Label value="Release date" position="bottom" fill="#64748b" fontSize={11} offset={8} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              scale="log"
              domain={[0.1, 13]}
              ticks={[0.1, 0.3, 1, 3, 10]}
              allowDataOverflow
              tickFormatter={fmtPrice}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            >
              <Label value="Blended $ / Mtok (log)" angle={-90} position="left" fill="#64748b" fontSize={11} offset={-2} />
            </YAxis>
            <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3', stroke: '#3a4f68' }} />
            <Line data={frontier} dataKey="y" type="stepAfter" stroke="#a3e635" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={priced} onClick={(p: any) => select(p?.id ?? p?.payload?.id ?? null)} className="cursor-pointer" isAnimationActive={false}>
              {priced.map((d, i) => (
                <Cell key={i} fill={labColor(d.lab)} fillOpacity={d.idx >= bar ? (d.open ? 0.5 : 0.95) : 0.18} stroke={labColor(d.lab)} strokeWidth={d.open && d.idx >= bar ? 1.2 : 0} />
              ))}
              <LabelList dataKey="name" content={renderName} />
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-1 text-[11px] text-slate-500">
          Dimmed dots fall below the capability bar. The green line is the price floor for that intelligence level — falling as cheaper (often open-weights) models reach it.
        </div>
      </ChartCard>

      <ThroughputCost />

      <IntelPerDollar />
    </div>
  )
}
