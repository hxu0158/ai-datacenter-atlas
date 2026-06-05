// Analytics: derive the KPIs, group-bys, and demand/supply gap the dashboard shows.

import type { EnrichedDataCenter, OperatorGroup } from './data'
import { OPERATOR_GROUPS } from './data'
import type { PowerAsset, Status, PrimaryFuel, AccelVendor, Iso } from '../types'
import type { Filters } from '../store'

/** Planning assumption: ~2.0 kW of IT load per accelerator, all-in. See meta.json. */
export const KW_PER_ACCEL = 2.0

export const VENDOR_ASP: Record<AccelVendor, number> = {
  Nvidia: 45000,
  AMD: 35000,
  Broadcom: 22000,
  Marvell: 22000,
  Amazon: 18000,
  Google: 20000,
  Mixed: 35000,
  Unknown: 35000,
}

export function impliedUnits(dc: EnrichedDataCenter): number {
  return (
    dc.silicon.est_units ??
    dc.capacity.gpu_estimate ??
    Math.round((dc.capacity.mw_it_full * 1000) / KW_PER_ACCEL)
  )
}

export function impliedSiliconB(dc: EnrichedDataCenter): number {
  if (dc.silicon.est_silicon_usd_b != null) return dc.silicon.est_silicon_usd_b
  return (impliedUnits(dc) * VENDOR_ASP[dc.silicon.primary_vendor]) / 1e9
}

// ---- Energy (TWh/yr) — capacity (power) -> annual consumption (energy) -------

export const HOURS_YEAR = 8760
/** Approx. total US annual electricity generation, TWh (for grid-share context). */
export const US_GRID_TWH = 4100
export const DEFAULT_LOAD_FACTOR = 0.8
export const DEFAULT_PUE = 1.3

/** Annual electricity for one campus: IT MW x hours x load factor x PUE -> TWh/yr. */
export function annualTWh(mwIt: number, loadFactor: number, pue: number): number {
  return (mwIt * HOURS_YEAR * loadFactor * pue) / 1e6
}

export function totalAnnualTWh(dcs: EnrichedDataCenter[], loadFactor: number, pue: number): number {
  return dcs.reduce((a, d) => a + annualTWh(d.capacity.mw_it_full, loadFactor, pue), 0)
}

export function energyByISO(
  dcs: EnrichedDataCenter[],
  loadFactor: number,
  pue: number,
): { iso: Iso; twh: number }[] {
  const m = new Map<Iso, number>()
  dcs.forEach((d) =>
    m.set(d.grid.iso, (m.get(d.grid.iso) ?? 0) + annualTWh(d.capacity.mw_it_full, loadFactor, pue)),
  )
  return Array.from(m.entries())
    .map(([iso, twh]) => ({ iso, twh }))
    .sort((a, b) => b.twh - a.twh)
}

// ---- Filtering ----------------------------------------------------------

