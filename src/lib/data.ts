// Loads, validates, and enriches the static dataset.

import dcRaw from '../data/datacenters.json'
import paRaw from '../data/power-assets.json'
import metaRaw from '../data/meta.json'
import {
  dataCenterSchema,
  powerAssetSchema,
  metaSchema,
  type DataCenter,
  type PowerAsset,
  type AtlasMeta,
} from '../types'
import { z } from 'zod'

export const OPERATOR_GROUPS = [
  'OpenAI / Stargate',
  'Meta',
  'Microsoft',
  'Amazon',
  'Google',
  'xAI',
  'Anthropic',
  'Neocloud / Other',
] as const
export type OperatorGroup = (typeof OPERATOR_GROUPS)[number]

export function operatorGroupOf(operator: string): OperatorGroup {
  const o = operator.toLowerCase()
  if (o.includes('stargate') || o.includes('openai')) return 'OpenAI / Stargate'
  if (o.includes('meta')) return 'Meta'
  if (o.includes('microsoft')) return 'Microsoft'
  if (o.includes('amazon') || o.includes('aws')) return 'Amazon'
  if (o.includes('google')) return 'Google'
  if (o.includes('xai')) return 'xAI'
  if (o.includes('anthropic')) return 'Anthropic'
  return 'Neocloud / Other'
}

export type EnrichedDataCenter = DataCenter & { group: OperatorGroup }

function parseArray<S extends z.ZodTypeAny>(schema: S, raw: unknown[], label: string): z.infer<S>[] {
  const out: z.infer<S>[] = []
  raw.forEach((r, i) => {
    const res = schema.safeParse(r)
    if (res.success) {
      out.push(res.data)
    } else {
      // Don't crash the dashboard on a single bad record — warn and skip.
      // eslint-disable-next-line no-console
      console.warn(`[atlas] ${label}[${i}] failed validation:`, res.error.issues)
    }
  })
  return out
}

export const datacenters: EnrichedDataCenter[] = parseArray(
  dataCenterSchema,
  dcRaw as unknown[],
  'datacenter',
).map((d) => ({ ...d, group: operatorGroupOf(d.operator) }))

export const powerAssets: PowerAsset[] = parseArray(
  powerAssetSchema,
  paRaw as unknown[],
  'power-asset',
)

export const meta: AtlasMeta = metaSchema.parse(metaRaw)

// Distinct facet values present in the data (for filter rails).
export const ALL_STATES = Array.from(new Set(datacenters.map((d) => d.location.state))).sort()
export const ALL_ISOS = Array.from(new Set(datacenters.map((d) => d.grid.iso))).sort()
export const ALL_FUELS = Array.from(new Set(datacenters.map((d) => d.power.primary_fuel))).sort()
export const ALL_VENDORS = Array.from(
  new Set(datacenters.map((d) => d.silicon.primary_vendor)),
).sort()
