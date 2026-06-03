import { useEffect, useMemo, useState } from 'react'
import type { GeoJsonObject } from 'geojson'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, GeoJSON, Pane, useMap } from 'react-leaflet'
import { useAtlas } from '../store'
import { useFiltered } from '../lib/useFiltered'
import type { EnrichedDataCenter } from '../lib/data'
import { STATUS_COLOR, FUEL_COLOR, OPERATOR_COLOR, ASSET_TYPE_COLOR } from '../lib/colors'
import { fmtMW, STATUS_LABEL, titleCase } from '../lib/format'
import Legend from './Legend'

function campusColor(d: EnrichedDataCenter, dim: string): string {
  if (dim === 'operator') return OPERATOR_COLOR[d.group] ?? '#a78bfa'
  if (dim === 'fuel') return FUEL_COLOR[d.power.primary_fuel] ?? '#94a3b8'
  return STATUS_COLOR[d.status]
}

function radiusFor(mw: number): number {
  return Math.max(6.5, Math.min(34, Math.sqrt(mw) * 0.46))
}

/** Keeps Leaflet in sync when its container is resized (e.g. the draggable split). */
function AutoResize() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

export default function MapView() {
  const { dcs, assets } = useFiltered()
  const colorDim = useAtlas((s) => s.colorDim)
  const showAssets = useAtlas((s) => s.showAssets)
  const showLinks = useAtlas((s) => s.showLinks)
  const select = useAtlas((s) => s.select)
  const selected = useAtlas((s) => s.selected)

  // US state outline (bundled in /public) so geography is visible even if tiles fail to load.
  const [usStates, setUsStates] = useState<GeoJsonObject | null>(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}us-states.json`)
      .then((r) => r.json())
      .then(setUsStates)
      .catch(() => {})
  }, [])

  const dcById = useMemo(() => new Map(dcs.map((d) => [d.id, d])), [dcs])
  // Draw largest bubbles first so smaller campuses land on top and stay visible in clusters.
  const sortedDcs = useMemo(
    () => [...dcs].sort((a, b) => b.capacity.mw_it_full - a.capacity.mw_it_full),
    [dcs],
  )

  const links = useMemo(() => {
    if (!showLinks || !showAssets) return []
    const out: { from: [number, number]; to: [number, number]; key: string }[] = []
    assets.forEach((a) => {
      a.linked_campus_ids.forEach((id) => {
        const dc = dcById.get(id)
        if (dc) {
          out.push({
            from: [a.location.lat, a.location.lng],
            to: [dc.location.lat, dc.location.lng],
            key: `${a.id}-${id}`,
          })
        }
      })
    })
    return out
  }, [assets, dcById, showLinks, showAssets])

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[38.5, -96]}
        zoom={4}
        minZoom={3}
        scrollWheelZoom
        className="h-full w-full"
        worldCopyJump
      >
        <AutoResize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemap.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Pinned to a low pane (z 250: above tiles@200, below vectors@400) so the
            async-loaded state fill never paints over the bubbles. */}
        <Pane name="us-states" style={{ zIndex: 250 }}>
          {usStates && (
            <GeoJSON
              data={usStates}
              interactive={false}
              style={() => ({
                color: '#3a526b',
                weight: 0.8,
                fillColor: '#101a28',
                fillOpacity: 0.6,
              })}
            />
          )}
        </Pane>

        {links.map((l) => (
          <Polyline
            key={l.key}
            positions={[l.from, l.to]}
            pathOptions={{ color: '#a3e635', weight: 1, opacity: 0.35, dashArray: '4 5' }}
          />
        ))}

        {showAssets &&
          assets.map((a) => {
            const isSel = selected?.kind === 'asset' && selected.id === a.id
            return (
              <CircleMarker
                key={a.id}
                center={[a.location.lat, a.location.lng]}
                radius={Math.max(4, Math.min(20, Math.sqrt(a.capacity_mw) * 0.32))}
                pathOptions={{
                  color: ASSET_TYPE_COLOR[a.type],
                  weight: isSel ? 3 : 1.5,
                  fillColor: ASSET_TYPE_COLOR[a.type],
                  fillOpacity: 0.32,
                  opacity: 0.9,
                  dashArray: '3 3',
                }}
                eventHandlers={{ click: () => select({ kind: 'asset', id: a.id }) }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <div className="text-xs">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-slate-300">
                      {a.type.replace(/_/g, ' ')} · {fmtMW(a.capacity_mw)}
                      {a.offtaker ? ` · ${a.offtaker}` : ''}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}

        {sortedDcs.map((d) => {
          const color = campusColor(d, colorDim)
          const isSel = selected?.kind === 'dc' && selected.id === d.id
          return (
            <CircleMarker
              key={d.id}
              center={[d.location.lat, d.location.lng]}
              radius={radiusFor(d.capacity.mw_it_full)}
              pathOptions={{
                // light rim so every bubble's edge reads against the dark map,
                // and a bright fill so the color is legible (not a muddy blob).
                color: isSel ? '#ffffff' : '#e2e8f0',
                weight: isSel ? 3 : 1,
                opacity: isSel ? 1 : 0.75,
                fillColor: color,
                fillOpacity: 0.85,
              }}
              eventHandlers={{ click: () => select({ kind: 'dc', id: d.id }) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-slate-300">
                    {fmtMW(d.capacity.mw_it_full)} · {STATUS_LABEL[d.status]} · {d.grid.iso}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Map title / context */}
      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-md border border-ink-500/60 bg-ink-900/85 px-2.5 py-1.5 backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
          U.S. AI data-center map
        </div>
        <div className="text-[10px] text-slate-400">
          bubble = campus (size ∝ MW, color by {titleCase(colorDim)}) · click for detail
        </div>
      </div>

      <Legend campusCount={dcs.length} assetCount={showAssets ? assets.length : 0} />
    </div>
  )
}
