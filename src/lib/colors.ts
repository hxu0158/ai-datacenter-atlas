// Central color palettes so the map, charts, and legends stay in sync.

import type { Status, PrimaryFuel, AccelVendor, Iso, PowerAssetType } from '../types'

export const STATUS_COLOR: Record<Status, string> = {
  operational: '#34d399', // green
  under_construction: '#fbbf24', // amber
  announced: '#60a5fa', // blue
  planned: '#a78bfa', // purple
}

export const FUEL_COLOR: Record<PrimaryFuel, string> = {
  natural_gas: '#fb923c', // orange
  nuclear: '#a3e635', // lime (clean baseload)
  grid_mixed: '#94a3b8', // slate
  solar_storage: '#fde047', // yellow
  wind: '#38bdf8', // sky
  mixed: '#c084fc', // violet
}

export const VENDOR_COLOR: Record<AccelVendor, string> = {
  Nvidia: '#76b900',
  AMD: '#ed1c24',
  Broadcom: '#cc092f',
  Marvell: '#00a3e0',
  Amazon: '#ff9900',
  Google: '#4285f4',
  Mixed: '#a78bfa',
  Unknown: '#64748b',
}

/** Operator groups (derived in data.ts). */
export const OPERATOR_COLOR: Record<string, string> = {
  'OpenAI / Stargate': '#10b981',
  Meta: '#0866ff',
  Microsoft: '#7fba00',
  Amazon: '#ff9900',
  Google: '#ea4335',
  xAI: '#e5e7eb',
  Anthropic: '#d4a27f',
  'Neocloud / Other': '#a78bfa',
}

export const ISO_COLOR: Record<Iso, string> = {
  ERCOT: '#f87171',
  PJM: '#60a5fa',
  MISO: '#34d399',
  SPP: '#fbbf24',
  CAISO: '#f472b6',
  SERC: '#c084fc',
  WECC: '#38bdf8',
  'ISO-NE': '#fb923c',
  NYISO: '#a3e635',
  TVA: '#2dd4bf',
  Other: '#94a3b8',
}

export const ASSET_TYPE_COLOR: Record<PowerAssetType, string> = {
  nuclear_restart: '#bef264',
  nuclear_smr: '#a3e635',
  nuclear_uprate: '#84cc16',
  nuclear_existing: '#65a30d',
  gas_plant: '#fb923c',
  solar_storage: '#fde047',
  wind: '#38bdf8',
  fuel_cell: '#f472b6',
  geothermal: '#fb7185',
  hydro: '#22d3ee',
}

export function operatorColor(group: string): string {
  return OPERATOR_COLOR[group] ?? '#a78bfa'
}
