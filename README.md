# AI Data Center & Energy Atlas

An interactive analyst dashboard mapping the **US AI data-center buildout** and the **energy supply that feeds it** — built to be read through a semiconductor-analyst lens. Two top-level views: a **Data Centers** map/dashboard and a **Models** tracker (frontier + open-weights leaderboards, benchmarks, and price-performance).

> **Thesis baked into the design:** power is the binding constraint. Megawatts gate the buildout; silicon TAM follows the megawatts. So the tool deliberately links three layers that are usually tracked apart: **compute demand** (campuses, MW), **energy supply** (nuclear restarts/PPAs, SMRs, on-site gas, geothermal, solar+storage), and the **silicon implication** (implied accelerators + vendor exposure).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build     # type-check + production build
npm run validate  # check the dataset (schema, enums, unique IDs, referential integrity)
npm run refresh   # OPTIONAL unattended refresh via the metered `claude -p` CLI (see below)
```

## What's on the dashboard

- **KPI strip** — tracked GW (operational / under-construction / pipeline), capex, implied accelerators + silicon $, contracted nuclear vs. gas, and the headline **demand − tracked-supply gap**.
- **Map** — every campus sized by MW; color by status / operator / fuel. Toggle the **power-supply asset layer** and the **PPA/supply link-lines** that tie generation to campuses. Click any marker for a full profile.
- **Four analyst lenses** (tabs):
  - **Power / energy** — demand vs. dedicated supply by grid region (ISO), campus fuel mix, supply-asset mix, plus **annual electricity consumption (TWh/yr)** with tunable load-factor/PUE and a US-grid-share readout. (Power in **GW** sizes the build and the grid constraint; **TWh/yr** is what it actually consumes — both shown in their correct unit.)
  - **Silicon demand** — implied accelerators by vendor, silicon $ by operator, merchant-GPU vs. custom-ASIC split.
  - **Capex & players** — capex by operator stacked by status, largest single-campus commitments + partners.
  - **Buildout timeline** — cumulative GW reaching first-power by year vs. the full pipeline, plus annual adds.
- **Data table** — sortable, filtered, **CSV export**.
- **Show the math** — double-click any KPI (or click any chart bar/segment) to open a **derivation widget**: the formula, the constants used, the full per-campus build-up (e.g. `5,000 MW × 1000 ÷ 2 kW = 2.5M accelerators`), the deduped source list, and the high/medium/low confidence mix. Every aggregate is traceable back to the records and sources that produced it.
- **Filters** cross-filter everything: operator, status, grid region, primary power, silicon vendor, state, and an "online by year" slider.

### Models view — the AI model race

A second top-level tab tracking ~30 frontier + key open-weights models the way an AI-investment analyst would:

- **Leaderboard** — rank by LMArena human votes (ELO) **or** any objective benchmark (GPQA, AIME, SWE-bench Verified, HLE, MMLU-Pro, or the AA Intelligence Index); bars colored by lab.
- **Price vs. performance** — blended $/Mtok (log) vs Intelligence Index — the efficient frontier and the commoditization read (open/Chinese models cheap + near-frontier).
- **Capability over time** — the Intelligence-Index frontier staircase, **closed vs open-weights**, surfacing the live ~6–7-point gap.
- **Economics** (SemiAnalysis-inspired) — the **cost of intelligence collapsing** (cheapest $/Mtok to clear a capability bar, falling over time, with the deflation multiple) and an **intelligence-per-dollar** ranking. The supply-side metrics SemiAnalysis is known for (cost-to-serve, $/GPU-hr, inference margins) are their paid moat; these reproduce the demand side from public data.
- **Benchmarks & data** — heat-mapped, sortable model table with pricing/context, **CSV export**.
- Click any bar / dot / row for a **per-model drawer** (release, context, pricing, every benchmark, sources). Each metric is explained in plain English, and missing values are flagged ("no published figure: …") rather than guessed.

Snapshot dataset at `src/data/models.json` (refreshable). Benchmark figures vary by source/effort setting and are directional; each record carries a confidence flag.

## Data

The dataset is the core value and is meant to be edited and extended.

- `src/data/datacenters.json` — ~45 major AI campuses (compute demand).
- `src/data/power-assets.json` — ~20 dedicated power-supply assets (energy supply), linked back to campuses.
- `src/data/meta.json` — version, as-of date, disclaimer, methodology, sources.
- `src/types.ts` — the **zod schema** (the contract for both files), with field-level docs and units.

**Scope & honesty.** This curates the *major AI-specific* campuses plus the power assets contracted to feed them — not an exhaustive census of every US data center. Figures are estimates from public reporting; each record carries a `confidence` flag and `sources`. See the in-app **Methodology** modal (or `meta.json`) for how implied accelerators, silicon $, and the power gap are derived.

## Keeping it current — two refresh paths

1. **`/refresh-data` (primary).** Open a Claude Code session in this project and run the `/refresh-data` slash command (optionally `/refresh-data Meta + nuclear`). It web-verifies and updates the JSON **inside the session**, so it uses your normal subscription — **no metered CLI credit** — then runs `npm run validate` and prints a changelog to review. Definition: [`.claude/commands/refresh-data.md`](.claude/commands/refresh-data.md).
2. **`npm run refresh` (optional automation).** A Node script that shells out to the `claude` CLI for unattended/scheduled runs. ⚠ This draws on the **separately-metered `claude -p` credit pool** — prefer the slash command for routine updates. It validates, backs up `*.bak.json`, and auto-writes for after-the-fact review.

Both paths: **verify and cite every change, never guess.**

## Stack

Vite · React · TypeScript · Tailwind · Leaflet (react-leaflet) · Recharts · zustand · zod.

## Disclaimer

Analyst working tool, **not investment advice**. Verify against primary sources before relying on any single number.
