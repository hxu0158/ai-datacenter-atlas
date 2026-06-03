import { z } from 'zod'

/**
 * Schema for the AI Data Center & Energy Atlas.
 *
 * Two record types:
 *   - DataCenter  (compute DEMAND)  -> src/data/datacenters.json
 *   - PowerAsset  (energy SUPPLY)   -> src/data/power-assets.json
 *
 * Units are explicit in field names: `mw` = megawatts, `_usd_b` = US$ billions.
 * Every record carries `sources[]` (citation URLs) and a `confidence` flag so the
 * dashboard can be honest about what is reported vs. estimated.
 *
 * This file is the single source of truth for shape. `scripts/validate-data.mjs`
 * and the in-app loader both parse against it.
 */

// ---- Enums --------------------------------------------------------------

export const STATUS = ['operational', 'under_construction', 'announced', 'planned'] as const
export const statusSchema = z.enum(STATUS)
export type Status = (typeof STATUS)[number]

/** Grid region / market the load or asset sits in. Used for the power-gap view. */
export const ISO = [
  'ERCOT',
  'PJM',
  'MISO',
  'SPP',
  'CAISO',
  'SERC',
  'WECC',
  'ISO-NE',
  'NYISO',
  'TVA',
  'Other',
] as const
export const isoSchema = z.enum(ISO)
export type Iso = (typeof ISO)[number]

/** How a campus is primarily powered (drives the fuel-mix view). */
export const PRIMARY_FUEL = [
  'natural_gas',
  'nuclear',
  'grid_mixed',
  'solar_storage',
  'wind',
  'mixed',
] as const
export const primaryFuelSchema = z.enum(PRIMARY_FUEL)
export type PrimaryFuel = (typeof PRIMARY_FUEL)[number]

export const POWER_SOURCE_TYPE = [
  'grid',
  'onsite_gas',
  'nuclear_existing',
  'nuclear_restart',
  'nuclear_smr',
  'solar',
  'wind',
  'storage',
  'fuel_cell',
  'hydro',
  'geothermal',
] as const
export const powerSourceTypeSchema = z.enum(POWER_SOURCE_TYPE)
export type PowerSourceType = (typeof POWER_SOURCE_TYPE)[number]

/** Whose silicon dominates the campus (drives the vendor-exposure view). */
export const ACCEL_VENDOR = [
  'Nvidia',
  'AMD',
  'Broadcom',
  'Marvell',
  'Amazon',
  'Google',
  'Mixed',
  'Unknown',
] as const
export const accelVendorSchema = z.enum(ACCEL_VENDOR)
export type AccelVendor = (typeof ACCEL_VENDOR)[number]

export const confidenceSchema = z.enum(['high', 'medium', 'low'])
export type Confidence = z.infer<typeof confidenceSchema>

export const coolingSchema = z.enum(['liquid', 'air', 'hybrid', 'unknown'])

export const POWER_ASSET_TYPE = [
  'nuclear_restart',
  'nuclear_smr',
  'nuclear_uprate',
  'nuclear_existing',
  'gas_plant',
  'solar_storage',
  'wind',
  'fuel_cell',
  'geothermal',
  'hydro',
] as const
export const powerAssetTypeSchema = z.enum(POWER_ASSET_TYPE)
export type PowerAssetType = (typeof POWER_ASSET_TYPE)[number]

// ---- Sub-objects --------------------------------------------------------

const locationSchema = z.object({
  city: z.string(),
  county: z.string().optional(),
  state: z.string(), // 2-letter
  lat: z.number(),
  lng: z.number(),
})

const powerSourceSchema = z.object({
  type: powerSourceTypeSchema,
  mw: z.number().nonnegative().optional(),
  detail: z.string().optional(),
  status: statusSchema.optional(),
})

const ppaSchema = z.object({
  counterparty: z.string(),
  asset: z.string().optional(),
  mw: z.number().nonnegative().optional(),
  term_years: z.number().optional(),
  type: z.string().optional(), // e.g. "nuclear restart", "SMR", "gas BTM"
})

// ---- DataCenter (DEMAND) ------------------------------------------------

export const dataCenterSchema = z.object({
  id: z.string(),
  name: z.string(),
  operator: z.string(), // primary builder/owner brand, e.g. "OpenAI / Oracle (Stargate)"
  tenants: z.array(z.string()).default([]),
  developer: z.string().optional(),
  partners: z.array(z.string()).default([]),
  location: locationSchema,
  grid: z.object({
    iso: isoSchema,
    utility: z.string().optional(),
  }),
  status: statusSchema,
  capacity: z.object({
    mw_it_full: z.number().nonnegative(), // IT/critical load at full build (the headline MW)
    mw_total_facility: z.number().nonnegative().optional(),
    accelerator_type: z.string().optional(), // e.g. "Nvidia GB200 NVL72"
    gpu_estimate: z.number().nonnegative().optional(), // implied accelerator UNITS at full build
  }),
  timeline: z.object({
    announced: z.string().optional(), // free-form, e.g. "2024", "2025-09"
    first_power_year: z.number().optional(),
    full_buildout_year: z.number().optional(),
  }),
  investment_usd_b: z.number().nonnegative().optional(),
  power: z.object({
    primary_fuel: primaryFuelSchema,
    behind_the_meter: z.boolean().optional(),
    sources: z.array(powerSourceSchema).default([]),
    ppas: z.array(ppaSchema).default([]),
  }),
  silicon: z.object({
    primary_vendor: accelVendorSchema,
    chip: z.string().optional(),
    est_units: z.number().nonnegative().optional(), // est accelerators at full build
    est_silicon_usd_b: z.number().nonnegative().optional(), // implied $ of accelerators
  }),
  cooling: coolingSchema.optional(),
  sources: z.array(z.string()).default([]),
  confidence: confidenceSchema,
  notes: z.string().optional(),
})
export type DataCenter = z.infer<typeof dataCenterSchema>

// ---- PowerAsset (SUPPLY) ------------------------------------------------

export const powerAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: powerAssetTypeSchema,
  owner: z.string(),
  offtaker: z.string().optional(), // hyperscaler buying the power
  location: locationSchema,
  iso: isoSchema,
  capacity_mw: z.number().nonnegative(),
  status: statusSchema,
  online_year: z.number().optional(),
  linked_campus_ids: z.array(z.string()).default([]),
  ppa: z
    .object({
      term_years: z.number().optional(),
      type: z.string().optional(),
    })
    .optional(),
  investment_usd_b: z.number().nonnegative().optional(),
  sources: z.array(z.string()).default([]),
  confidence: confidenceSchema,
  notes: z.string().optional(),
})
export type PowerAsset = z.infer<typeof powerAssetSchema>

// ---- Meta ---------------------------------------------------------------

export const metaSchema = z.object({
  version: z.string(),
  as_of: z.string(),
  disclaimer: z.string(),
  methodology: z.array(z.string()),
  sources: z.array(z.object({ name: z.string(), url: z.string() })),
})
export type AtlasMeta = z.infer<typeof metaSchema>

export const datasetSchema = z.object({
  datacenters: z.array(dataCenterSchema),
  power_assets: z.array(powerAssetSchema),
  meta: metaSchema,
})
