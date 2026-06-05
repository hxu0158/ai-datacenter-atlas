import { useState, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { models, METRICS, type MetricKey, labColor, metricVal, LABS } from '../../lib/models'
import { ChartCard, AXIS, GRID_COLOR, tooltipProps } from '../charts/chart-ui'

function LabLegend() {
  const labs = LABS.filter((l) => models.some((m) => m.lab === l))
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
      {labs.map((l) => (
        <span key={l} className="flex items-center gap-1 text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ background: labColor(l) }} />
          {l}
        </span>
      ))}
      <span className="flex items-center gap-1 text-slate-400">
        <span className="h-2 w-2 rounded-full border border-slate-300 bg-transparent" /> faded = open weights
      </span>
    </div>
  )
}

export default function ModelLeaderboard() {
  const [metric, setMetric] = useState<MetricKey>('intelligence_index')
  const def = METRICS.find((m) => m.key === metric)!
  const data = useMemo(
    () =>
      models
        .map((m) => ({ name: m.name, lab: m.lab, open: m.open_weights, v: metricVal(m, metric) }))
        .filter((d): d is { name: string; lab: string; open: boolean; v: number } => d.v != null)
        .sort((a, b) => b.v - a.v),
    [metric],
  )

  return (
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
      <ChartCard
        title={def.label}
        subtitle={`${data.length} models with a published figure · bar color = lab`}
        wide
      >
        <ResponsiveContainer width="100%" height={Math.max(260, data.length * 21)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              domain={metric === 'arena_elo' ? ['dataMin', 'dataMax'] : [0, 'dataMax']}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ ...AXIS, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={124}
            />
            <Tooltip {...tooltipProps} formatter={(v: number) => (def.pct ? `${v}%` : `${v}`)} />
            <Bar
              dataKey="v"
              radius={[0, 3, 3, 0]}
              label={{
                position: 'right',
                fill: '#cbd5e1',
                fontSize: 10,
                formatter: (v: number) => (def.pct ? `${v}%` : `${v}`),
              }}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={labColor(d.lab)} fillOpacity={d.open ? 0.5 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <LabLegend />
      </ChartCard>
    </div>
  )
}
