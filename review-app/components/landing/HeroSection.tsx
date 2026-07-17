import Eyebrow from './ui/Eyebrow'
import DisplayHeading from './ui/DisplayHeading'
import GoldEmphasis from './ui/GoldEmphasis'
import ButtonGold from './ui/ButtonGold'
import ButtonGhost from './ui/ButtonGhost'
import StarDivider from './ui/StarDivider'
import RidgeMotif from './ui/RidgeMotif'

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden pt-[76px] pb-[120px]"
      style={{
        background: `
          radial-gradient(1100px 420px at 88% -10%, rgba(234,170,0,0.26), transparent 55%),
          radial-gradient(700px 500px at -8% 60%, rgba(3,204,217,0.14), transparent 60%),
          linear-gradient(135deg, #100E59, #09073A 80%)
        `,
      }}
    >
      <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
        <Eyebrow className="mb-5">
          WV DUNA <StarDivider />A BUSINESS, AN ASSOCIATION, AND A MOVEMENT ALL
          IN ONE.
        </Eyebrow>

        <DisplayHeading as="h1" className="max-w-[18ch]">
          Build an online organization powered by intelligent agents with{' '}
          <GoldEmphasis>identity, authority, and accountability.</GoldEmphasis>
        </DisplayHeading>

        <p className="font-display text-[clamp(1.2rem,2.2vw,1.7rem)] text-white mt-0 mb-[1.1rem]">
          Have an idea that will change the world? Let&apos;s go!
        </p>

        <p className="max-w-[60ch] text-[1.08rem] text-muted leading-[1.55]">
          A DUNA unlocks{' '}
          <strong className="text-white">agentic commerce</strong> by giving
          people and intelligent agents a trusted legal and economic framework
          for organizing, governing, and creating value together on the open
          internet.
        </p>

        <p className="max-w-[60ch] text-[1.08rem] text-muted leading-[1.55]">
          You don&apos;t need a board of directors, executive officers, a street
          address, technical skills, or a business plan. A DUNA operates
          completely online, combining legal standing, intelligent agents,{' '}
          <strong className="text-white">blockchain-based governance</strong>,
          and peer-to-peer commerce on the Solana network so people can
          organize, coordinate, and create value together at internet scale and
          machine speed.
        </p>

        <p className="max-w-[60ch] text-[1.08rem] text-muted leading-[1.55]">
          Every DUNA registered with the{' '}
          <strong className="text-white">
            West Virginia Secretary of State
          </strong>{' '}
          has a public legal home. Members know who they are working with.
          Agents know who they represent. Authority can be verified. Actions can
          be traced. Responsibility can be assigned. The result is a safer, more
          trustworthy foundation for agentic commerce on the open internet.
        </p>

        <p className="max-w-[60ch] text-[1.08rem] text-muted leading-[1.55]">
          Register your DUNA, recruit passionate members, activate your agents,
          and bring your vision to life.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <ButtonGold size="lg" href="/start">
            Register a DUNA
          </ButtonGold>
          <ButtonGhost size="lg" href="/learn-more">
            Go Deeper
          </ButtonGhost>
        </div>
      </div>

      <RidgeMotif />
    </section>
  )
}
