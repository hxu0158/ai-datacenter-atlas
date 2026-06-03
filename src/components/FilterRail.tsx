import { useAtlas, YEAR_MIN, YEAR_MAX, type ColorDim } from '../store'
import { OPERATOR_GROUPS, ALL_ISOS, ALL_FUELS, ALL_VENDORS, ALL_STATES } from '../lib/data'
import { STATUS } from '../types'
import { STATUS_COLOR, FUEL_COLOR, VENDOR_COLOR, OPERATOR_COLOR, ISO_COLOR } from '../lib/colors'
import { STATUS_LABEL, FUEL_LABEL, titleCase } from '../lib/format'
import { RotateCcw, Search, Layers, Link2, Database, X } from 'lucide-react'

type FacetKey = 'operators' | 'statuses' | 'states' | 'isos' | 'fuels' | 'vendors'

function Chip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition ' +
        (active
          ? 'border-accent/60 bg-accent/15 text-slate-100'
          : 'border-ink-500/60 bg-ink-800/40 text-slate-400 hover:border-ink-400 hover:text-slate-200')
      }
    >
      {color && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      )}
      {label}
    </button>
  )
}

function FacetGroup({
  title,
  facet,
  options,
}: {
  title: string
  facet: FacetKey
  options: { value: string; label: string; color?: string }[]
}) {
  const selected = useAtlas((s) => s[facet]) as string[]
  const toggle = useAtlas((s) => s.toggle)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            color={o.color}
            active={selected.includes(o.value)}
            onClick={() => toggle(facet, o.value)}
          />
        ))}
      </div>
    </div>
  )
}

function ColorByToggle() {
  const colorDim = useAtlas((s) => s.colorDim)
  const setColorDim = useAtlas((s) => s.setColorDim)
  const opts: { v: ColorDim; l: string }[] = [
    { v: 'status', l: 'Status' },
    { v: 'operator', l: 'Operator' },
    { v: 'fuel', l: 'Fuel' },
  ]
  return (
    <div className="flex overflow-hidden rounded-md border border-ink-500/60">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setColorDim(o.v)}
          className={
            'flex-1 px-2 py-1 text-[11px] transition ' +
            (colorDim === o.v
              ? 'bg-accent/20 text-slate-100'
              : 'bg-ink-800/40 text-slate-400 hover:text-slate-200')
          }
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

export default function FilterRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { search, setSearch, yearMax, setYearMax, reset, activeFilterCount } = useAtlas()
  const showAssets = useAtlas((s) => s.showAssets)
  const setShowAssets = useAtlas((s) => s.setShowAssets)
  const showLinks = useAtlas((s) => s.showLinks)
  const setShowLinks = useAtlas((s) => s.setShowLinks)
  const count = activeFilterCount()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[1400] bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={
          'flex h-full w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-ink-600/70 bg-ink-900 p-3 transition-transform ' +
          'fixed inset-y-0 left-0 z-[1450] lg:static lg:z-auto lg:w-[260px] lg:translate-x-0 lg:bg-ink-900/60 ' +
          (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Filters
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              disabled={count === 0}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-400 enabled:hover:text-accent disabled:opacity-40"
            >
              <RotateCcw size={11} /> Reset{count > 0 ? ` (${count})` : ''}
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-100 lg:hidden"
              title="Close filters"
            >
              <X size={14} />
            </button>
          </div>
        </div>

      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2 top-2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search site, operator, city…"
          className="w-full rounded-md border border-ink-500/60 bg-ink-800/60 py-1.5 pl-7 pr-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none"
        />
      </div>

      <FacetGroup
        title="Operator"
        facet="operators"
        options={OPERATOR_GROUPS.map((g) => ({ value: g, label: g, color: OPERATOR_COLOR[g] }))}
      />
      <FacetGroup
        title="Status"
        facet="statuses"
        options={STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s], color: STATUS_COLOR[s] }))}
      />
      <FacetGroup
        title="Grid region (ISO)"
        facet="isos"
        options={ALL_ISOS.map((i) => ({ value: i, label: i, color: ISO_COLOR[i] }))}
      />
      <FacetGroup
        title="Primary power"
        facet="fuels"
        options={ALL_FUELS.map((f) => ({ value: f, label: FUEL_LABEL[f], color: FUEL_COLOR[f] }))}
      />
      <FacetGroup
        title="Silicon vendor"
        facet="vendors"
        options={ALL_VENDORS.map((v) => ({ value: v, label: v, color: VENDOR_COLOR[v] }))}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <span>Online by</span>
          <span className="tnum text-accent">{yearMax >= YEAR_MAX ? 'all' : yearMax}</span>
        </div>
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          step={1}
          value={yearMax}
          onChange={(e) => setYearMax(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[9px] text-slate-600">
          <span>{YEAR_MIN}</span>
          <span>{YEAR_MAX}+</span>
        </div>
      </div>

      <FacetGroup
        title="State"
        facet="states"
        options={ALL_STATES.map((s) => ({ value: s, label: s }))}
      />

      <div className="mt-auto flex flex-col gap-2 border-t border-ink-600/60 pt-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <Layers size={11} /> Map layers
        </div>
        <ColorByToggle />
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={showAssets}
            onChange={(e) => setShowAssets(e.target.checked)}
            className="accent-accent"
          />
          <Database size={11} className="text-lime-400" /> Power-supply assets
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={showLinks}
            onChange={(e) => setShowLinks(e.target.checked)}
            className="accent-accent"
          />
          <Link2 size={11} className="text-slate-400" /> PPA / supply links
        </label>
        <div className="text-[10px] leading-snug text-slate-600">
          Color by {titleCase(useAtlas.getState().colorDim)} · circle size ∝ MW
        </div>
      </div>
      </aside>
    </>
  )
}
