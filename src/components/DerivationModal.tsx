import { useMemo } from 'react'
import { X, ExternalLink, FunctionSquare } from 'lucide-react'
import { useAtlas } from '../store'
import { useFiltered } from '../lib/useFiltered'
import { buildDerivation, type Contribution } from '../lib/derive'

const CONF: Record<string, string> = { high: '#34d399', medium: '#fbbf24', low: '#94a3b8' }

export default function DerivationModal() {
  const der = useAtlas((s) => s.derivation)
  const close = useAtlas((s) => s.closeDerivation)
  const select = useAtlas((s) => s.select)
  const { dcs, assets } = useFiltered()

  const d = useMemo(
    () => (der ? buildDerivation(der.metric, der.arg, dcs, assets) : null),
    [der, dcs, assets],
  )
  if (!der || !d) return null

  const openItem = (c: Contribution) => {
    if (c.kind === 'dc') {
      select({ kind: 'dc', id: c.id })
      close()
    } else if (c.kind === 'asset') {
      select({ kind: 'asset', id: c.id })
      close()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-ink-500/70 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-600/70 p-4">
          <div className="flex items-start gap-2.5">
            <FunctionSquare size={18} className="mt-0.5 text-accent" />
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Derivation</div>
              <div className="text-sm font-semibold text-slate-100">{d.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="tnum text-2xl font-semibold text-accent">{d.total}</div>
            <button
              onClick={close}
              className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {/* formula */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Formula
            </div>
            <code className="block overflow-x-auto whitespace-pre rounded-md border border-ink-600/60 bg-ink-800/60 px-3 py-2 font-mono text-[12px] text-accent">
              {d.formula}
            </code>
          </div>

          {/* assumptions */}
          {d.assumptions.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Assumptions &amp; constants
              </div>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[12px] leading-relaxed text-slate-300">
                {d.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* build-up table */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Build-up ({d.contributions.length})
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: CONF.high }} /> {d.confidenceMix.high} high
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: CONF.medium }} /> {d.confidenceMix.medium} med
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: CONF.low }} /> {d.confidenceMix.low} low
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-ink-600/60">
              <table className="w-full border-collapse text-[11px]">
                <thead className="bg-ink-800 text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Item</th>
                    <th className="px-2 py-1.5 text-left font-medium">{d.colInput}</th>
                    <th className="px-2 py-1.5 text-left font-medium">Math</th>
                    <th className="px-2 py-1.5 text-right font-medium">{d.colValue}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.contributions.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openItem(c)}
                      className={
                        'border-t border-ink-700/50 ' +
                        (c.kind === 'group' ? '' : 'cursor-pointer hover:bg-ink-800/60')
                      }
                    >
                      <td className="px-2 py-1 text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: CONF[c.confidence] }} />
                          {c.name}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-slate-400">{c.input}</td>
                      <td className="px-2 py-1 font-mono text-[10px] text-slate-500">{c.math}</td>
                      <td className="tnum px-2 py-1 text-right text-slate-200">{c.display}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-500/60 bg-ink-800/40">
                    <td className="px-2 py-1.5 font-semibold text-slate-200" colSpan={3}>
                      Total
                    </td>
                    <td className="tnum px-2 py-1.5 text-right font-semibold text-accent">{d.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {d.note && <div className="mt-1 text-[11px] text-slate-500">{d.note}</div>}
          </div>

          {/* sources */}
          {d.sources.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sources ({d.sources.length})
              </div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {d.sources.map((u) => {
                  let host = u
                  try {
                    host = new URL(u).hostname.replace('www.', '')
                  } catch {
                    /* keep raw */
                  }
                  return (
                    <a
                      key={u}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-accent hover:underline"
                    >
                      <ExternalLink size={11} className="shrink-0" />
                      <span className="truncate">{host}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-600">
            Reflects current filters · click a row to open that campus/asset · figures are estimates from public reporting (see Methodology).
          </div>
        </div>
      </div>
    </div>
  )
}
