// Derivation engine: for any KPI or chart metric, reconstruct exactly how the
// number was produced — the formula, the constants, the per-record build-up
// (the "A × B + …"), and the union of sources. Powers the DerivationModal.

import type { EnrichedDataCenter } from './data'
import type { PowerAsset, Confidence } from '../types'
import {
  impliedUnits,
  impliedSiliconB,
  VENDOR_ASP,
  KW_PER_ACCEL,
  powerGapByISO,
  chipFamily,
  annualTWh,
  US_GRID_TWH,
  DEFAULT_LOAD_FACTOR,
  DEFAULT_PUE,
} from './aggregate'
import { fmtUSD, fmtUnits, FUEL_LABEL } from './format'

export interface Contribution {
  id: string
  kind: 'dc' | 'asset' | 'group'
  name: string
  input: string // the raw input shown (e.g. "5,000 MW")
  math?: string // how it maps to the contribution (e.g. "× 1000 ÷ 2.0 kW")
  value: number // numeric contribution to the total (in the metric's unit)
  display: string // formatted contribution
  sources: string[]
  confidence: Confidence
}

export interface Derivation {
  title: string
  total: string
  formula: string
  assumptions: string[]
  colInput: string
  colValue: string
  contributions: Contribution[]
  sources: string[]
  confidenceMix: { high: number; medium: number; low: number }
  note?: string
}

const NUCLEAR = ['nuclear_restart', 'nuclear_smr', 'nuclear_uprate', 'nuclear_existing']
const mwStr = (mw: number) => `${Math.round(mw).toLocaleString('en-US')} MW`

function finalize(d: Omit<Derivation, 'sources' | 'confidenceMix'>): Derivation {
  const contributions = [...d.contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  const sources = Array.from(new Set(contributions.flatMap((c) => c.sources))).filter(Boolean)
  const mix = { high: 0, medium: 0, low: 0 }
  contributions.forEach((c) => (mix[c.confidence] += 1))
  return { ...d, contributions, sources, confidenceMix: mix }
}

function gwDerivation(
  dcs: EnrichedDataCenter[],
  title: string,
  formula: string,
  note?: string,
): Derivation {
  const contributions: Contribution[] = dcs.map((d) => ({
    id: d.id,
    kind: 'dc',
    name: d.name,
    input: mwStr(d.capacity.mw_it_full),
    math: '÷ 1000',
    value: d.capacity.mw_it_full / 1000,
    display: `${(d.capacity.mw_it_full / 1000).toFixed(2)} GW`,
    sources: d.sources,
    confidence: d.confidence,
  }))
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title,
    total: `${total.toFixed(1)} GW`,
    formula,
    assumptions: ['IT load = critical/IT power at full build (megawatts). Many campuses do not disclose exact MW, so values are order-of-magnitude estimates.'],
    colInput: 'IT load',
    colValue: 'GW',
    contributions,
    note,
  })
}

function capexDerivation(dcs: EnrichedDataCenter[], title: string, formula: string): Derivation {
  const contributions: Contribution[] = dcs
    .filter((d) => d.investment_usd_b != null)
    .map((d) => ({
      id: d.id,
      kind: 'dc',
      name: d.name,
      input: d.status.replace(/_/g, ' '),
      math: 'disclosed / est.',
      value: d.investment_usd_b as number,
      display: fmtUSD(d.investment_usd_b),
      sources: d.sources,
      confidence: d.confidence,
    }))
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title,
    total: fmtUSD(total),
    formula,
    assumptions: ['Site-level capex from company announcements / filings where disclosed; otherwise an analyst estimate. Campuses with no figure are excluded from the sum.'],
    colInput: 'Status',
    colValue: 'Capex',
    contributions,
  })
}

function accelDerivation(dcs: EnrichedDataCenter[], title = 'Implied accelerators'): Derivation {
  const contributions: Contribution[] = dcs.map((d) => {
    const reported = d.silicon.est_units ?? d.capacity.gpu_estimate
    const u = impliedUnits(d)
    const math =
      reported != null
        ? `reported (${fmtUnits(reported)})`
        : `${mwStr(d.capacity.mw_it_full)} × 1000 ÷ ${KW_PER_ACCEL} kW`
    return {
      id: d.id,
      kind: 'dc' as const,
      name: d.name,
      input: d.silicon.chip ?? d.silicon.primary_vendor,
      math,
      value: u,
      display: fmtUnits(u),
      sources: d.sources,
      confidence: d.confidence,
    }
  })
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title,
    total: fmtUnits(total),
    formula: 'Σ accelerators,  where accelerators = reported count,  else  IT MW × 1000 ÷ 2.0 kW',
    assumptions: [
      'HETEROGENEOUS UNITS: this sums different accelerator TYPES — Nvidia GPUs (Blackwell GB200/GB300, Hopper H100/H200), Google TPUs, and AWS Trainium. One TPU or Trainium is NOT equivalent to one GPU in throughput or price; treat this as a raw unit tally for scale, not a perf- or dollar-equivalent figure. The "Accelerator" column shows each campus\'s chip; the Silicon lens breaks the total down by vendor and chip family.',
      `~${KW_PER_ACCEL} kW of IT load per accelerator, all-in (system-level, incl. CPU / networking / cooling share). Calibrated so AWS Rainier (~2.2 GW ⇒ ~1.1M Trainium2) and xAI Colossus (~0.5 GW ⇒ ~230k GPUs) reconcile. TPUs/Trainium actually draw less per chip, so their counts here are conservative (low).`,
      'Reported chip counts are used directly where a company has disclosed them (e.g. Stargate Abilene ~450k GB200, Rainier ~500k Trainium2).',
    ],
    colInput: 'Accelerator',
    colValue: 'Units',
    contributions,
  })
}

