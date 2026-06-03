---
description: Refresh the AI Data Center & Energy Atlas dataset from public sources (in-session — uses your normal subscription, no metered CLI credit)
argument-hint: "[optional scope, e.g. 'Meta + nuclear' or 'Stargate']"
allowed-tools: Read, Edit, Write, WebSearch, WebFetch, Bash(npm run validate)
---

You are refreshing the dataset behind the **AI Data Center & Energy Atlas** (this project). This runs **inside the current Claude Code session** on purpose — it must NOT shell out to `claude -p` (that draws on a separately-metered credit pool). Do the research and edits yourself with your own tools.

Scope for this run: **$ARGUMENTS** (if empty, do a full sweep of all operators + the power-supply layer).

## Procedure

1. **Load the schema and current data.** Read `src/types.ts` (the zod schema — the contract), then `src/data/datacenters.json`, `src/data/power-assets.json`, and `src/data/meta.json`.

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

Be conservative: this dataset's credibility rests on every number being traceable to a source.
