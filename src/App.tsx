import { useState } from 'react'
import { Activity, Info, Gauge } from 'lucide-react'
import KpiStrip from './components/KpiStrip'
import FilterRail from './components/FilterRail'
import MapView from './components/MapView'
import LensPanel from './components/LensPanel'
import DetailDrawer from './components/DetailDrawer'
import MethodologyModal from './components/MethodologyModal'
import DerivationModal from './components/DerivationModal'
import { meta } from './lib/data'

export default function App() {
  const [showMethod, setShowMethod] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-900 text-slate-200">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink-600/70 bg-ink-900/80 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Gauge size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-slate-100">
              AI Data Center &amp; Energy Atlas
            </h1>
            <p className="text-[11px] leading-tight text-slate-500">
              US AI buildout × the power that feeds it — power is the binding constraint, silicon follows the megawatts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-md border border-ink-500/60 bg-ink-800/60 px-2 py-1 text-[11px] text-slate-400 sm:flex">
            <Activity size={12} className="text-accent" />
            as of {meta.as_of} · v{meta.version}
          </span>
          <button
            onClick={() => setShowMethod(true)}
            className="flex items-center gap-1.5 rounded-md border border-ink-500/60 bg-ink-800/60 px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent/60 hover:text-accent"
          >
            <Info size={12} /> Methodology
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="shrink-0 border-b border-ink-600/70 bg-ink-900/60 px-3 pb-1.5 pt-2.5">
        <KpiStrip />
        <div className="mt-1.5 text-[10px] text-slate-600">
          Double-click any figure — or click a chart bar/segment — to open its derivation: the formula, constants, per-campus build-up, and sources.
        </div>
      </div>

      {/* Body: filter rail stays pinned; main content column scrolls */}
      <div className="flex min-h-0 flex-1">
        <FilterRail />
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          <div className="h-[52vh] min-h-[340px] w-full border-b border-ink-600/70">
            <MapView />
          </div>
          <LensPanel />
          <DetailDrawer />
        </main>
      </div>

      {showMethod && <MethodologyModal onClose={() => setShowMethod(false)} />}
      <DerivationModal />
    </div>
  )
}
