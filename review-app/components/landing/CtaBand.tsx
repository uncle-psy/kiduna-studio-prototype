import Eyebrow from './ui/Eyebrow'
import DisplayHeading from './ui/DisplayHeading'
import GoldEmphasis from './ui/GoldEmphasis'
import ButtonGold from './ui/ButtonGold'
import RidgeMotif from './ui/RidgeMotif'

export default function CtaBand() {
  return (
    <section
      className="text-center py-[88px] relative overflow-hidden"
      style={{
        background: `
          radial-gradient(900px 380px at 50% -20%, rgba(234,170,0,0.20), transparent 60%),
          linear-gradient(135deg, #100E59, #09073A 80%)
        `,
      }}
    >
      <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
        <Eyebrow className="text-center mb-4">Register today</Eyebrow>
        <DisplayHeading as="h2" className="max-w-[20ch] mx-auto">
          Intelligent agents. Blockchain governance.{' '}
          <GoldEmphasis>A real legal home.</GoldEmphasis>
        </DisplayHeading>
        <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mx-auto mb-8">
          Build an organization designed for the age of AI, at internet scale
          and machine speed. Register a DUNA with the West Virginia Secretary of
          State and start building today.
        </p>
        <ButtonGold size="lg" href="/start">
          Start a DUNA
        </ButtonGold>
      </div>
      <RidgeMotif />
    </section>
  )
}
