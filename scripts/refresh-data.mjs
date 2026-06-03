#!/usr/bin/env node
/*
 * OPTIONAL unattended refresh. Shells out to the `claude` CLI (Claude Max),
 * NOT the Anthropic API/SDK.
 *
 * ⚠ Headless `claude -p` draws on the separately-metered CLI credit pool.
 *   For routine interactive refreshes, prefer the in-session slash command
 *   `/refresh-data` (uses your normal subscription). Use this script only for
 *   scheduled/unattended runs.
 *
 * Flow: read current data -> ask claude to web-verify & return updated JSON ->
 *       validate -> back up -> write -> print a diff summary.
 *
 * Usage: node scripts/refresh-data.mjs ["scope hint, e.g. 'Meta + nuclear'"]
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { validateDataset } from './validate-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'src', 'data')
const scope = process.argv.slice(2).join(' ').trim()

const dcPath = join(DATA, 'datacenters.json')
const paPath = join(DATA, 'power-assets.json')
const metaPath = join(DATA, 'meta.json')

const dc = JSON.parse(readFileSync(dcPath, 'utf8'))
const pa = JSON.parse(readFileSync(paPath, 'utf8'))
const meta = JSON.parse(readFileSync(metaPath, 'utf8'))

const schema = readFileSync(join(__dirname, '..', 'src', 'types.ts'), 'utf8')

const prompt = `You are updating an analyst dataset of US AI data centers and their energy supply.

RULES:
- Web-search to VERIFY every figure you change and to find NEW campuses/power assets. NEVER guess from a name pattern — search first and cite a URL in the record's "sources".
- Conform EXACTLY to the zod schema below. Keep existing "id" values stable. Set "confidence" honestly (high/medium/low). For unknown coordinates use a plausible point and confidence "low".
- Output ONLY one fenced \`\`\`json block containing an object: { "datacenters": [...], "power_assets": [...], "meta": {...} }. No prose outside the block.
${scope ? `- Focus this refresh on: ${scope}\n` : ''}
SCHEMA (src/types.ts):
${schema}

CURRENT meta.json:
${JSON.stringify(meta)}

CURRENT datacenters.json:
${JSON.stringify(dc)}

CURRENT power-assets.json:
${JSON.stringify(pa)}

Return the full updated dataset as described. Bump meta.version (patch) and set meta.as_of to today.`

console.log('⚠ This uses the metered `claude -p` CLI credit pool. For routine updates, use the /refresh-data slash command instead.')
console.log(`→ Invoking claude${scope ? ` (scope: ${scope})` : ''}…`)

const res = spawnSync('claude', ['-p', '--output-format', 'text', prompt], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})

if (res.error) {
  console.error('✗ Could not run the `claude` CLI:', res.error.message)
  console.error('  Install/login to Claude Code, or use the /refresh-data slash command in a session.')
  process.exit(1)
}

const out = res.stdout ?? ''
const match = out.match(/```json\s*([\s\S]*?)```/)
if (!match) {
  console.error('✗ No JSON block found in model output. Aborting (no files changed).')
  process.exit(1)
}

let parsed
try {
  parsed = JSON.parse(match[1])
} catch (e) {
  console.error('✗ JSON parse failed:', e.message)
  process.exit(1)
}

const newDc = parsed.datacenters ?? dc
const newPa = parsed.power_assets ?? pa
const newMeta = parsed.meta ?? meta

const { errors, warnings } = validateDataset(newDc, newPa, newMeta)
if (errors.length) {
  console.error(`✗ Refreshed data failed validation (${errors.length} errors). Not writing.`)
  errors.slice(0, 20).forEach((e) => console.error('   ', e))
  process.exit(1)
}

// Back up then write (auto-write; review the diff after — see CHANGELOG note).
for (const [path, key] of [[dcPath, 'datacenters'], [paPath, 'power-assets'], [metaPath, 'meta']]) {
  if (existsSync(path)) copyFileSync(path, path.replace(/\.json$/, '.bak.json'))
}
writeFileSync(dcPath, JSON.stringify(newDc, null, 2) + '\n')
writeFileSync(paPath, JSON.stringify(newPa, null, 2) + '\n')
writeFileSync(metaPath, JSON.stringify(newMeta, null, 2) + '\n')

console.log('✓ Dataset refreshed and validated.')
console.log(`  campuses ${dc.length} -> ${newDc.length} · assets ${pa.length} -> ${newPa.length}`)
if (warnings.length) console.log(`  ${warnings.length} warning(s) — run \`npm run validate\` to review.`)
console.log('  Prior files backed up to *.bak.json. Review the git diff before committing.')
