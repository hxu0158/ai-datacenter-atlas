#!/usr/bin/env node
// Validates the Atlas dataset: schema/enum checks, numeric sanity, unique IDs,
// and cross-file referential integrity. Plain Node (no build step) so it runs
// from `npm run validate` and from the refresh script.
//
// Usage: node scripts/validate-data.mjs   (exit 1 on errors)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'src', 'data')

// ---- enums (mirror of src/types.ts) ----
const STATUS = ['operational', 'under_construction', 'announced', 'planned']
const ISO = ['ERCOT', 'PJM', 'MISO', 'SPP', 'CAISO', 'SERC', 'WECC', 'ISO-NE', 'NYISO', 'TVA', 'Other']
const PRIMARY_FUEL = ['natural_gas', 'nuclear', 'grid_mixed', 'solar_storage', 'wind', 'mixed']
const POWER_SOURCE_TYPE = ['grid', 'onsite_gas', 'nuclear_existing', 'nuclear_restart', 'nuclear_smr', 'solar', 'wind', 'storage', 'fuel_cell', 'hydro', 'geothermal']
const ACCEL_VENDOR = ['Nvidia', 'AMD', 'Broadcom', 'Marvell', 'Amazon', 'Google', 'Mixed', 'Unknown']
const CONFIDENCE = ['high', 'medium', 'low']
const COOLING = ['liquid', 'air', 'hybrid', 'unknown']
const ASSET_TYPE = ['nuclear_restart', 'nuclear_smr', 'nuclear_uprate', 'nuclear_existing', 'gas_plant', 'solar_storage', 'wind', 'fuel_cell', 'geothermal', 'hydro']

export function validateDataset(datacenters, powerAssets, meta) {
  const errors = []
  const warnings = []
  const err = (id, msg) => errors.push(`${id}: ${msg}`)
  const warn = (id, msg) => warnings.push(`${id}: ${msg}`)
  const inEnum = (v, e) => e.includes(v)
  const usLat = (n) => n >= 17 && n <= 72
  const usLng = (n) => n >= -180 && n <= -64

  // datacenters
  const ids = new Set()
  for (const d of datacenters) {
    const id = d.id ?? '(missing id)'
    if (!d.id) err(id, 'missing id')
    if (ids.has(d.id)) err(id, 'duplicate id')
    ids.add(d.id)
    if (!d.name) err(id, 'missing name')
    if (!d.operator) err(id, 'missing operator')
    if (!d.location || typeof d.location.lat !== 'number' || typeof d.location.lng !== 'number')
      err(id, 'missing location lat/lng')
    else {
      if (!usLat(d.location.lat) || !usLng(d.location.lng)) warn(id, `coordinates look off (${d.location.lat}, ${d.location.lng})`)
    }
    if (!d.location?.state) err(id, 'missing state')
    if (!inEnum(d.status, STATUS)) err(id, `bad status "${d.status}"`)
    if (!d.grid || !inEnum(d.grid.iso, ISO)) err(id, `bad/missing grid.iso "${d.grid?.iso}"`)
    if (!d.capacity || typeof d.capacity.mw_it_full !== 'number') err(id, 'missing capacity.mw_it_full')
    else if (d.capacity.mw_it_full <= 0) warn(id, 'mw_it_full <= 0')
    if (!d.power || !inEnum(d.power.primary_fuel, PRIMARY_FUEL)) err(id, `bad power.primary_fuel "${d.power?.primary_fuel}"`)
    for (const s of d.power?.sources ?? []) {
      if (!inEnum(s.type, POWER_SOURCE_TYPE)) err(id, `bad power source type "${s.type}"`)
    }
    if (!d.silicon || !inEnum(d.silicon.primary_vendor, ACCEL_VENDOR)) err(id, `bad silicon.primary_vendor "${d.silicon?.primary_vendor}"`)
    if (d.cooling && !inEnum(d.cooling, COOLING)) err(id, `bad cooling "${d.cooling}"`)
    if (!inEnum(d.confidence, CONFIDENCE)) err(id, `bad confidence "${d.confidence}"`)
    if (!Array.isArray(d.sources) || d.sources.length === 0) warn(id, 'no sources cited')
  }

  // power assets
  const assetIds = new Set()
  for (const a of powerAssets) {
    const id = a.id ?? '(missing id)'
    if (!a.id) err(id, 'missing id')
    if (assetIds.has(a.id)) err(id, 'duplicate asset id')
    assetIds.add(a.id)
    if (!inEnum(a.type, ASSET_TYPE)) err(id, `bad asset type "${a.type}"`)
    if (!inEnum(a.status, STATUS)) err(id, `bad status "${a.status}"`)
    if (!inEnum(a.iso, ISO)) err(id, `bad iso "${a.iso}"`)
    if (typeof a.capacity_mw !== 'number' || a.capacity_mw <= 0) err(id, 'missing/invalid capacity_mw')
    if (!a.location || typeof a.location.lat !== 'number') err(id, 'missing location')
    if (!inEnum(a.confidence, CONFIDENCE)) err(id, `bad confidence "${a.confidence}"`)
    for (const cid of a.linked_campus_ids ?? []) {
      if (!ids.has(cid)) err(id, `linked_campus_ids -> unknown campus "${cid}"`)
    }
  }

  // meta
  if (!meta?.version) err('meta', 'missing version')
  if (!meta?.as_of) err('meta', 'missing as_of')

  return { errors, warnings }
}

