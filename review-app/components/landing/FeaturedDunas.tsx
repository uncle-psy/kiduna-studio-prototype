import SectionWrapper from './ui/SectionWrapper'
import SectionHead from './ui/SectionHead'
import FeaturedCard from './ui/FeaturedCard'
import StarDivider from './ui/StarDivider'
import { FEATURED_DUNAS } from '@/lib/landing-data'

export default function FeaturedDunas() {
  return (
    <SectionWrapper>
      <SectionHead
        eyebrow={
          <>
            Global missions <StarDivider /> On the registry
          </>
        }
        title="Featured DUNAs"
        lede="Real legal entities, supporting entrepreneurs, alliances, and movements around the world, registered with the West Virginia Secretary of State, running mission-driven work online."
      />
      <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
        {FEATURED_DUNAS.map((duna) => (
          <FeaturedCard key={duna.title} {...duna} />
        ))}
      </div>
    </SectionWrapper>
  )
}
