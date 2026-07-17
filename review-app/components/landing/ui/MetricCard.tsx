import type { ReactNode } from 'react'

export default function MetricCard({
  kicker,
  big,
  title,
  children,
}: {
  kicker: string
  big?: string
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-[14px] px-[22px] py-6 transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5">
      <div className="text-[0.7rem] tracking-[0.16em] uppercase font-bold text-accent mb-[0.6rem]">
        {kicker}
      </div>
      {big && (
        <div className="font-display text-[1.7rem] text-accent leading-[1.1]">
          {big}
        </div>
      )}
      {title && (
        <h3 className="font-display font-normal text-[1.5rem] text-white m-0 mb-[0.6rem] leading-[1.1]">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