export function applyFilters(dcs: EnrichedDataCenter[], f: Filters): EnrichedDataCenter[] {
  const q = f.search.trim().toLowerCase()
  return dcs.filter((d) => {
    if (f.operators.length && !f.operators.includes(d.group)) return false
    if (f.statuses.length && !f.statuses.includes(d.status)) return false
    if (f.states.length && !f.states.includes(d.location.state)) return false
    if (f.isos.length && !f.isos.includes(d.grid.iso)) return false
    if (f.fuels.length && !f.fuels.includes(d.power.primary_fuel)) return false
    if (f.vendors.length && !f.vendors.includes(d.silicon.primary_vendor)) return false
    const online = d.timeline.first_power_year ?? d.timeline.full_buildout_year ?? null
    if (online != null && online > f.yearMax) return false
    if (q) {
      const hay = `${d.name} ${d.operator} ${d.location.city} ${d.location.state} ${(d.tenants ?? []).join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/** Power assets relevant to the currently-filtered campuses + their own facets. */
export function filterAssets(
  assets: PowerAsset[],
  f: Filters,
  visibleCampusIds: Set<string>,
): PowerAsset[] {
  return assets.filter((a) => {
    if (f.isos.length && !f.isos.includes(a.iso)) return false
    if (f.states.length && !f.states.includes(a.location.state)) return false
    // If campuses are filtered by operator/status etc., keep assets that are
    // either unlinked (grid-level) or linked to a still-visible campus.
    const narrowed = f.operators.length || f.statuses.length || f.vendors.length || f.fuels.length
    if (narrowed && a.linked_campus_ids.length) {
      if (!a.linked_campus_ids.some((id) => visibleCampusIds.has(id))) return false
    }
    return true
  })
}

// ---- KPIs ---------------------------------------------------------------

const NUCLEAR_TYPES = ['nuclear_restart', 'nuclear_smr', 'nuclear_uprate', 'nuclear_existing']

export interface Kpis {
  count: number
  totalGW: number
  operationalGW: number
  underConstructionGW: number
  futureGW: number // announced + planned
  totalCapexB: number
  impliedUnits: number
  impliedSiliconB: number
  nuclearGW: number
  gasGW: number
  trackedSupplyGW: number
}

export function computeKpis(dcs: EnrichedDataCenter[], assets: PowerAsset[]): Kpis {
  const mwBy = (s: Status) =>
    dcs.filter((d) => d.status === s).reduce((a, d) => a + d.capacity.mw_it_full, 0)
  const totalMW = dcs.reduce((a, d) => a + d.capacity.mw_it_full, 0)
  const nuclearMW = assets
    .filter((a) => NUCLEAR_TYPES.includes(a.type))
    .reduce((a, x) => a + x.capacity_mw, 0)
  const gasMW = assets
    .filter((a) => a.type === 'gas_plant')
    .reduce((a, x) => a + x.capacity_mw, 0)
  const trackedMW = assets.reduce((a, x) => a + x.capacity_mw, 0)
  return {
    count: dcs.length,
    totalGW: totalMW / 1000,
    operationalGW: mwBy('operational') / 1000,
    underConstructionGW: mwBy('under_construction') / 1000,
    futureGW: (mwBy('announced') + mwBy('planned')) / 1000,
    totalCapexB: dcs.reduce((a, d) => a + (d.investment_usd_b ?? 0), 0),
    impliedUnits: dcs.reduce((a, d) => a + impliedUnits(d), 0),
    impliedSiliconB: dcs.reduce((a, d) => a + impliedSiliconB(d), 0),
    nuclearGW: nuclearMW / 1000,
    gasGW: gasMW / 1000,
    trackedSupplyGW: trackedMW / 1000,
  }
}

// ---- Group-bys ----------------------------------------------------------

const STATUSES: Status[] = ['operational', 'under_construction', 'announced', 'planned']

export interface OperatorStatusRow {
  group: OperatorGroup
  operational: number
  under_construction: number
  announced: number
  planned: number
  total: number
}

export function gwByOperatorStatus(dcs: EnrichedDataCenter[]): OperatorStatusRow[] {
  const rows = OPERATOR_GROUPS.map((g) => {
    const row: OperatorStatusRow = {
      group: g,
      operational: 0,
      under_construction: 0,
      announced: 0,
      planned: 0,
      total: 0,
    }
    dcs
      .filter((d) => d.group === g)
      .forEach((d) => {
        row[d.status] += d.capacity.mw_it_full / 1000
        row.total += d.capacity.mw_it_full / 1000
      })
    return row
  })
  return rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total)
}

export interface CapexRow {
  group: OperatorGroup
  operational: number
  under_construction: number
  announced: number
  planned: number
  total: number
}

export function capexByOperatorStatus(dcs: EnrichedDataCenter[]): CapexRow[] {
  const rows = OPERATOR_GROUPS.map((g) => {
    const row: CapexRow = {
      group: g,
      operational: 0,
      under_construction: 0,
      announced: 0,
      planned: 0,
      total: 0,
    }
    dcs
      .filter((d) => d.group === g)
      .forEach((d) => {
        const v = d.investment_usd_b ?? 0
        row[d.status] += v
        row.total += v
      })
    return row
  })
  return rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total)
}

export interface IsoGapRow {
  iso: Iso
  demandGW: number
  supplyGW: number
  gapGW: number
}

export function powerGapByISO(dcs: EnrichedDataCenter[], assets: PowerAsset[]): IsoGapRow[] {
  const demand = new Map<Iso, number>()
  const supply = new Map<Iso, number>()
  dcs.forEach((d) =>
    demand.set(d.grid.iso, (demand.get(d.grid.iso) ?? 0) + d.capacity.mw_it_full / 1000),
  )
  assets.forEach((a) => supply.set(a.iso, (supply.get(a.iso) ?? 0) + a.capacity_mw / 1000))
  const isos = new Set<Iso>([...demand.keys(), ...supply.keys()])
  return Array.from(isos)
    .map((iso) => {
      const demandGW = demand.get(iso) ?? 0
      const supplyGW = supply.get(iso) ?? 0
      return { iso, demandGW, supplyGW, gapGW: demandGW - supplyGW }
    })
    .sort((a, b) => b.demandGW - a.demandGW)
}

export function fuelMix(dcs: EnrichedDataCenter[]): { fuel: PrimaryFuel; gw: number }[] {
  const m = new Map<PrimaryFuel, number>()
  dcs.forEach((d) =>
    m.set(d.power.primary_fuel, (m.get(d.power.primary_fuel) ?? 0) + d.capacity.mw_it_full / 1000),
  )
  return Array.from(m.entries())
    .map(([fuel, gw]) => ({ fuel, gw }))
    .sort((a, b) => b.gw - a.gw)
}

export function unitsByVendor(dcs: EnrichedDataCenter[]): { vendor: AccelVendor; units: number }[] {
  const m = new Map<AccelVendor, number>()
  dcs.forEach((d) =>
    m.set(d.silicon.primary_vendor, (m.get(d.silicon.primary_vendor) ?? 0) + impliedUnits(d)),
  )
  return Array.from(m.entries())
    .map(([vendor, units]) => ({ vendor, units }))
    .sort((a, b) => b.units - a.units)
}

/**
 * Bucket a campus into an accelerator family/generation. Accelerators are NOT
 * fungible: 1 Google TPU or 1 AWS Trainium is a different unit than 1 Nvidia
 * GPU, and GPU generations (Hopper -> Blackwell -> Rubin) differ in throughput
 * and price. This lets the Silicon lens show the mix rather than one blended count.
 */
export function chipFamily(d: EnrichedDataCenter): string {
  const c = (d.silicon.chip ?? '').toLowerCase()
  const v = d.silicon.primary_vendor
  if (v === 'Google' || c.includes('tpu')) return 'Google TPU'
  if (v === 'Amazon' || c.includes('trainium')) return 'AWS Trainium'
  if (v === 'AMD' || c.includes('instinct') || c.includes('mi3')) return 'AMD Instinct (MI)'
  if (c.includes('rubin') || c.includes('vera') || /\bvr\b/.test(c)) return 'Nvidia Rubin (VR)'
  if (c.includes('h100') || c.includes('h200') || c.includes('hopper')) return 'Nvidia Hopper (H100/200)'
  if (c.includes('gb200') || c.includes('gb300') || c.includes('blackwell') || c.includes('b200'))
    return 'Nvidia Blackwell (GB200/300)'
  if (v === 'Nvidia') return 'Nvidia (unspecified)'
  return 'Mixed / unspecified'
}

export function unitsByChipFamily(dcs: EnrichedDataCenter[]): { family: string; units: number }[] {
  const m = new Map<string, number>()
  dcs.forEach((d) => m.set(chipFamily(d), (m.get(chipFamily(d)) ?? 0) + impliedUnits(d)))
  return Array.from(m.entries())
    .map(([family, units]) => ({ family, units }))
    .sort((a, b) => b.units - a.units)
}

export function siliconByOperator(
  dcs: EnrichedDataCenter[],
): { group: OperatorGroup; siliconB: number }[] {
  const m = new Map<OperatorGroup, number>()
  dcs.forEach((d) => m.set(d.group, (m.get(d.group) ?? 0) + impliedSiliconB(d)))
  return Array.from(m.entries())
    .map(([group, siliconB]) => ({ group, siliconB }))
    .sort((a, b) => b.siliconB - a.siliconB)
}

export const TIMELINE_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

export interface TimelineRow {
  year: number
  onlineGW: number // cumulative GW that has reached first-power by this year
  pipelineGW: number // cumulative GW with full-buildout target by this year
}

export function cumulativeGWByYear(dcs: EnrichedDataCenter[]): TimelineRow[] {
  return TIMELINE_YEARS.map((year) => {
    let onlineGW = 0
    let pipelineGW = 0
    dcs.forEach((d) => {
      const first = d.timeline.first_power_year ?? d.timeline.full_buildout_year
      const full = d.timeline.full_buildout_year ?? d.timeline.first_power_year
      if (first != null && first <= year) onlineGW += d.capacity.mw_it_full / 1000
      if (full != null && full <= year) pipelineGW += d.capacity.mw_it_full / 1000
    })
    return { year, onlineGW, pipelineGW }
  })
}
