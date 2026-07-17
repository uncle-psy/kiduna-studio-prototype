import Link from 'next/link'

export default function FeaturedCard({
  badge,
  tag,
  title,
  description,
  members,
  treasury,
  href,
}: {
  badge: string
  tag: string
  title: string
  description: string
  members: string
  treasury: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group block bg-surface border border-border rounded-[14px] overflow-hidden transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5"
    >
      {/* Top — badge circle on radial gradient */}
      <div
        className="h-[130px] relative flex items-center justify-center"
        style={{
          background:
            'radial-gradient(circle at 50% 32%, #100E59, #09073A 70%)',
        }}
      >
        <div className="w-[60px] h-[60px] rounded-full bg-accent text-on-accent flex items-center justify-center font-display text-[1.4rem]">
          {badge}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-[18px] pb-[22px]">
        <span className="text-[0.68rem] tracking-[0.14em] uppercase text-accent font-bold">
          {tag}
        </span>
        <h3 className="font-display font-normal text-[1.25rem] text-white mt-0 mb-[0.3rem] leading-[1.1]">
          {title}
        </h3>
        <p className="text-muted text-[0.9rem] mt-[0.7rem] mb-0">{description}</p>

        {/* Meta row */}
        <div className="flex gap-5 mt-4 pt-4 border-t border-border">
          <div>
            <span className="block font-display text-white text-[1.15rem]">
              {members}
            </span>
            <span className="text-[0.64rem] tracking-[0.12em] uppercase text-muted">
              Members
            </span>
          </div>
          <div>
            <span className="block font-display text-white text-[1.15rem]">
              {treasury}
            </span>
            <span className="text-[0.64rem] tracking-[0.12em] uppercase text-muted">
              Treasury
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
