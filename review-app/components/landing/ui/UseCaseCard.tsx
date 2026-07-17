export default function UseCaseCard({
  kicker,
  title,
  body,
}: {
  kicker: string
  title: string
  body: string
}) {
  return (
    <div className="relative bg-surface border border-border rounded-[14px] px-[22px] py-6 transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5">
      <div className="text-[0.7rem] tracking-[0.16em] uppercase font-bold text-accent mb-[0.6rem]">
        {kicker}
      </div>
      <h3 className="font-display font-normal text-[1.5rem] text-white m-0 mb-[0.6rem] leading-[1.1]">
        {title}
      </h3>
      <p className="text-muted text-[0.96rem] m-0">{body}</p>
    </div>
  )
}
