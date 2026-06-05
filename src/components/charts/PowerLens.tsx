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
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { useFiltered } from '../../lib/useFiltered'
import { useAtlas } from '../../store'
import { powerGapByISO, fuelMix, energyByISO, totalAnnualTWh, US_GRID_TWH } from '../../lib/aggregate'
import { FUEL_COLOR, ASSET_TYPE_COLOR } from '../../lib/colors'
import { FUEL_LABEL, titleCase, fmtPower } from '../../lib/format'
import { ChartCard, MiniLegend, AXIS, GRID_COLOR, tooltipProps } from './chart-ui'

export default function PowerLens() {
  const { dcs, assets } = useFiltered()
  const open = useAtlas((s) => s.openDerivation)

  const gap = useMemo(() => powerGapByISO(dcs, assets), [dcs, assets])
  const fuel = useMemo(() => fuelMix(dcs), [dcs])
  const supplyByType = useMemo(() => {
    const m = new Map<string, number>()
    assets.forEach((a) => m.set(a.type, (m.get(a.type) ?? 0) + a.capacity_mw / 1000))
    return Array.from(m.entries())
      .map(([type, gw]) => ({ type, gw }))
      .sort((a, b) => b.gw - a.gw)
  }, [assets])

  const totalDemand = gap.reduce((a, x) => a + x.demandGW, 0)
  const totalSupply = gap.reduce((a, x) => a + x.supplyGW, 0)

  const loadFactor = useAtlas((s) => s.loadFactor)
  const pue = useAtlas((s) => s.pue)
  const setLoadFactor = useAtlas((s) => s.setLoadFactor)
  const setPue = useAtlas((s) => s.setPue)
  const energy = useMemo(() => energyByISO(dcs, loadFactor, pue), [dcs, loadFactor, pue])
  const totalTWh = useMemo(() => totalAnnualTWh(dcs, loadFactor, pue), [dcs, loadFactor, pue])
  const gridPct = (totalTWh / US_GRID_TWH) * 100

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="Demand vs. tracked dedicated supply — by grid region"
        subtitle={`Campus IT load vs. AI-linked generation. Net gap ${fmtPower((totalDemand - totalSupply) * 1000)} relies on existing grid headroom or uncontracted power.`}
        wide
      >
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={gap} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="iso" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
            <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(1)} GW`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="demandGW"
              name="Compute demand"
              fill="#f87171"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(e: any) => e && open('isoDemand', e.iso)}
            />
            <Bar
              dataKey="supplyGW"
              name="Dedicated supply"
              fill="#a3e635"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(e: any) => e && open('isoSupply', e.iso)}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Campus power mix" subtitle="Share of tracked IT load by primary power source">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie
              data={fuel}
              dataKey="gw"
              nameKey="fuel"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              cursor="pointer"
              onClick={(e: any) => {
                const f = e?.payload?.fuel ?? e?.fuel
                if (f) open('fuelGW', f)
              }}
            >
              {fuel.map((f) => (
                <Cell key={f.fuel} fill={FUEL_COLOR[f.fuel]} stroke="#0a0e14" />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(1)} GW`} />
          </PieChart>
        </ResponsiveContainer>
        <MiniLegend
          items={fuel.map((f) => ({
            label: FUEL_LABEL[f.fuel],
            color: FUEL_COLOR[f.fuel],
            value: `${f.gw.toFixed(1)} GW`,
          }))}
        />
      </ChartCard>

      <ChartCard title="Dedicated supply assets — by type" subtitle="What's actually being built to power it">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={supplyByType} dataKey="gw" nameKey="type" innerRadius={42} outerRadius={68} paddingAngle={2}>
              {supplyByType.map((s) => (
                <Cell key={s.type} fill={ASSET_TYPE_COLOR[s.type as keyof typeof ASSET_TYPE_COLOR]} stroke="#0a0e14" />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(1)} GW`} />
          </PieChart>
        </ResponsiveContainer>
        <MiniLegend
          items={supplyByType.map((s) => ({
            label: titleCase(s.type),
            color: ASSET_TYPE_COLOR[s.type as keyof typeof ASSET_TYPE_COLOR],
            value: `${s.gw.toFixed(1)} GW`,
          }))}
        />
      </ChartCard>

      <ChartCard
        title="Implied annual electricity consumption (TWh/yr)"
        subtitle={`Power (GW) sizes the build; energy (TWh/yr) is what it burns. At full build ≈ ${gridPct.toFixed(0)}% of the entire US grid (~${US_GRID_TWH.toLocaleString()} TWh/yr).`}
        wide
      >
        <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="tnum text-2xl font-semibold text-accent">{totalTWh.toFixed(0)}</span>
            <span className="text-xs text-slate-400">TWh / yr</span>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Load factor</span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={loadFactor}
              onChange={(e) => setLoadFactor(Number(e.target.value))}
              className="w-24 accent-accent"
            />
            <span className="tnum w-8 text-slate-200">{(loadFactor * 100).toFixed(0)}%</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>PUE</span>
            <input
              type="range"
              min={1.05}
              max={1.6}
              step={0.05}
              value={pue}
              onChange={(e) => setPue(Number(e.target.value))}
              className="w-24 accent-accent"
            />
            <span className="tnum w-8 text-slate-200">{pue.toFixed(2)}</span>
          </label>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={energy} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="iso" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
            <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(1)} TWh/yr`} />
            <Bar
              dataKey="twh"
              name="TWh/yr"
              fill="#3fb6ff"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(e: any) => e && open('energyTWh', e.iso)}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