function siliconDerivation(dcs: EnrichedDataCenter[], title = 'Implied silicon $'): Derivation {
  const contributions: Contribution[] = dcs.map((d) => {
    const u = impliedUnits(d)
    const asp = VENDOR_ASP[d.silicon.primary_vendor]
    const sb = impliedSiliconB(d)
    const reported = d.silicon.est_silicon_usd_b != null
    const math = reported ? 'reported' : `${fmtUnits(u)} × $${Math.round(asp / 1000)}k ASP`
    return {
      id: d.id,
      kind: 'dc' as const,
      name: d.name,
      input: d.silicon.primary_vendor,
      math,
      value: sb,
      display: fmtUSD(sb),
      sources: d.sources,
      confidence: d.confidence,
    }
  })
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title,
    total: fmtUSD(total),
    formula: 'Σ ( implied accelerators × blended ASP by vendor )',
    assumptions: [
      'Blended ASP per accelerator: Nvidia $45k · AMD $35k · Broadcom/Marvell $22k · Google TPU $20k · AWS Trainium $18k · Mixed/Unknown $35k (rack-level, incl. networking).',
      'Directional silicon TAM, not bookings or revenue.',
    ],
    colInput: 'Vendor',
    colValue: '$',
    contributions,
  })
}

function assetDerivation(assets: PowerAsset[], title: string, formula: string): Derivation {
  const contributions: Contribution[] = assets.map((a) => ({
    id: a.id,
    kind: 'asset',
    name: a.name,
    input: `${a.type.replace(/_/g, ' ')}${a.offtaker ? ` · ${a.offtaker}` : ''}`,
    math: '÷ 1000',
    value: a.capacity_mw / 1000,
    display: `${(a.capacity_mw / 1000).toFixed(2)} GW`,
    sources: a.sources,
    confidence: a.confidence,
  }))
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title,
    total: `${total.toFixed(1)} GW`,
    formula,
    assumptions: ['"Tracked / dedicated supply" = generation in this dataset contracted or built to serve AI load (nuclear PPAs/restarts/SMRs, on-site gas, geothermal, solar+storage). Not the full grid.'],
    colInput: 'Type',
    colValue: 'GW',
    contributions,
  })
}

function gapDerivation(dcs: EnrichedDataCenter[], assets: PowerAsset[]): Derivation {
  const rows = powerGapByISO(dcs, assets)
  const contributions: Contribution[] = rows.map((r) => ({
    id: `iso-${r.iso}`,
    kind: 'group',
    name: r.iso,
    input: `${r.demandGW.toFixed(1)} GW demand`,
    math: `− ${r.supplyGW.toFixed(1)} GW supply`,
    value: r.gapGW,
    display: `${r.gapGW > 0 ? '+' : ''}${r.gapGW.toFixed(1)} GW`,
    sources: [],
    confidence: 'medium',
  }))
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title: 'Demand − tracked supply',
    total: `${total > 0 ? '+' : ''}${total.toFixed(1)} GW`,
    formula: 'Σ campus IT load  −  Σ tracked dedicated supply,  by grid region (ISO)',
    assumptions: [
      'A positive gap = reliance on existing grid headroom, merchant power, or not-yet-contracted generation — it is the financeability/throughput question, not necessarily a physical shortfall.',
      'Supply counts only AI-linked assets in this dataset, so the gap overstates the true shortfall where campuses also draw ordinary grid power.',
    ],
    colInput: 'Demand',
    colValue: 'Net gap',
    contributions,
    note: 'Grid regions where compute demand most exceeds tracked dedicated supply rise to the top.',
  })
}

