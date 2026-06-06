---
description: Refresh the AI Data Center & Energy Atlas dataset from public sources (in-session — uses your normal subscription, no metered CLI credit)
argument-hint: "[optional scope, e.g. 'Meta + nuclear' or 'Stargate']"
allowed-tools: Read, Edit, Write, WebSearch, WebFetch, Bash(npm run validate)
---

You are refreshing the dataset behind the **AI Data Center & Energy Atlas** (this project). This runs **inside the current Claude Code session** on purpose — it must NOT shell out to `claude -p` (that draws on a separately-metered credit pool). Do the research and edits yourself with your own tools.

Scope for this run: **$ARGUMENTS** (if empty, do a full sweep of all operators + the power-supply layer).

## Procedure

1. **Load the schema and current data.** Read `src/types.ts` (the zod schema — the contract), then `src/data/datacenters.json`, `src/data/power-assets.json`, and `src/data/meta.json`. For the **Models tracker**, also read `src/lib/models.ts` (the model schema) and `src/data/models.json`.

2. **Research before changing anything.** For each operator / major project in scope (Stargate/OpenAI, Meta, Microsoft, Amazon/AWS, Google, xAI, Anthropic, neoclouds) and the power layer (nuclear restarts/PPAs/SMRs, on-site gas, geothermal, solar+storage), use **WebSearch / WebFetch to verify status, capacity (MW), capex, timeline, and power arrangements**. Also hunt for **newly announced campuses or power deals** not yet in the dataset.
   - **Never guess from a name or pattern.** If you can't find a source, leave the figure unchanged or mark it `confidence: "low"` — do not invent numbers or coordinates.
   - Every figure you add or change must have a citation URL in that record's `sources` array.

3. **Edit the JSON in place**, conforming exactly to the schema in `src/types.ts`:
   - Keep existing `id` values **stable** (don't rename ids — downstream links depend on them).
   - Set `confidence` honestly (`high` = disclosed figures, `medium` = reported but estimated, `low` = early/approximate).
   - For power assets, keep `linked_campus_ids` pointing at real campus ids.

4. **Bump `meta.json`**: increment `version` (patch), set `as_of` to today's date, and add any new entries to `sources`.

5. **Back up + validate.** Before writing, copy the prior files to `*.bak.json`. After editing, run `npm run validate` and fix any errors or schema/enums/referential-integrity warnings it reports.

6. **Summarize for review (auto-write, review-after).** You apply the changes directly — don't wait for approval mid-task. Then print a concise changelog: **Added / Changed / Removed**, each line with the figure, the old→new value, and the source URL, so Henry can review the diff afterward and override if needed.

## Models tracker (`src/data/models.json`)

On a full sweep (or when scope mentions models / leaderboards / a specific lab), also refresh the frontier + open-weights model dataset:

- Pull current standings from **artificialanalysis.ai** (Intelligence Index, price, speed, context), **lmarena.ai** (ELO — human votes), and the labs' own model + pricing pages. Update GPQA Diamond / AIME / SWE-bench Verified / MMLU-Pro / HLE from reputable trackers.
- **Pricing basis (important):** closed models use the lab's **first-party API list price** ($/Mtok input/output). Open-weights models have **no single official price** — use a consistent **representative inference-host rate** (OpenRouter's listed price or Artificial Analysis's median-provider figure), or the lab's own API if it runs one (DeepSeek / Moonshot / Zhipu do). Pull `speed_tok_s` from the same host where possible, and note the source in `notes`. Don't mix hosts arbitrarily — pick one convention and apply it across all open models so they stay comparable.
- **Add newly released models** (new flagships, new open-weights) and flag superseded ones in `notes`; keep `id`s stable.
- Same discipline: **cite every figure** in `sources`, set `confidence` honestly, and leave a field `null` rather than guess. Note when a "SWE-bench" number is actually SWE-bench *Pro* (not *Verified*), or AIME 2025 vs 2026.
- Beware AI-generated SEO content with fabricated specs (it's rampant for new model names) — prefer primary lab pages and the two trackers above; if only secondary sources exist, set `confidence: "low"`.

Be conservative: this dataset's credibility rests on every number being traceable to a source.
