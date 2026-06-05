import { create } from 'zustand'
import type { Status, PrimaryFuel, AccelVendor, Iso } from './types'
import type { OperatorGroup } from './lib/data'

export type ColorDim = 'status' | 'operator' | 'fuel'
export type Lens = 'power' | 'silicon' | 'capex' | 'timeline'
export type Selection = { kind: 'dc' | 'asset'; id: string } | null
/** Which metric to explain in the derivation widget; `arg` scopes it (e.g. an ISO or vendor). */
export type DerivationRequest = { metric: string; arg?: string } | null

export interface Filters {
  operators: OperatorGroup[]
  statuses: Status[]
  states: string[]
  isos: Iso[]
  fuels: PrimaryFuel[]
  vendors: AccelVendor[]
  yearMax: number
  search: string
}

export const YEAR_MIN = 2024
export const YEAR_MAX = 2030

const emptyFilters: Filters = {
  operators: [],
  statuses: [],
  states: [],
  isos: [],
  fuels: [],
  vendors: [],
  yearMax: YEAR_MAX,
  search: '',
}

type FacetKey = 'operators' | 'statuses' | 'states' | 'isos' | 'fuels' | 'vendors'

interface AtlasState extends Filters {
  // ui
  colorDim: ColorDim
  showAssets: boolean
  showLinks: boolean
  lens: Lens
  selected: Selection
  derivation: DerivationRequest
  // energy assumptions (tunable)
  loadFactor: number
  pue: number
  // models view
  selectedModel: string | null
  // actions
  toggle: (facet: FacetKey, value: string) => void
  setYearMax: (y: number) => void
  setSearch: (s: string) => void
  setColorDim: (d: ColorDim) => void
  setShowAssets: (b: boolean) => void
  setShowLinks: (b: boolean) => void
  setLens: (l: Lens) => void
  select: (sel: Selection) => void
  openDerivation: (metric: string, arg?: string) => void
  closeDerivation: () => void
  setLoadFactor: (n: number) => void
  setPue: (n: number) => void
  selectModel: (id: string | null) => void
  reset: () => void
  activeFilterCount: () => number
}

export const useAtlas = create<AtlasState>((set, get) => ({
  ...emptyFilters,
  colorDim: 'status',
  showAssets: true,
  showLinks: true,
  lens: 'power',
  selected: null,
  derivation: null,
  loadFactor: 0.8,
  pue: 1.3,
  selectedModel: null,

  toggle: (facet, value) =>
    set((s) => {
      const cur = s[facet] as string[]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { [facet]: next } as unknown as Partial<AtlasState>
    }),
  setYearMax: (y) => set({ yearMax: y }),
  setSearch: (search) => set({ search }),
  setColorDim: (colorDim) => set({ colorDim }),
  setShowAssets: (showAssets) => set({ showAssets }),
  setShowLinks: (showLinks) => set({ showLinks }),
  setLens: (lens) => set({ lens }),
  select: (selected) => set({ selected }),
  openDerivation: (metric, arg) => set({ derivation: { metric, arg } }),
  closeDerivation: () => set({ derivation: null }),
  setLoadFactor: (loadFactor) => set({ loadFactor }),
  setPue: (pue) => set({ pue }),
  selectModel: (selectedModel) => set({ selectedModel }),
  reset: () => set({ ...emptyFilters }),
  activeFilterCount: () => {
    const s = get()
    return (
      s.operators.length +
      s.statuses.length +
      s.states.length +
      s.isos.length +
      s.fuels.length +
      s.vendors.length +
      (s.search.trim() ? 1 : 0) +
      (s.yearMax < YEAR_MAX ? 1 : 0)
    )
  },
}))
