import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Label,
  LabelList,
} from 'recharts'
import { models, blendedPrice, labColor } from '../../lib/models'
import { useAtlas } from '../../store'
import { ChartCard, AXIS, GRID_COLOR } from '../charts/chart-ui'

interface Pt {
  id: string
  name: string
  lab: string
  open: boolean
  x: number
  y: number
  frontier: boolean
}

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as Pt
  return (
    <div className="rounded-md border border-ink-500/70 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold text-slate-100">{d.name}</div>
      <div className="text-slate-400">{d.lab} · {d.open ? 'open weights' : 'closed'}</div>
      <div className="tnum mt-0.5 text-slate-300">${d.x.toFixed(2)}/Mtok · Index {d.y}</div>
    </div>
  )
}

export default function ModelPricePerf() {
  const select = useAtlas((s) => s.selectModel)
  const data = useMemo<Pt[]>(() => {
    const base = models
      .map((m) => ({
        id: m.id,
        name: m.name,
        lab: m.lab,
        open: m.open_weights,
        x: blendedPrice(m),
        y: m.intelligence_index,
      }))
      .filter((d): d is Omit<Pt, 'frontier'> => d.x != null && d.y != null && d.x > 0)
    // Efficient frontier: cheapest model to reach each new capability level
    const byPrice = [...base].sort((a, b) => a.x - b.x)
    let runMax = -Infinity
    const frontierIds = new Set<string>()
    for (const p of byPrice) {
      if (p.y > runMax) {
        runMax = p.y
        frontierIds.add(p.id)
      }
    }
    return base.map((d) => ({ ...d, frontier: frontierIds.has(d.id) }))
  }, [])

  const renderName = (props: any) => {
    const d = data[props.index]
    if (!d || !d.frontier) return null
    return (
      <text x={props.x} y={props.y - 9} fill="#e2e8f0" fontSize={9} textAnchor="middle">
        {d.name}
      </text>
    )
  }

  return (
    <ChartCard
      title="Price vs. performance — the efficient frontier"
      subtitle="Blended $/Mtok (log, 3:1 in:out) vs AA Intelligence Index. Labeled = the efficient frontier (cheapest model to reach each capability tier). Bottom-right = cheap + smart; top-left = premium. Click any dot for detail."
      wide
    >
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 16, right: 28, left: 8, bottom: 26 }}>
          <CartesianGrid stroke={GRID_COLOR} />
          <XAxis
            type="number"
            dataKey="x"
            scale="log"
            domain={['auto', 'auto']}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          >
            <Label value="Blended $ / Mtok  (log scale)" position="bottom" fill="#64748b" fontSize={11} offset={8} />
          </XAxis>
          <YAxis type="number" dataKey="y" tick={AXIS} tickLine={false} axisLine={false} domain={[10, (max: number) => Math.ceil(max) + 4]}>
            <Label value="Intelligence Index" angle={-90} position="left" fill="#64748b" fontSize={11} offset={-2} />
          </YAxis>
          <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3', stroke: '#3a4f68' }} />
          <Scatter data={data} onClick={(p: any) => select(p?.id ?? p?.payload?.id ?? null)} className="cursor-pointer">
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={labColor(d.lab)}
                fillOpacity={d.open ? 0.4 : 0.95}
                stroke={d.frontier ? '#e2e8f0' : labColor(d.lab)}
                strokeWidth={d.frontier ? 1.5 : d.open ? 1.2 : 0}
              />
            ))}
            <LabelList dataKey="name" content={renderName} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 text-[11px] text-slate-500">
        The investment read: open-weights + Chinese models (faded) sit on the bottom-right frontier — near-frontier capability at a fraction of the price — compressing margins on the premium closed models (top-left).
      </div>
    </ChartCard>
  )
}
