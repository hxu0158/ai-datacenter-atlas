import { useMemo, useState } from 'react'
import { Download, ArrowUpDown } from 'lucide-react'
import { useFiltered } from '../lib/useFiltered'
import { useAtlas } from '../store'
import { impliedUnits, impliedSiliconB } from '../lib/aggregate'
import type { EnrichedDataCenter } from '../lib/data'
import { STATUS_COLOR } from '../lib/colors'
import { fmtMW, fmtUSD, fmtUnits, STATUS_LABEL } from '../lib/format'

type SortKey = 'name' | 'group' | 'state' | 'iso' | 'status' | 'mw' | 'fuel' | 'vendor' | 'capex' | 'year'

const COLS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Campus' },
  { key: 'group', label: 'Operator' },
  { key: 'state', label: 'St' },
  { key: 'iso', label: 'ISO' },
  { key: 'status', label: 'Status' },
  { key: 'mw', label: 'IT MW', align: 'right' },
  { key: 'fuel', label: 'Power' },
  { key: 'vendor', label: 'Silicon' },
  { key: 'capex', label: 'Capex', align: 'right' },
  { key: 'year', label: '1st pwr', align: 'right' },
]

function val(d: EnrichedDataCenter, k: SortKey): string | number {
  switch (k) {
    case 'name': return d.name
    case 'group': return d.group
    case 'state': return d.location.state
    case 'iso': return d.grid.iso
    case 'status': return d.status
    case 'mw': return d.capacity.mw_it_full
    case 'fuel': return d.power.primary_fuel
    case 'vendor': return d.silicon.primary_vendor
    case 'capex': return d.investment_usd_b ?? 0
    case 'year': return d.timeline.first_power_year ?? d.timeline.full_buildout_year ?? 9999
  }
}

function exportCsv(rows: EnrichedDataCenter[]) {
  const header = [
    'id', 'name', 'operator', 'group', 'tenants', 'city', 'county', 'state', 'iso', 'utility',
    'status', 'mw_it_full', 'mw_total_facility', 'primary_fuel', 'behind_the_meter',
    'vendor', 'chip', 'implied_units', 'implied_silicon_usd_b', 'investment_usd_b',
    'announced', 'first_power_year', 'full_buildout_year', 'cooling', 'confidence', 'sources',
  ]
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((d) =>
    [
      d.id, d.name, d.operator, d.group, (d.tenants ?? []).join('; '),
      d.location.city, d.location.county ?? '', d.location.state, d.grid.iso, d.grid.utility ?? '',
      d.status, d.capacity.mw_it_full, d.capacity.mw_total_facility ?? '',
      d.power.primary_fuel, d.power.behind_the_meter ?? '',
      d.silicon.primary_vendor, d.silicon.chip ?? '',
      Math.round(impliedUnits(d)), impliedSiliconB(d).toFixed(1), d.investment_usd_b ?? '',
      d.timeline.announced ?? '', d.timeline.first_power_year ?? '', d.timeline.full_buildout_year ?? '',
      d.cooling ?? '', d.confidence, (d.sources ?? []).join(' | '),
    ]
      .map(esc)
      .join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-datacenter-atlas_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DataTable() {
  const { dcs } = useFiltered()
  const select = useAtlas((s) => s.select)
  const selected = useAtlas((s) => s.selected)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'mw', dir: -1 })

  const rows = useMemo(() => {
    const r = [...dcs]
    r.sort((a, b) => {
      const va = val(a, sort.key)
      const vb = val(b, sort.key)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir
      return String(va).localeCompare(String(vb)) * sort.dir
    })
    return r
  }, [dcs, sort])

  const clickSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'name' ? 1 : -1 }))

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[11px] text-slate-400">
          {rows.length} campuses · click a row for detail
        </span>
        <button
          onClick={() => exportCsv(rows)}
          className="flex items-center gap-1.5 rounded border border-ink-500/60 bg-ink-800/60 px-2 py-1 text-[11px] text-slate-300 hover:border-accent/60 hover:text-accent"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>
      <div className="max-h-[68vh] overflow-auto rounded-lg border border-ink-600/60">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-ink-800">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => clickSort(c.key)}
                  className={
                    'cursor-pointer select-none whitespace-nowrap border-b border-ink-600 px-2 py-1.5 font-medium text-slate-400 hover:text-slate-200 ' +
                    (c.align === 'right' ? 'text-right' : 'text-left')
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort.key === c.key && <ArrowUpDown size={10} className="text-accent" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const sel = selected?.kind === 'dc' && selected.id === d.id
              return (
                <tr
                  key={d.id}
                  onClick={() => select({ kind: 'dc', id: d.id })}
                  className={
                    'cursor-pointer border-b border-ink-700/50 ' +
                    (sel ? 'bg-accent/10' : 'hover:bg-ink-800/60')
                  }
                >
                  <td className="px-2 py-1 text-slate-200">{d.name}</td>
                  <td className="px-2 py-1 text-slate-400">{d.group}</td>
                  <td className="px-2 py-1 text-slate-400">{d.location.state}</td>
                  <td className="px-2 py-1 text-slate-400">{d.grid.iso}</td>
                  <td className="px-2 py-1">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[d.status] }} />
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="tnum px-2 py-1 text-right text-slate-200">{fmtMW(d.capacity.mw_it_full)}</td>
                  <td className="px-2 py-1 text-slate-400">{d.power.primary_fuel.replace(/_/g, ' ')}</td>
                  <td className="px-2 py-1 text-slate-400">{d.silicon.primary_vendor}</td>
                  <td className="tnum px-2 py-1 text-right text-slate-300">{fmtUSD(d.investment_usd_b)}</td>
                  <td className="tnum px-2 py-1 text-right text-slate-400">
                    {d.timeline.first_power_year ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
