import Link from 'next/link'
import type { PersonDef } from '@/lib/allies-data'

export default function PersonCard({ p }: { p: PersonDef }) {
  return (
    <div
      className="flex flex-col bg-surface rounded-[14px] p-[22px] transition-all duration-150
        border-t border-r border-b border-l-4
        border-t-[rgba(255,255,255,0.12)] border-r-[rgba(255,255,255,0.12)] border-b-[rgba(255,255,255,0.12)] border-l-[#D4A017]
        hover:border-t-[#D4A017] hover:border-r-[#D4A017] hover:border-b-[#D4A017]
        focus-within:border-t-[#D4A017] focus-within:border-r-[#D4A017] focus-within:border-b-[#D4A017]
        hover:-translate-y-0.5"
    >
      {/* Head — avatar + name + role */}
      <div className="flex items-center gap-3 mb-3">
        <span className="w-11 h-11 shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center font-display text-[1rem]">
          {p.initials}
        </span>
        <div className="min-w-0">
          <h3
            className="font-display font-normal text-[1.15rem] text-white m-0 leading-[1.1] truncate"
            style={{ fontWeight: 700 }}
          >
            {p.name}
          </h3>
          <div className="text-[0.7rem] tracking-[0.08em] uppercase text-accent font-semibold truncate">
            {p.role}
          </div>
        </div>
      </div>

      {/* Bio — clamped to ~4 lines */}
      <p
        className="text-muted text-[0.92rem] m-0 mb-4 flex-1 leading-[1.55]"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {p.bio}
      </p>

      {/* Links */}
      <div className="border-t border-border pt-3 mb-4 space-y-[0.4rem]">
        {p.links.map((l) => (
          <div key={l.label} className="text-[0.82rem]">
            <span className="text-dim font-semibold mr-1 uppercase tracking-[0.04em] text-[0.72rem]">
              {l.label}
            </span>
            <span className="text-muted">{l.value}</span>
          </div>
        ))}
      </div>

      {/* Connect CTA */}
      <Link
        href="/login"
        className="self-start font-sans font-bold text-[0.8rem] py-[0.46rem] px-[1.05rem] rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 mt-auto"
      >
        Connect
      </Link>
    </div>
  )
}