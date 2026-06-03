import { useState, type ReactNode } from 'react'
import { Zap, Cpu, DollarSign, CalendarRange, Table2 } from 'lucide-react'
import PowerLens from './charts/PowerLens'
import SiliconLens from './charts/SiliconLens'
import CapexLens from './charts/CapexLens'
import TimelineLens from './charts/TimelineLens'
import DataTable from './DataTable'

type Tab = 'power' | 'silicon' | 'capex' | 'timeline' | 'table'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'power', label: 'Power / energy', icon: <Zap size={13} /> },
  { id: 'silicon', label: 'Silicon demand', icon: <Cpu size={13} /> },
  { id: 'capex', label: 'Capex & players', icon: <DollarSign size={13} /> },
  { id: 'timeline', label: 'Buildout timeline', icon: <CalendarRange size={13} /> },
  { id: 'table', label: 'Data table', icon: <Table2 size={13} /> },
]

export default function LensPanel() {
  const [tab, setTab] = useState<Tab>('power')

  return (
    <div>
      <div className="sticky top-0 z-20 flex flex-wrap gap-1 border-b border-ink-600/70 bg-ink-900/95 px-2 pt-1 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-1.5 text-[12px] font-medium transition ' +
              (tab === t.id
                ? 'border-accent text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200')
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {tab === 'power' && <PowerLens />}
        {tab === 'silicon' && <SiliconLens />}
        {tab === 'capex' && <CapexLens />}
        {tab === 'timeline' && <TimelineLens />}
        {tab === 'table' && <DataTable />}
      </div>
    </div>
  )
}
