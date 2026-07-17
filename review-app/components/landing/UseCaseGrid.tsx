import SectionWrapper from './ui/SectionWrapper'
import SectionHead from './ui/SectionHead'
import GoldEmphasis from './ui/GoldEmphasis'
import StarDivider from './ui/StarDivider'
import UseCaseCard from './ui/UseCaseCard'
import { USE_CASES } from '@/lib/landing-data'

export default function UseCaseGrid() {
  return (
    <SectionWrapper>
      <SectionHead
        eyebrow={
          <>
            About the form <StarDivider /> Organizing in the age of AI
          </>
        }
        title={
          <>
            What can <GoldEmphasis>a DUNA do?</GoldEmphasis>
          </>
        }
        lede="The same legal form supporting protocol treasuries, global token raises, and fleets of autonomous agents also fits a farmer's market, a social movement, or a city-wide wireless network. A few patterns worth exploring:"
      />
      <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
        {USE_CASES.map((uc) => (
          <UseCaseCard key={uc.title} {...uc} />
        ))}
      </div>
    </SectionWrapper>
  )
}
