import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { useFiltered } from '../../lib/useFiltered'
import { useAtlas } from '../../store'
import { unitsByVendor, siliconByOperator, impliedUnits, unitsByChipFamily } from '../../lib/aggregate'
import { VENDOR_COLOR, operatorColor } from '../../lib/colors'
import { fmtUnits, fmtUSD } from '../../lib/format'
import { ChartCard, MiniLegend, AXIS, GRID_COLOR, tooltipProps } from './chart-ui'

const MERCHANT = new Set(['Nvidia', 'AMD'])
const CUSTOM = new Set(['Amazon', 'Google', 'Broadcom', 'Marvell'])

const CHIP_FAMILY_COLOR: Record<string, string> = {
  'Nvidia Blackwell (GB200/300)': '#76b900',
  'Nvidia Hopper (H100/200)': '#4d7c0f',
  'Nvidia Rubin (VR)': '#a3e635',
  'Nvidia (unspecified)': '#3f6212',
  'Google TPU': '#4285f4',
  'AWS Trainium': '#ff9900',
  'AMD Instinct (MI)': '#ed1c24',
  'Mixed / unspecified': '#64748b',
}

export default function SiliconLens() {
  const { dcs } = useFiltered()
  const open = useAtlas((s) => s.openDerivation)

  const byVendor = useMemo(() => unitsByVendor(dcs), [dcs])
  const byChip = useMemo(() => unitsByChipFamily(dcs), [dcs])
  const byOperator = useMemo(() => siliconByOperator(dcs), [dcs])

  const split = useMemo(() => {
    let merchant = 0
    let custom = 0
    let other = 0
    dcs.forEach((d) => {
      const u = impliedUnits(d)
      if (MERCHANT.has(d.silicon.primary_vendor)) merchant += u
      else if (CUSTOM.has(d.silicon.primary_vendor)) custom += u
      else other += u
    })
    return [
      { label: 'Merchant GPU (Nvidia/AMD)', value: merchant, color: '#76b900' },
      { label: 'Custom ASIC (TPU/Trainium/…)', value: custom, color: '#ff9900' },
      { label: 'Mixed / unknown', value: other, color: '#64748b' },
    ].filter((x) => x.value > 0)
  }, [dcs])

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="Implied accelerators — by silicon vendor"
        subtitle="Units implied by IT load (~2 kW/accelerator) or reported counts"
      >
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={byVendor} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
            <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={fmtUnits} />
            <YAxis type="category" dataKey="vendor" tick={AXIS} axisLine={false} tickLine={false} width={64} />
            <Tooltip {...tooltipProps} formatter={(v: number) => `${fmtUnits(v)} units`} />
            <Bar
              dataKey="units"
              radius={[0, 3, 3, 0]}
              cursor="pointer"
              onClick={(e: any) => e && open('vendorUnits', e.vendor)}
            >
              {byVendor.map((v) => (
                <Cell key={v.vendor} fill={VENDOR_COLOR[v.vendor]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Implied accelerators — by chip family"
        subtitle="TPU vs GPU, and GPU generation — these are not fungible (1 TPU ≠ 1 GPU)"
      >
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={byChip} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
            <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={fmtUnits} />
            <YAxis type="category" dataKey="family" tick={{ ...AXIS, fontSize: 9 }} axisLine={false} tickLine={false} width={134} />
            <Tooltip {...tooltipProps} formatter={(v: number) => `${fmtUnits(v)} units`} />
            <Bar
              dataKey="units"
              radius={[0, 3, 3, 0]}
              cursor="pointer"
              onClick={(e: any) => e && open('chipFamilyUnits', e.family)}
            >
              {byChip.map((c) => (
                <Cell key={c.family} fill={CHIP_FAMILY_COLOR[c.family] ?? '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Implied silicon $ — by operator"
        subtitle="Accelerator $ exposure (units × blended ASP), a directional TAM"
      >
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={byOperator} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
            <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} />
            <YAxis type="category" dataKey="group" tick={{ ...AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={92} />
            <Tooltip {...tooltipProps} formatter={(v: number) => fmtUSD(v)} />
            <Bar
              dataKey="siliconB"
              radius={[0, 3, 3, 0]}
              cursor="pointer"
              onClick={(e: any) => e && open('operatorSilicon', e.group)}
            >
              {byOperator.map((o) => (
                <Cell key={o.group} fill={operatorColor(o.group)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Merchant GPU vs. custom ASIC"
        subtitle="The Nvidia-vs-in-house-silicon split, by implied accelerator units"
        wide
      >
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={170}>
            <PieChart>
              <Pie data={split} dataKey="value" nameKey="label" innerRadius={42} outerRadius={68} paddingAngle={2}>
                {split.map((s) => (
                  <Cell key={s.label} fill={s.color} stroke="#0a0e14" />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} formatter={(v: number) => `${fmtUnits(v)} units`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1">
            <MiniLegend
              items={split.map((s) => ({
                label: s.label,
                color: s.color,
                value: fmtUnits(s.value),
              }))}
            />
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
