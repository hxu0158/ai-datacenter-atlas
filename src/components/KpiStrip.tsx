import { useMemo, type ReactNode } from 'react'
import {
  Zap,
  Factory,
  Cpu,
  DollarSign,
  Atom,
  Activity,
  TrendingUp,
  AlertTriangle,
  FunctionSquare,
  Plug,
} from 'lucide-react'
import { useFiltered } from '../lib/useFiltered'
import { computeKpis, totalAnnualTWh, US_GRID_TWH } from '../lib/aggregate'
import { fmtUSD, fmtUnits } from '../lib/format'
import { useAtlas } from '../store'

function Kpi({
  icon,
  label,
  value,
  sub,
  metric,
  accent,
  warn,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  metric: string
  accent?: boolean
  warn?: boolean
}) {
  const open = useAtlas((s) => s.openDerivation)
  return (
    <div
      onDoubleClick={() => open(metric)}
      title="Double-click for derivation (formula + sources)"
      className={
        'group relative flex min-w-[140px] flex-1 cursor-help select-none flex-col gap-1 rounded-lg border px-3 py-2 ' +
        (warn
          ? 'border-amber-500/40 bg-amber-500/5'
          : accent
            ? 'border-accent/40 bg-accent/5'
            : 'border-ink-500/60 bg-ink-800/60')
      }
    >
      <button
        onClick={() => open(metric)}
        title="Show derivation"
        className="absolute right-1 top-1 rounded p-0.5 text-slate-500 opacity-70 transition hover:bg-ink-700 hover:text-accent md:opacity-0 md:group-hover:opacity-100"
      >
        <FunctionSquare size={12} />
      </button>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
        <span className={warn ? 'text-amber-400' : accent ? 'text-accent' : 'text-slate-400'}>
          {icon}
        </span>
        {label}
      </div>
      <div className="tnum text-xl font-semibold leading-none text-slate-100">{value}</div>
      {sub && <div className="tnum text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

export default function KpiStrip() {
  const { dcs, assets } = useFiltered()
  const k = useMemo(() => computeKpis(dcs, assets), [dcs, assets])
  const gap = k.totalGW - k.trackedSupplyGW
  const loadFactor = useAtlas((s) => s.loadFactor)
  const pue = useAtlas((s) => s.pue)
  const twh = useMemo(() => totalAnnualTWh(dcs, loadFactor, pue), [dcs, loadFactor, pue])

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0">
      <Kpi metric="totalGW" icon={<Zap size={13} />} label="Tracked AI capacity" value={`${k.totalGW.toFixed(1)} GW`} sub={`${k.count} campuses`} accent />
      <Kpi metric="energyTWh" icon={<Plug size={13} />} label="Implied energy" value={`${twh.toFixed(0)} TWh/yr`} sub={`≈ ${((twh / US_GRID_TWH) * 100).toFixed(0)}% of US grid`} />
      <Kpi metric="operationalGW" icon={<Activity size={13} />} label="Operational" value={`${k.operationalGW.toFixed(1)} GW`} sub="live today" />
      <Kpi metric="underConstructionGW" icon={<Factory size={13} />} label="Under construction" value={`${k.underConstructionGW.toFixed(1)} GW`} sub="building now" />
      <Kpi metric="futureGW" icon={<TrendingUp size={13} />} label="Announced / planned" value={`${k.futureGW.toFixed(1)} GW`} sub="pipeline" />
      <Kpi metric="capex" icon={<DollarSign size={13} />} label="Capex tracked" value={fmtUSD(k.totalCapexB)} sub="disclosed + est." />
      <Kpi metric="accelerators" icon={<Cpu size={13} />} label="Implied accelerators" value={fmtUnits(k.impliedUnits)} sub={`≈ ${fmtUSD(k.impliedSiliconB)} silicon`} />
      <Kpi metric="nuclear" icon={<Atom size={13} />} label="Nuclear contracted" value={`${k.nuclearGW.toFixed(1)} GW`} sub={`gas ${k.gasGW.toFixed(1)} GW`} />
      <Kpi
        metric="gap"
        icon={<AlertTriangle size={13} />}
        label="Demand − tracked supply"
        value={`${gap > 0 ? '+' : ''}${gap.toFixed(1)} GW`}
        sub={`${k.totalGW.toFixed(0)} demand vs ${k.trackedSupplyGW.toFixed(0)} supply`}
        warn={gap > 0}
      />
    </div>
  )
}
