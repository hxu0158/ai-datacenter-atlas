import type { ReactNode } from 'react'

export const AXIS = { fontSize: 11, fill: '#94a3b8' }
export const GRID_COLOR = '#1d2a3a'

export const tooltipProps = {
  contentStyle: {
    background: '#0f1622',
    border: '1px solid #27384c',
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#94a3b8', marginBottom: 2 },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
}

export function ChartCard({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={
        'flex min-w-0 flex-col rounded-lg border border-ink-600/60 bg-ink-800/40 p-3 ' +
        (wide ? 'lg:col-span-2' : '')
      }
    >
      <div className="text-xs font-semibold text-slate-200">{title}</div>
      {subtitle && <div className="mb-1 text-[11px] text-slate-500">{subtitle}</div>}
      <div className="mt-1 min-h-0 flex-1">{children}</div>
    </div>
  )
}

/** Compact legend used under donuts. */
export function MiniLegend({ items }: { items: { label: string; color: string; value: string }[] }) {
  return (
    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: i.color }} />
            <span className="truncate">{i.label}</span>
          </span>
          <span className="tnum shrink-0 text-slate-400">{i.value}</span>
        </div>
      ))}
    </div>
  )
}
