import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { useFiltered } from '../../lib/useFiltered'
import { cumulativeGWByYear } from '../../lib/aggregate'
import { ChartCard, AXIS, GRID_COLOR, tooltipProps } from './chart-ui'

export default function TimelineLens() {
  const { dcs } = useFiltered()
  const series = useMemo(() => cumulativeGWByYear(dcs), [dcs])

  const adds = useMemo(() => {
    return series.map((row, i) => ({
      year: row.year,
      addGW: i === 0 ? row.onlineGW : Math.max(0, row.onlineGW - series[i - 1].onlineGW),
    }))
  }, [series])

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="Cumulative AI capacity online — by year"
        subtitle="GW that has reached first-power (area) vs. full-buildout pipeline (line). The ramp the grid has to absorb."
        wide
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={series} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="onlineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3fb6ff" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3fb6ff" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="year" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
            <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(1)} GW`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="onlineGW"
              name="Online (first power)"
              stroke="#3fb6ff"
              strokeWidth={2}
              fill="url(#onlineFill)"
            />
            <Line
              type="monotone"
              dataKey="pipelineGW"
              name="Full-buildout pipeline"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="New capacity reaching first-power per year" subtitle="Annual GW added (incremental)" wide>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={adds} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="year" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
            <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(1)} GW`} />
            <Bar dataKey="addGW" name="GW added" radius={[2, 2, 0, 0]}>
              {adds.map((a) => (
                <Cell key={a.year} fill="#3fb6ff" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