function energyDerivation(
  dcs: EnrichedDataCenter[],
  lf: number,
  pue: number,
  title = 'Implied annual energy',
): Derivation {
  const contributions: Contribution[] = dcs.map((d) => {
    const twh = annualTWh(d.capacity.mw_it_full, lf, pue)
    return {
      id: d.id,
      kind: 'dc' as const,
      name: d.name,
      input: mwStr(d.capacity.mw_it_full),
      math: `× 8,760h × ${lf} LF × ${pue} PUE`,
      value: twh,
      display: `${twh.toFixed(1)} TWh`,
      sources: d.sources,
      confidence: d.confidence,
    }
  })
  const total = contributions.reduce((a, c) => a + c.value, 0)
  return finalize({
    title,
    total: `${total.toFixed(0)} TWh/yr`,
    formula: 'Σ ( IT MW × 8,760 h/yr × load factor × PUE ) ÷ 1e6',
    assumptions: [
      `Load factor ${(lf * 100).toFixed(0)}% (AI clusters run near-continuously) × PUE ${pue} (total-facility, incl. cooling). Both are tunable in the Power / energy lens.`,
      `Power (GW) sizes the build and the grid constraint; energy (TWh/yr) is what is actually consumed. ${total.toFixed(0)} TWh/yr ≈ ${((total / US_GRID_TWH) * 100).toFixed(0)}% of total US electricity (~${US_GRID_TWH.toLocaleString()} TWh/yr).`,
      'At full build — campuses still under construction / announced are counted at full capacity.',
    ],
    colInput: 'IT load',
    colValue: 'TWh/yr',
    contributions,
  })
}

export function buildDerivation(
  metric: string,
  arg: string | undefined,
  dcs: EnrichedDataCenter[],
  assets: PowerAsset[],
  opts: { loadFactor?: number; pue?: number } = {},
): Derivation {
  switch (metric) {
    case 'energyTWh': {
      const lf = opts.loadFactor ?? DEFAULT_LOAD_FACTOR
      const pue = opts.pue ?? DEFAULT_PUE
      const scoped = arg ? dcs.filter((d) => d.grid.iso === arg) : dcs
      return energyDerivation(scoped, lf, pue, arg ? `${arg} — implied annual energy` : 'Implied annual energy')
    }
    case 'totalGW':
      return gwDerivation(dcs, 'Tracked AI capacity', 'Σ campus IT load (MW) ÷ 1000')
    case 'operationalGW':
      return gwDerivation(dcs.filter((d) => d.status === 'operational'), 'Operational capacity', 'Σ IT load of operational campuses ÷ 1000')
    case 'underConstructionGW':
      return gwDerivation(dcs.filter((d) => d.status === 'under_construction'), 'Under-construction capacity', 'Σ IT load of under-construction campuses ÷ 1000')
    case 'futureGW':
      return gwDerivation(dcs.filter((d) => d.status === 'announced' || d.status === 'planned'), 'Announced / planned capacity', 'Σ IT load of announced + planned campuses ÷ 1000')
    case 'fuelGW':
      return gwDerivation(dcs.filter((d) => d.power.primary_fuel === arg), `${FUEL_LABEL[arg as keyof typeof FUEL_LABEL] ?? arg} — campus power mix`, `Σ IT load of campuses whose primary power = "${arg}" ÷ 1000`)
    case 'isoDemand':
      return gwDerivation(dcs.filter((d) => d.grid.iso === arg), `${arg} — compute demand`, `Σ IT load of campuses in ${arg} ÷ 1000`)
    case 'capex':
      return capexDerivation(dcs, 'Capex tracked', 'Σ disclosed / estimated site investment ($B)')
    case 'operatorCapex':
      return capexDerivation(dcs.filter((d) => d.group === arg), `${arg} — capex`, `Σ site investment for ${arg} ($B)`)
    case 'accelerators':
      return accelDerivation(dcs)
    case 'vendorUnits':
      return accelDerivation(dcs.filter((d) => d.silicon.primary_vendor === arg), `${arg} — implied accelerators`)
    case 'chipFamilyUnits':
      return accelDerivation(dcs.filter((d) => chipFamily(d) === arg), `${arg} — implied accelerators`)
    case 'silicon':
      return siliconDerivation(dcs)
    case 'operatorSilicon':
      return siliconDerivation(dcs.filter((d) => d.group === arg), `${arg} — implied silicon $`)
    case 'nuclear':
      return assetDerivation(assets.filter((a) => NUCLEAR.includes(a.type)), 'Nuclear contracted', 'Σ capacity of tracked nuclear supply assets (MW) ÷ 1000')
    case 'isoSupply':
      return assetDerivation(assets.filter((a) => a.iso === arg), `${arg} — tracked dedicated supply`, `Σ capacity of supply assets in ${arg} ÷ 1000`)
    case 'gap':
      return gapDerivation(dcs, assets)
    default:
      return gwDerivation(dcs, 'Tracked AI capacity', 'Σ campus IT load ÷ 1000')
  }
}
