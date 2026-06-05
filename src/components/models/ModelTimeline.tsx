import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Label,
} from 'recharts'
import { models, labColor, dateNum, type AIModel } from '../../lib/models'
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

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const pt = payload.find((p: any) => p.payload?.name)
  if (!pt) return null
  const d = pt.payload
  return (
    <div className="rounded-md border border-ink-500/70 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold text-slate-100">{d.name}</div>
      <div className="text-slate-400">
        {d.lab} · {fmtDate(d.x)} · {d.open ? 'open' : 'closed'}
      </div>
      <div className="tnum mt-0.5 text-slate-300">Index {d.y}</div>
    </div>
  )
}

export default function ModelTimeline() {
  const closedFrontier = useMemo(() => frontier(models.filter((m) => !m.open_weights)), [])
  const openFrontier = useMemo(() => frontier(models.filter((m) => m.open_weights)), [])
  const scatter = useMemo(
    () =>
      models
        .filter((m) => m.intelligence_index != null)
        .map((m) => ({
          x: dateNum(m.released),
          y: m.intelligence_index as number,
          name: m.name,
          lab: m.lab,
          open: m.open_weights,
        })),
    [],
  )
  const closedTop = closedFrontier.length ? closedFrontier[closedFrontier.length - 1].y : 0
  const openTop = openFrontier.length ? openFrontier[openFrontier.length - 1].y : 0

  return (
    <ChartCard
      title="Capability frontier over time"
      subtitle={`AA Intelligence Index by release date. The closed frontier leads the open-weights frontier by ~${closedTop - openTop} index points — the live measure of the commoditization gap.`}
      wide
    >
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart margin={{ top: 10, right: 20, left: 8, bottom: 24 }}>
          <CartesianGrid stroke={GRID_COLOR} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[2025.2, 2026.55]}
            ticks={[2025.25, 2025.5, 2025.75, 2026.0, 2026.25, 2026.5]}
            tickFormatter={fmtDate}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis type="number" dataKey="y" domain={[10, 'dataMax+3']} tick={AXIS} tickLine={false} axisLine={false}>
            <Label value="Intelligence Index" angle={-90} position="left" fill="#64748b" fontSize={11} offset={-2} />
          </YAxis>
          <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3', stroke: '#3a4f68' }} />
          <Line
            data={closedFrontier}
            dataKey="y"
            name="Closed frontier"
            type="stepAfter"
            stroke="#3fb6ff"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            data={openFrontier}
            dataKey="y"
            name="Open frontier"
            type="stepAfter"
            stroke="#a3e635"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Scatter data={scatter}>
            {scatter.map((d, i) => (
              <Cell key={i} fill={labColor(d.lab)} fillOpacity={d.open ? 0.45 : 0.95} stroke={labColor(d.lab)} strokeWidth={d.open ? 1.2 : 0} />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: '#3fb6ff' }} /> closed frontier</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 border-t border-dashed" style={{ borderColor: '#a3e635' }} /> open-weights frontier</span>
      </div>
    </ChartCard>
  )
}
