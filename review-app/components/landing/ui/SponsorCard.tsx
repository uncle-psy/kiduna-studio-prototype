import Link from 'next/link'
import type { SponsorDef } from '@/lib/allies-data'

const DUNA_ROUTES: Record<string, string> = {
  'Appalachia Provisions': '/duna/prov',
  'Block Garden Charleston': '/duna/block',
  'Wheeling Opera House': '/duna/opra',
  'New River Land Trust': '/duna/nrlt',
  'Rhododendron AI': '/duna/rhodo',
  'Mountain Mesh': '/duna/mesh',
  'Holler Health': '/duna/hlth',
  'Service Alliance': '/duna/srva',
  'WV Commerce Club': '/duna/wvcc',
  'Appalachian Power Co-op': '/duna/apc',
}

export default function SponsorCard({ s }: { s: SponsorDef }) {
  const dunaNames = s.sponsoring.split(',').map((n) => n.trim())

  return (
    <div className="flex flex-col bg-surface border border-border rounded-[14px] p-[22px] transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5">
      {/* Head — logo + kicker + name */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-11 h-11 shrink-0 rounded-[10px] flex items-center justify-center font-display text-[1rem] text-on-accent"
          style={{ backgroundColor: s.color }}
        >
          {s.initials}
        </span>
        <div>
          <div className="text-[0.68rem] tracking-[0.14em] uppercase text-accent font-bold">
            {s.kicker}
          </div>
          <h3 className="font-display font-normal text-[1.15rem] text-white m-0 leading-[1.1]">
            {s.name}
          </h3>
        </div>
      </div>

      {/* Bio */}
      <p className="text-muted text-[0.92rem] m-0 mb-4 flex-1">{s.bio}</p>

      {/* Sponsoring — with clickable DUNA links */}
      <div className="border-t border-border pt-3 text-[0.82rem]">
        <span className="text-dim font-semibold mr-1">Sponsoring</span>
        {dunaNames.map((name, i) => {
          const href = DUNA_ROUTES[name]
          return (
            <span key={name}>
              {i > 0 && ', '}
              {href ? (
                <Link href={href} className="text-skyblue hover:text-white transition-colors">
                  {name}
                </Link>
              ) : (
                <span className="text-muted">{name}</span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}