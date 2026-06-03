// Number / unit formatting helpers — analyst-grade, tabular-friendly.

export function fmtGW(mw: number, digits = 1): string {
  return `${(mw / 1000).toFixed(digits)} GW`
}

export function fmtMW(mw: number): string {
  if (mw >= 1000) return fmtGW(mw, 2)
  return `${Math.round(mw)} MW`
}

/** Power, choosing GW vs MW automatically. */
export function fmtPower(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(mw >= 10000 ? 0 : 1)} GW`
  return `${Math.round(mw)} MW`
}

export function fmtUSD(billions: number | undefined): string {
  if (billions == null) return '—'
  if (billions >= 1000) return `$${(billions / 1000).toFixed(1)}T`
  if (billions >= 1) return `$${billions.toFixed(billions >= 10 ? 0 : 1)}B`
  return `$${Math.round(billions * 1000)}M`
}

export function fmtInt(n: number | undefined): string {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('en-US')
}

/** 600000 -> "600k", 1100000 -> "1.1M" */
export function fmtUnits(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}k`
  return `${Math.round(n)}`
}

export function titleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const STATUS_LABEL: Record<string, string> = {
  operational: 'Operational',
  under_construction: 'Under construction',
  announced: 'Announced',
  planned: 'Planned',
}

export const FUEL_LABEL: Record<string, string> = {
  natural_gas: 'Natural gas',
  nuclear: 'Nuclear',
  grid_mixed: 'Grid (mixed)',
  solar_storage: 'Solar + storage',
  wind: 'Wind',
  mixed: 'Mixed',
}
