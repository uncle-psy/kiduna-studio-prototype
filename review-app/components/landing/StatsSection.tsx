import SectionWrapper from './ui/SectionWrapper'
import StatBox from './ui/StatBox'
import { STATS } from '@/lib/landing-data'

export default function StatsSection() {
  return (
    <SectionWrapper tight>
      {/* Inline style block for stat-box border logic — cleaner than arbitrary Tailwind on each child */}
      <style>{`
        .stats-grid .stat-box { border-right: 1px solid rgba(255,255,255,0.12); }
        .stats-grid .stat-box:last-child { border-right: 0; }
        @media (max-width: 920px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-grid .stat-box:nth-child(2) { border-right: 0; }
        }
        @media (max-width: 560px) {
          .stats-grid { grid-template-columns: 1fr; }
          .stats-grid .stat-box { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
          .stats-grid .stat-box:last-child { border-bottom: 0; }
        }
      `}</style>
      <div
        className="stats-grid grid grid-cols-4 border border-border rounded-[14px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #100E59, #0A0D33)',
        }}
      >
        {STATS.map((stat) => (
          <StatBox key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>
      <p className="mt-3.5 text-[0.82rem] text-muted">
        Sample figures shown for this draft. Live counts read from the West
        Virginia business registry and on-chain treasuries at launch.
      </p>
    </SectionWrapper>
  )
}
