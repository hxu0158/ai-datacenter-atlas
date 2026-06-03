import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAtlas } from '../store'
import { datacenters, powerAssets } from './data'
import { applyFilters, filterAssets } from './aggregate'

/** Single source of truth for "what's currently visible" given the filters. */
export function useFiltered() {
  const f = useAtlas(
    useShallow((s) => ({
      operators: s.operators,
      statuses: s.statuses,
      states: s.states,
      isos: s.isos,
      fuels: s.fuels,
      vendors: s.vendors,
      yearMax: s.yearMax,
      search: s.search,
    })),
  )
  return useMemo(() => {
    const dcs = applyFilters(datacenters, f)
    const ids = new Set(dcs.map((d) => d.id))
    const assets = filterAssets(powerAssets, f, ids)
    return { dcs, assets, ids, filters: f }
  }, [f])
}