function summary(datacenters, powerAssets) {
  const gw = datacenters.reduce((a, d) => a + (d.capacity?.mw_it_full ?? 0), 0) / 1000
  const byStatus = {}
  for (const d of datacenters) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1
  const supplyGW = powerAssets.reduce((a, x) => a + (x.capacity_mw ?? 0), 0) / 1000
  return { campuses: datacenters.length, totalGW: gw.toFixed(1), byStatus, assets: powerAssets.length, supplyGW: supplyGW.toFixed(1) }
}

export function validateModels(models) {
  const errors = []
  const warnings = []
  const CONF = ['high', 'medium', 'low']
  const NUM = ['arena_elo', 'arena_rank', 'intelligence_index', 'gpqa', 'aime', 'swe_bench', 'mmlu_pro', 'hle', 'price_in', 'price_out', 'context_k', 'params_b', 'speed_tok_s']
  const ids = new Set()
  for (const m of models) {
    const id = m.id ?? '(missing id)'
    if (!m.id) errors.push(`model ${id}: missing id`)
    if (ids.has(m.id)) errors.push(`model ${id}: duplicate id`)
    ids.add(m.id)
    if (!m.name) errors.push(`model ${id}: missing name`)
    if (!m.lab) errors.push(`model ${id}: missing lab`)
    if (typeof m.open_weights !== 'boolean') errors.push(`model ${id}: open_weights must be boolean`)
    if (!CONF.includes(m.confidence)) errors.push(`model ${id}: bad confidence "${m.confidence}"`)
    if (!m.released || !/^\d{4}-\d{2}$/.test(m.released)) warnings.push(`model ${id}: released should be YYYY-MM (got "${m.released}")`)
    for (const k of NUM) {
      if (m[k] != null && typeof m[k] !== 'number') errors.push(`model ${id}: ${k} must be a number or null`)
    }
    if (!Array.isArray(m.sources) || m.sources.length === 0) warnings.push(`model ${id}: no sources cited`)
  }
  return { errors, warnings }
}

// CLI entry
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const load = (f) => JSON.parse(readFileSync(join(DATA, f), 'utf8'))
  let dc, pa, meta, mdl
  try {
    dc = load('datacenters.json')
    pa = load('power-assets.json')
    meta = load('meta.json')
    mdl = load('models.json')
  } catch (e) {
    console.error('✗ Failed to read/parse data files:', e.message)
    process.exit(1)
  }
  const dcRes = validateDataset(dc, pa, meta)
  const mRes = validateModels(mdl)
  const errors = [...dcRes.errors, ...mRes.errors]
  const warnings = [...dcRes.warnings, ...mRes.warnings]
  const s = summary(dc, pa)
  const openCount = mdl.filter((m) => m.open_weights).length
  console.log('— AI Data Center & Energy Atlas — dataset check —')
  console.log(`  ${s.campuses} campuses · ${s.totalGW} GW IT load · ${s.assets} power assets · ${s.supplyGW} GW supply`)
  console.log(`  ${mdl.length} models (${openCount} open / ${mdl.length - openCount} closed)`)
  console.log(`  status: ${JSON.stringify(s.byStatus)}`)
  if (warnings.length) {
    console.log(`\n  ${warnings.length} warning(s):`)
    warnings.forEach((w) => console.log(`    ⚠ ${w}`))
  }
  if (errors.length) {
    console.log(`\n  ${errors.length} ERROR(s):`)
    errors.forEach((e) => console.log(`    ✗ ${e}`))
    console.log('\n✗ Validation failed.')
    process.exit(1)
  }
  console.log('\n✓ Validation passed.')
}
