import type { ReactNode } from 'react'
import { X, ExternalLink, MapPin, Zap, Cpu, DollarSign, Calendar, Factory } from 'lucide-react'
import { useAtlas } from '../store'
import { datacenters, powerAssets } from '../lib/data'
import { impliedUnits, impliedSiliconB } from '../lib/aggregate'
import { STATUS_COLOR, FUEL_COLOR, ASSET_TYPE_COLOR, VENDOR_COLOR } from '../lib/colors'
import { fmtMW, fmtUSD, fmtUnits, STATUS_LABEL, FUEL_LABEL, titleCase } from '../lib/format'
import type { Confidence } from '../types'

const CONF_COLOR: Record<Confidence, string> = {
  high: '#34d399',
  medium: '#fbbf24',
  low: '#94a3b8',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ color, background: `${color}22`, border: `1px solid ${color}55` }}
    >
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-ink-600/60 pt-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      {children}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 text-xs">
      <span className="flex items-center gap-1.5 text-slate-400">
        {icon}
        {label}
      </span>
      <span className="tnum text-right text-slate-200">{value}</span>
    </div>
  )
}

function Sources({ urls }: { urls: string[] }) {
  if (!urls.length) return null
  return (
    <Section title="Sources">
      <div className="flex flex-col gap-1">
        {urls.map((u) => {
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
    </Section>
  )
}

export default function DetailDrawer() {
  const selected = useAtlas((s) => s.selected)
  const select = useAtlas((s) => s.select)
  if (!selected) return null

  const dc = selected.kind === 'dc' ? datacenters.find((d) => d.id === selected.id) : null
  const asset = selected.kind === 'asset' ? powerAssets.find((a) => a.id === selected.id) : null
  if (!dc && !asset) return null

  return (
    <div className="fixed right-0 top-0 z-[1000] flex h-screen w-[360px] max-w-[85vw] flex-col overflow-y-auto border-l border-ink-500/70 bg-ink-900/95 shadow-2xl backdrop-blur">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-ink-600/70 bg-ink-900/95 p-3">
        <div className="flex-1">
          <div className="text-sm font-semibold leading-snug text-slate-100">
            {dc ? dc.name : asset!.name}
          </div>
          <div className="text-[11px] text-slate-400">{dc ? dc.operator : asset!.owner}</div>
        </div>
        <button
          onClick={() => select(null)}
          className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {dc && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge label={STATUS_LABEL[dc.status]} color={STATUS_COLOR[dc.status]} />
              <Badge label={FUEL_LABEL[dc.power.primary_fuel]} color={FUEL_COLOR[dc.power.primary_fuel]} />
              <Badge label={dc.grid.iso} color="#60a5fa" />
              <Badge label={`${dc.confidence} confidence`} color={CONF_COLOR[dc.confidence]} />
            </div>

            <div>
              <Stat
                icon={<MapPin size={12} />}
                label="Location"
                value={`${dc.location.city}${dc.location.county ? `, ${dc.location.county} Co.` : ''}, ${dc.location.state}`}
              />
              <Stat icon={<Factory size={12} />} label="Utility / grid" value={dc.grid.utility ?? dc.grid.iso} />
            </div>

            <Section title="Capacity">
              <Stat icon={<Zap size={12} />} label="IT load (full build)" value={fmtMW(dc.capacity.mw_it_full)} />
              {dc.capacity.mw_total_facility && (
                <Stat label="Total facility" value={fmtMW(dc.capacity.mw_total_facility)} />
              )}
              <Stat
                icon={<Cpu size={12} />}
                label="Implied accelerators"
                value={fmtUnits(impliedUnits(dc))}
              />
              <Stat label="Implied silicon $" value={fmtUSD(impliedSiliconB(dc))} />
            </Section>

            <Section title="Silicon">
              <Stat
                label="Primary vendor"
                value={
                  <span className="flex items-center justify-end gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: VENDOR_COLOR[dc.silicon.primary_vendor] }}
                    />
                    {dc.silicon.primary_vendor}
                  </span>
                }
              />
              {dc.silicon.chip && <Stat label="Accelerator" value={dc.silicon.chip} />}
              {dc.cooling && <Stat label="Cooling" value={titleCase(dc.cooling)} />}
            </Section>

            <Section title="Timeline & capex">
              {dc.timeline.announced && (
                <Stat icon={<Calendar size={12} />} label="Announced" value={dc.timeline.announced} />
              )}
              {dc.timeline.first_power_year && (
                <Stat label="First power" value={dc.timeline.first_power_year} />
              )}
              {dc.timeline.full_buildout_year && (
                <Stat label="Full buildout" value={dc.timeline.full_buildout_year} />
              )}
              <Stat icon={<DollarSign size={12} />} label="Investment" value={fmtUSD(dc.investment_usd_b)} />
              {dc.investment_usd_b != null && dc.capacity.mw_it_full > 0 && (
                <Stat
                  label="Capex intensity"
                  value={`$${((dc.investment_usd_b * 1000) / dc.capacity.mw_it_full).toFixed(1)}/W`}
                />
              )}
            </Section>

            <Section title="Power supply">
              {dc.power.behind_the_meter != null && (
                <Stat label="Behind-the-meter" value={dc.power.behind_the_meter ? 'Yes' : 'No'} />
              )}
              <div className="mt-1 flex flex-col gap-1">
                {dc.power.sources.map((s, i) => (
                  <div key={i} className="rounded bg-ink-800/60 px-2 py-1 text-[11px]">
                    <span className="font-medium text-slate-200">{titleCase(s.type)}</span>
                    {s.mw ? <span className="tnum text-slate-400"> · {fmtMW(s.mw)}</span> : ''}
                    {s.detail && <div className="text-slate-500">{s.detail}</div>}
                  </div>
                ))}
              </div>
              {dc.power.ppas.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {dc.power.ppas.map((p, i) => (
                    <div key={i} className="rounded border border-lime-500/30 bg-lime-500/5 px-2 py-1 text-[11px]">
                      PPA: {p.counterparty}
                      {p.asset ? ` — ${p.asset}` : ''} {p.mw ? `· ${fmtMW(p.mw)}` : ''}
                      {p.term_years ? ` · ${p.term_years}y` : ''}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {(dc.tenants.length > 0 || dc.partners.length > 0) && (
              <Section title="Players">
                {dc.tenants?.length > 0 && (
                  <Stat label="Tenants" value={dc.tenants.join(', ')} />
                )}
                {dc.partners?.length > 0 && (
                  <Stat label="Partners" value={dc.partners.join(', ')} />
                )}
              </Section>
            )}

            {dc.notes && (
              <Section title="Analyst note">
                <p className="text-[11px] leading-relaxed text-slate-300">{dc.notes}</p>
              </Section>
            )}

            <Sources urls={dc.sources} />
          </>
        )}

        {asset && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge label={titleCase(asset.type)} color={ASSET_TYPE_COLOR[asset.type]} />
              <Badge label={STATUS_LABEL[asset.status]} color={STATUS_COLOR[asset.status]} />
              <Badge label={asset.iso} color="#60a5fa" />
              <Badge label={`${asset.confidence} confidence`} color={CONF_COLOR[asset.confidence]} />
            </div>

            <Section title="Asset">
              <Stat icon={<Zap size={12} />} label="Capacity" value={fmtMW(asset.capacity_mw)} />
              <Stat
                icon={<MapPin size={12} />}
                label="Location"
                value={`${asset.location.city}, ${asset.location.state}`}
              />
              <Stat label="Owner" value={asset.owner} />
              {asset.offtaker && <Stat label="Offtaker" value={asset.offtaker} />}
              {asset.online_year && (
                <Stat icon={<Calendar size={12} />} label="Online" value={asset.online_year} />
              )}
              {asset.investment_usd_b ? (
                <Stat icon={<DollarSign size={12} />} label="Investment" value={fmtUSD(asset.investment_usd_b)} />
              ) : null}
              {asset.ppa?.type && <Stat label="Structure" value={asset.ppa.type} />}
              {asset.ppa?.term_years && <Stat label="Term" value={`${asset.ppa.term_years} years`} />}
            </Section>

            {asset.linked_campus_ids.length > 0 && (
              <Section title="Powers">
                <div className="flex flex-col gap-1">
                  {asset.linked_campus_ids.map((id) => {
                    const c = datacenters.find((d) => d.id === id)
                    if (!c) return null
                    return (
                      <button
                        key={id}
                        onClick={() => select({ kind: 'dc', id })}
                        className="rounded bg-ink-800/60 px-2 py-1 text-left text-[11px] text-accent hover:bg-ink-700"
                      >
                        {c.name} · {fmtMW(c.capacity.mw_it_full)}
                      </button>
                    )
                  })}
                </div>
              </Section>
            )}

            {asset.notes && (
              <Section title="Analyst note">
                <p className="text-[11px] leading-relaxed text-slate-300">{asset.notes}</p>
              </Section>
            )}

            <Sources urls={asset.sources} />
          </>
        )}
      </div>
    </div>
  )
}
