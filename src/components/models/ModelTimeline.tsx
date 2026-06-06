import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Label,
  LabelList,
} from 'recharts'
import { models, labColor, dateNum, type AIModel } from '../../lib/models'
import { useAtlas } from '../../store'
import { ChartCard, AXIS, GRID_COLOR } from '../charts/chart-ui'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtDate(v: number): string {
  const y = Math.floor(v + 1e-6)
  const m = Math.round((v - y) * 12)
  return `${MON[Math.min(11, Math.max(0, m))]} '${String(y).slice(2)}`
}

function frontier(ms: AIModel[]): { x: number; y: number }[] {
  const pts = ms
    .filter((m) => m.intelligence_index != null)
    .map((m) => ({ x: dateNum(m.released), y: m.intelligence_index as number }))
    .sort((a, b) => a.x - b.x)
  let max = -Infinity
  const out: { x: number; y: number }[] = []
  for (const p of pts) {
    if (p.y > max) max = p.y
    out.push({ x: p.x, y: max })
  }
  return out
}

interface Pt {
  id: string
  x: number
  y: number
  z: number
  name: string
  lab: string
  open: boolean
  mover: boolean
  loff: number
}

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const pt = payload.find((p: any) => p.payload?.name)
  if (!pt) return null
  const d = pt.payload as Pt
  return (
    <div className="rounded-md border border-ink-500/70 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold text-slate-100">{d.name}</div>
      <div className="text-slate-400">{d.lab} · {fmtDate(d.x)} · {d.open ? 'open' : 'closed'}</div>
      <div className="tnum mt-0.5 text-slate-300">Index {d.y}</div>
    </div>
  )
}

export default function ModelTimeline() {
  const select = useAtlas((s) => s.selectModel)
  const closedFrontier = useMemo(() => frontier(models.filter((m) => !m.open_weights)), [])
  const openFrontier = useMemo(() => frontier(models.filter((m) => m.open_weights)), [])

  const scatter = useMemo<Pt[]>(() => {
    // flag "frontier movers": models that set a new max for their (open/closed) class
    const movers = new Set<string>()
    for (const group of [models.filter((m) => !m.open_weights), models.filter((m) => m.open_weights)]) {
      const sorted = group
        .filter((m) => m.intelligence_index != null)
        .sort((a, b) => dateNum(a.released) - dateNum(b.released))
      let max = -Infinity
      for (const m of sorted) {
        if ((m.intelligence_index as number) > max) {
          max = m.intelligence_index as number
          movers.add(m.id)
        }
      }
    }
    // alternate label offsets (above/below) so crowded frontier-setters don't overlap
    const moverList = models.filter((m) => movers.has(m.id)).sort((a, b) => dateNum(a.released) - dateNum(b.released))
    const moff = new Map<string, number>()
    moverList.forEach((m, i) => moff.set(m.id, i % 2 === 0 ? -9 : 16))
    return models
      .filter((m) => m.intelligence_index != null)
      .map((m) => ({
        id: m.id,
        x: dateNum(m.released),
        y: m.intelligence_index as number,
        z: movers.has(m.id) ? 2 : 1,
        name: m.name,
        lab: m.lab,
        open: m.open_weights,
        mover: movers.has(m.id),
        loff: moff.get(m.id) ?? -9,
      }))
  }, [])

  const closedTop = closedFrontier.length ? closedFrontier[closedFrontier.length - 1].y : 0
  const openTop = openFrontier.length ? openFrontier[openFrontier.length - 1].y : 0

  const renderName = (props: any) => {
    const d = scatter[props.index]
    if (!d || !d.mover) return null
    return (
      <text x={props.x} y={props.y + d.loff} fill="#e2e8f0" fontSize={9} textAnchor="middle">
        {d.name}
      </text>
    )
  }

  return (
    <ChartCard
      title="Capability frontier over time"
      subtitle="Each dot is a model, placed by release date (x) and capability (y = AA Intelligence Index). The lines trace the best score reached so far — the frontier — for closed (solid) vs open-weights (dashed); labeled dots are the models that pushed a frontier up. Click any dot for detail."
      wide
    >
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 18, right: 20, left: 8, bottom: 26 }}>
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
          <YAxis type="number" dataKey="y" domain={[10, 'dataMax+5']} tick={AXIS} tickLine={false} axisLine={false}>
            <Label value="Intelligence Index" angle={-90} position="left" fill="#64748b" fontSize={11} offset={-2} />
          </YAxis>
          <ZAxis dataKey="z" range={[55, 150]} />
          <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3', stroke: '#3a4f68' }} />
          {/* frontiers drawn as connecting lines with hidden points (ScatterChart keeps per-dot tooltips working) */}
          <Scatter data={closedFrontier} line={{ stroke: '#3fb6ff', strokeWidth: 2 }} lineType="joint" shape={() => <g />} isAnimationActive={false} />
          <Scatter data={openFrontier} line={{ stroke: '#a3e635', strokeWidth: 2, strokeDasharray: '5 4' }} lineType="joint" shape={() => <g />} isAnimationActive={false} />
          <Scatter data={scatter} onClick={(p: any) => select(p?.id ?? p?.payload?.id ?? null)} className="cursor-pointer" isAnimationActive={false}>
            {scatter.map((d, i) => (
              <Cell key={i} fill={labColor(d.lab)} fillOpacity={d.open ? 0.5 : 0.95} stroke={d.mover ? '#e2e8f0' : labColor(d.lab)} strokeWidth={d.mover ? 1.4 : 0} />
            ))}
            <LabelList dataKey="name" content={renderName} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: '#3fb6ff' }} /> closed frontier (now {closedTop})</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed" style={{ borderColor: '#a3e635' }} /> open-weights frontier (now {openTop})</span>
        <span className="text-slate-500">→ open trails closed by ~{closedTop - openTop} index points</span>
      </div>
    </ChartCard>
  )
}
