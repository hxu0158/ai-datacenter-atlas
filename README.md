# AI Data Center & Energy Atlas

An interactive analyst dashboard mapping the **US AI data-center buildout** and the **energy supply that feeds it** — built to be read through a semiconductor-analyst lens.

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
  - **Power / energy** — demand vs. dedicated supply by grid region (ISO), campus fuel mix, supply-asset mix.
  - **Silicon demand** — implied accelerators by vendor, silicon $ by operator, merchant-GPU vs. custom-ASIC split.
  - **Capex & players** — capex by operator stacked by status, largest single-campus commitments + partners.
  - **Buildout timeline** — cumulative GW reaching first-power by year vs. the full pipeline, plus annual adds.
- **Data table** — sortable, filtered, **CSV export**.
- **Show the math** — double-click any KPI (or click any chart bar/segment) to open a **derivation widget**: the formula, the constants used, the full per-campus build-up (e.g. `5,000 MW × 1000 ÷ 2 kW = 2.5M accelerators`), the deduped source list, and the high/medium/low confidence mix. Every aggregate is traceable back to the records and sources that produced it.
- **Filters** cross-filter everything: operator, status, grid region, primary power, silicon vendor, state, and an "online by year" slider.

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
