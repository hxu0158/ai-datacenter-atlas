// Models dataset: frontier + key open-weights LLMs, their leaderboard standing
// (human votes), objective benchmarks, pricing, and lab. Snapshot, refreshable.

import { z } from 'zod'
import raw from '../data/models.json'

export const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  lab: z.string(),
  open_weights: z.boolean(),
  license: z.string().optional(),
  released: z.string(), // YYYY-MM
  modality: z.array(z.string()).default([]),
  context_k: z.number().nullable().optional(),
  params_b: z.number().nullable().optional(),
  arena_elo: z.number().nullable().optional(),
  arena_rank: z.number().nullable().optional(),
  intelligence_index: z.number().nullable().optional(),
  gpqa: z.number().nullable().optional(),
  aime: z.number().nullable().optional(),
  swe_bench: z.number().nullable().optional(),
  mmlu_pro: z.number().nullable().optional(),
  hle: z.number().nullable().optional(),
  price_in: z.number().nullable().optional(),
  price_out: z.number().nullable().optional(),
  speed_tok_s: z.number().nullable().optional(),
  sources: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().optional(),
})
export type AIModel = z.infer<typeof aiModelSchema>

export const models: AIModel[] = (raw as unknown[]).flatMap((r) => {
  const res = aiModelSchema.safeParse(r)
  if (res.success) return [res.data]
  // eslint-disable-next-line no-console
  console.warn('[models] failed validation:', res.error.issues)
  return []
})

export const LABS = Array.from(new Set(models.map((m) => m.lab))).sort()

export const LAB_COLOR: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#d4a27f',
  Google: '#4285f4',
  xAI: '#cbd5e1',
  Meta: '#0866ff',
  DeepSeek: '#4d6bfe',
  'Alibaba (Qwen)': '#ff6a00',
  'Moonshot AI': '#7c3aed',
  'Zhipu / Z.ai': '#14b8a6',
  MiniMax: '#f43f5e',
  Xiaomi: '#ff6900',
  NVIDIA: '#76b900',
  'Mistral AI': '#fa5111',
}
export function labColor(lab: string): string {
  return LAB_COLOR[lab] ?? '#94a3b8'
}

export type MetricKey =
  | 'intelligence_index'
  | 'arena_elo'
  | 'gpqa'
  | 'aime'
  | 'swe_bench'
  | 'mmlu_pro'
  | 'hle'

export interface MetricDef {
  key: MetricKey
  label: string
  short: string
  pct: boolean
}

export const METRICS: MetricDef[] = [
  { key: 'intelligence_index', label: 'AA Intelligence Index (composite)', short: 'Intelligence Index', pct: false },
  { key: 'arena_elo', label: 'LMArena ELO — human votes', short: 'Arena ELO (votes)', pct: false },
  { key: 'gpqa', label: 'GPQA Diamond — graduate science', short: 'GPQA', pct: true },
  { key: 'aime', label: 'AIME — competition math', short: 'AIME', pct: true },
  { key: 'swe_bench', label: 'SWE-bench Verified — real coding', short: 'SWE-bench', pct: true },
  { key: 'mmlu_pro', label: 'MMLU-Pro — knowledge', short: 'MMLU-Pro', pct: true },
  { key: 'hle', label: "Humanity's Last Exam — frontier", short: 'HLE', pct: true },
]

/** 3:1 input:output blended price ($/Mtok) — the common real-usage weighting. */
export function blendedPrice(m: AIModel): number | null {
  if (m.price_in == null || m.price_out == null) return null
  return (3 * m.price_in + m.price_out) / 4
}

export function dateNum(released: string): number {
  const [y, mo] = released.split('-').map(Number)
  return y + ((mo || 1) - 1) / 12
}

export function metricVal(m: AIModel, k: MetricKey): number | null {
  const v = m[k]
  return typeof v === 'number' ? v : null
}
