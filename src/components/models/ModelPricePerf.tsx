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
} from 'recharts'
import { models, blendedPrice, labColor } from '../../lib/models'
import { ChartCard, AXIS, GRID_COLOR } from '../charts/chart-ui'

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border border-ink-500/70 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold text-slate-100">{d.name}</div>
      <div className="text-slate-400">
        {d.lab} · {d.open ? 'open weights' : 'closed'}
      </div>
      <div className="tnum mt-0.5 text-slate-300">
        ${d.x.toFixed(2)}/Mtok · Index {d.y}
      </div>
    </div>
  )
}

export default function ModelPricePerf() {
  const data = useMemo(
    () =>
      models
        .map((m) => ({
          name: m.name,
          lab: m.lab,
          open: m.open_weights,
          x: blendedPrice(m),
          y: m.intelligence_index,
        }))
        .filter((d): d is { name: string; lab: string; open: boolean; x: number; y: number } =>
          d.x != null && d.y != null && d.x > 0,
        ),
    [],
  )

  return (
    <ChartCard
      title="Price vs. performance — the efficient frontier"
      subtitle="Blended $/Mtok (log, 3:1 in:out) vs AA Intelligence Index. Bottom-right = cheap + smart (commoditizing); top-left = premium pricing power."
      wide
    >
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 24, left: 8, bottom: 24 }}>
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
          <YAxis
            type="number"
            dataKey="y"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            domain={[10, (max: number) => Math.ceil(max) + 3]}
          >
            <Label value="Intelligence Index" angle={-90} position="left" fill="#64748b" fontSize={11} offset={-2} />
          </YAxis>
          <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3', stroke: '#3a4f68' }} />
          <Scatter data={data}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={labColor(d.lab)}
                fillOpacity={d.open ? 0.4 : 0.95}
                stroke={labColor(d.lab)}
                strokeWidth={d.open ? 1.5 : 0}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 text-[11px] text-slate-500">
        The investment read: open-weights + Chinese models (faded) cluster bottom-right — near-frontier capability at a fraction of the price — compressing margins on the premium closed models (top-left).
      </div>
    </ChartCard>
  )
}
