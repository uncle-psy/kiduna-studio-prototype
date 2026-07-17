import type { ReactNode } from 'react'
import Eyebrow from './Eyebrow'
import DisplayHeading from './DisplayHeading'

export default function SectionHead({
  eyebrow,
  title,
  lede,
  className = '',
}: {
  eyebrow: ReactNode
  title: ReactNode
  lede?: string
  className?: string
}) {
  return (
    <div className={`max-w-[760px] mb-10 ${className}`}>
      <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
      <DisplayHeading as="h2">{title}</DisplayHeading>
      {lede && (
        <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55]">
          {lede}
        </p>
      )}
    </div>
  )
}
