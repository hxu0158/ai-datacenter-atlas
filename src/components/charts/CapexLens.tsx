import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useFiltered } from '../../lib/useFiltered'
import { useAtlas } from '../../store'
import { capexByOperatorStatus } from '../../lib/aggregate'
import { STATUS_COLOR } from '../../lib/colors'
import { fmtUSD, STATUS_LABEL } from '../../lib/format'
import { ChartCard, AXIS, GRID_COLOR, tooltipProps } from './chart-ui'
import type { Status } from '../../types'

const STATUSES: Status[] = ['operational', 'under_construction', 'announced', 'planned']

export default function CapexLens() {
  const { dcs } = useFiltered()
  const open = useAtlas((s) => s.openDerivation)
  const select = useAtlas((s) => s.select)
  const byOp = useMemo(() => capexByOperatorStatus(dcs), [dcs])
  const top = useMemo(
    () => [...dcs].sort((a, b) => (b.investment_usd_b ?? 0) - (a.investment_usd_b ?? 0)).slice(0, 10),
    [dcs],
  )

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="Capex — by operator, stacked by status"
        subtitle="Disclosed + estimated site investment ($B). Who is committing capital, and how far along."
        wide
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byOp} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="group" tick={{ ...AXIS, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={48} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} />
            <Tooltip {...tooltipProps} formatter={(v: number) => fmtUSD(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {STATUSES.map((s) => (
              <Bar
                key={s}
                dataKey={s}
                name={STATUS_LABEL[s]}
                stackId="capex"
                fill={STATUS_COLOR[s]}
                cursor="pointer"
                onClick={(e: any) => e && open('operatorCapex', e.group)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Largest single-campus commitments" subtitle="Top sites by tracked investment" wide>
        <div className="flex flex-col gap-1">
          {top.map((d) => {
            const max = top[0].investment_usd_b ?? 1
            const w = ((d.investment_usd_b ?? 0) / max) * 100
            return (
              <div
                key={d.id}
                onClick={() => select({ kind: 'dc', id: d.id })}
                className="flex cursor-pointer items-center gap-2 rounded px-1 text-[11px] hover:bg-ink-800/60"
              >
                <span className="w-40 shrink-0 truncate text-slate-300" title={d.name}>
                  {d.name}
                </span>
                <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-ink-700/50">
                  <div
                    className="h-full rounded"
                    style={{ width: `${w}%`, background: 'linear-gradient(90deg,#2a7fb8,#3fb6ff)' }}
                  />
                </div>
                <span className="tnum w-12 shrink-0 text-right text-slate-300">
                  {fmtUSD(d.investment_usd_b)}
                </span>
                <span className="w-28 shrink-0 truncate text-slate-500" title={(d.partners ?? []).join(', ')}>
                  {(d.partners ?? []).slice(0, 2).join(', ')}
                </span>
              </div>
            )
          })}
        </div>
      </ChartCard>
    </div>
  )
}
