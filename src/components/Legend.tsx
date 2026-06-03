import { useAtlas } from '../store'
import { STATUS_COLOR, FUEL_COLOR, OPERATOR_COLOR } from '../lib/colors'
import { STATUS_LABEL, FUEL_LABEL, titleCase } from '../lib/format'
import { STATUS } from '../types'
import { OPERATOR_GROUPS, ALL_FUELS } from '../lib/data'

export default function Legend({
  campusCount,
  assetCount,
}: {
  campusCount: number
  assetCount: number
}) {
  const colorDim = useAtlas((s) => s.colorDim)

  let entries: { label: string; color: string }[] = []
  if (colorDim === 'status')
    entries = STATUS.map((s) => ({ label: STATUS_LABEL[s], color: STATUS_COLOR[s] }))
  else if (colorDim === 'fuel')
    entries = ALL_FUELS.map((f) => ({ label: FUEL_LABEL[f], color: FUEL_COLOR[f] }))
  else entries = OPERATOR_GROUPS.map((g) => ({ label: g, color: OPERATOR_COLOR[g] }))

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-ink-500/70 bg-ink-900/85 p-2.5 text-[11px] shadow-lg backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-semibold uppercase tracking-wide text-slate-300">
          {titleCase(colorDim)}
        </span>
        <span className="tnum text-slate-500">
          {campusCount} sites{assetCount ? ` · ${assetCount} assets` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {entries.map((e) => (
          <div key={e.label} className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
            <span className="truncate">{e.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-ink-600/60 pt-1.5 text-slate-400">
        <span
          className="inline-block rounded-full border border-dashed border-lime-400"
          style={{ width: 10, height: 10 }}
        />
        dashed = power-supply asset · size ∝ MW
      </div>
    </div>
  )
}
