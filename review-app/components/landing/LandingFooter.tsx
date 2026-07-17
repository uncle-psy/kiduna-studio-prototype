import Link from 'next/link'
import Image from 'next/image'

export default function LandingFooter({ variant = 'default' }: { variant?: 'home' | 'default' }) {
  return (
    <footer className="border-t border-border bg-bg-deep pt-14 pb-9 mt-10">
      <div className="w-full max-w-[1180px] mx-auto px-6">
        {/* Grid */}
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] max-md:grid-cols-2 max-sm:grid-cols-1 gap-8">
          {/* Brand column */}
          <div>
            <Link href="/">
              <Image
                src="/review/screens/assets/kiduna-logo.svg"
                alt="Kiduna Club"
                width={160}
                height={38}
                className="h-[38px] w-auto mb-1.5"
              />
            </Link>
            <p className="text-muted mt-2.5 max-w-[42ch] text-[0.97rem] leading-[1.6]">
              Software as big as the world. A global on-ramp to the agentic economy, run through your very own
              member-governed internet-native organization registered in the state of West Virginia, with legal
              standing all around the world.
            </p>
            <p className="text-muted text-[0.85rem] mt-3">
              Powered by{' '}
              <a
                href="https://kinship.institute"
                target="_blank"
                rel="noopener"
                className="text-white/60 font-semibold hover:text-white transition-colors"
              >
                Kinship Intelligence™
              </a>
              , Put your Good where it Does the Most.
            </p>
            <a
              href="https://kinship.institute"
              target="_blank"
              rel="noopener"
              className="inline-block mt-2 text-[0.9rem] font-normal text-white/75 hover:text-white transition-colors"
            >
              Learn more ↗
            </a>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-sans text-[0.72rem] tracking-[0.16em] uppercase text-[#EAAA00] m-0 mb-4 font-normal">
              Explore
            </h4>
            <Link href="/showcase" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">Showcase</Link>
            <Link href="/#earn" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">How to Earn</Link>
            <Link href="/how-it-works" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">How it Works</Link>
            <Link href="/#events" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">Events</Link>
            <Link href="/#about" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">About</Link>
            <Link href="/nightpapers" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">Nightpapers</Link>
          </div>

          {/* Get started */}
          <div>
            <h4 className="font-sans text-[0.72rem] tracking-[0.16em] uppercase text-[#EAAA00] m-0 mb-4 font-normal">
              Get started
            </h4>
            <Link href="/#contact" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">Join Early Access</Link>
            <Link href="/login" className="block text-[rgba(255,255,255,0.80)] font-[500] my-[0.4rem] hover:text-white transition-colors">Login</Link>
            <h4 className="font-sans text-[0.72rem] tracking-[0.16em] uppercase text-[#EAAA00] mt-4 mb-4 font-normal">
              Our Communities
            </h4>
            <span className="block text-white/80 font-medium my-[0.4rem]">Bluesky</span>
            <span className="block text-white/80 font-medium my-[0.4rem]">Telegram</span>
            <span className="block text-white/80 font-medium my-[0.4rem]">YouTube</span>
          </div>

          {/* About the Institute */}
          <div>
            <h4 className="font-sans text-[0.72rem] tracking-[0.16em] uppercase text-[#EAAA00] m-0 mb-4 font-normal">
              About the Institute
            </h4>
            <p className="text-muted text-[0.85rem] max-w-[34ch] m-0 mb-3">
              <a
                href="https://kinship.institute"
                target="_blank"
                rel="noopener"
                className="text-white font-normal hover:font-bold hover:text-white transition-colors"
              >
                Kinship Intelligence Institute
              </a>{' '}
              is an independent 501(c)(3) ensuring the agentic AI era serves
              the wellbeing, autonomy, and prosperity of people and communities
              the market would otherwise pass over.
            </p>
            <a
              href="https://kinship.institute"
              target="_blank"
              rel="noopener"
              className="text-[0.95rem] font-[500] text-white/60 hover:text-white transition-colors"
            >
              Learn more ↗
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-[22px] border-t border-border flex justify-between flex-wrap gap-4 text-muted text-[0.85rem]">
          <span>© 2026 Kiduna Club™, all rights reserved. Patent Pending.</span>
          <span className="text-[0.78rem] text-white/50">
            <Link href="/tos" className="text-white/50 hover:text-white/70">Terms of Service</Link>
            {' · '}
            <Link href="/privacy" className="text-white/50 hover:text-white/70">Privacy Policy</Link>
          </span>
        </div>
      </div>
    </footer>
  )
}