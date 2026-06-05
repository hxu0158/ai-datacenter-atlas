import { useState, useMemo, type ReactNode } from 'react'
import { Trophy, DollarSign, LineChart, Table2, TrendingDown } from 'lucide-react'
import { models, blendedPrice, type AIModel } from '../../lib/models'
import ModelLeaderboard from './ModelLeaderboard'
import ModelPricePerf from './ModelPricePerf'
import ModelTimeline from './ModelTimeline'
import ModelEconomics from './ModelEconomics'
import ModelBenchmarks from './ModelBenchmarks'
import ModelDrawer from './ModelDrawer'

type Tab = 'leaderboard' | 'price' | 'time' | 'econ' | 'data'
const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={13} /> },
  { id: 'price', label: 'Price vs performance', icon: <DollarSign size={13} /> },
  { id: 'time', label: 'Capability over time', icon: <LineChart size={13} /> },
  { id: 'econ', label: 'Economics', icon: <TrendingDown size={13} /> },
  { id: 'data', label: 'Benchmarks & data', icon: <Table2 size={13} /> },
]

function Kpi({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div
      className={
        'flex min-w-[150px] shrink-0 flex-col gap-0.5 rounded-lg border px-3 py-2 md:min-w-0 md:flex-1 ' +
        (accent ? 'border-accent/40 bg-accent/5' : 'border-ink-500/60 bg-ink-800/60')
      }
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="truncate text-sm font-semibold text-slate-100">{value}</div>
      {sub && <div className="tnum truncate text-[10px] text-slate-500">{sub}</div>}
    </div>
  )
}

export default function ModelsView() {
  const [tab, setTab] = useState<Tab>('leaderboard')
  const k = useMemo(() => {
    const idxOf = (m: AIModel) => m.intelligence_index ?? -1
    const leader = models.reduce((a, b) => (idxOf(b) > idxOf(a) ? b : a))
    const closedVals = models.filter((m) => !m.open_weights && m.intelligence_index != null).map((m) => m.intelligence_index as number)
    const openVals = models.filter((m) => m.open_weights && m.intelligence_index != null).map((m) => m.intelligence_index as number)
    const gap = Math.max(...closedVals) - Math.max(...openVals)
    const frontierClass = models.filter((m) => (m.intelligence_index ?? 0) >= 50 && blendedPrice(m) != null)
    const cheapest = frontierClass.reduce<AIModel | null>(
      (a, b) => (a == null || blendedPrice(b)! < blendedPrice(a)! ? b : a),
      null,
    )
    const open = models.filter((m) => m.open_weights).length
    return { count: models.length, leader, gap, cheapest, open, closed: models.length - open }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* KPI row */}
      <div className="shrink-0 border-b border-ink-600/70 bg-ink-900/60 px-3 pb-1.5 pt-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0">
          <Kpi label="Models tracked" value={k.count} sub="frontier + key open" />
          <Kpi label="Intelligence leader" value={k.leader.name} sub={`${k.leader.lab} · Index ${k.leader.intelligence_index}`} accent />
          <Kpi label="Closed − open gap" value={`${k.gap} pts`} sub="Index — commoditization signal" />
          <Kpi
            label="Cheapest frontier-class"
            value={k.cheapest ? k.cheapest.name : '—'}
            sub={k.cheapest ? `$${blendedPrice(k.cheapest)!.toFixed(1)}/Mtok · Index ≥ 50` : ''}
          />
          <Kpi label="Open vs closed" value={`${k.open} / ${k.closed}`} sub="open-weights / proprietary" />
        </div>
        <div className="mt-1.5 text-[10px] leading-snug text-slate-600">
          Snapshot, Jun 2026 · "votes" = LMArena human-preference ELO; benchmarks (GPQA / AIME / SWE-bench / HLE) and the AA Intelligence Index vary by source &amp; effort setting — treat as directional. Color = lab; ○ = open weights.
        </div>
      </div>

      {/* sub-tabs */}
      <div className="sticky top-0 z-20 flex flex-wrap gap-1 border-b border-ink-600/70 bg-ink-900/95 px-2 pt-1 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-1.5 text-[12px] font-medium transition ' +
              (tab === t.id ? 'border-accent text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200')
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {tab === 'leaderboard' && <ModelLeaderboard />}
        {tab === 'price' && <ModelPricePerf />}
        {tab === 'time' && <ModelTimeline />}
        {tab === 'econ' && <ModelEconomics />}
        {tab === 'data' && <ModelBenchmarks />}
      </div>

      <ModelDrawer />
    </div>
  )
}
