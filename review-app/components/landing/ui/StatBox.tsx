'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animated stat box — counts up from 0 to the target value on first view.
 * Handles formats like "8", "$151.3k", "$1.2M", "$50,325", "0".
 */
export default function StatBox({
  value,
  label,
}: {
  value: string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState(value)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || animated.current) return

    // Parse the value into prefix, number, suffix
    const parsed = parseValue(value)
    if (!parsed) return // can't parse — just show static

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true
          observer.disconnect()
          animateCount(parsed, setDisplay)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="stat-box px-6 py-[26px]">
      <div className="font-display text-[clamp(2rem,3.2vw,2.75rem)] text-white leading-none">
        {display}
      </div>
      <div className="mt-2 text-[0.72rem] tracking-[0.14em] uppercase text-muted font-bold">
        {label}
      </div>
    </div>
  )
}

type Parsed = {
  prefix: string   // "$" or ""
  target: number   // 151.3 or 8
  decimals: number // 1 or 0
  suffix: string   // "k", "M", or ""
}

function parseValue(raw: string): Parsed | null {
  // Match patterns like "$151.3k", "$1.2M", "$42.8M", "8", "0"
  const m = raw.match(/^(\$?)([\d,.]+)(k|M|%?)$/)
  if (!m) return null

  const prefix = m[1]
  const numStr = m[2].replace(/,/g, '')
  const target = parseFloat(numStr)
  if (isNaN(target)) return null

  const dotIdx = numStr.indexOf('.')
  const decimals = dotIdx >= 0 ? numStr.length - dotIdx - 1 : 0
  const suffix = m[3]

  return { prefix, target, decimals, suffix }
}

function animateCount(
  parsed: Parsed,
  setDisplay: (v: string) => void
) {
  const duration = 1200 // ms
  const start = performance.now()

  function frame(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)

    const current = eased * parsed.target
    const formatted = parsed.decimals > 0
      ? current.toFixed(parsed.decimals)
      : String(Math.round(current))

    setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`)

    if (progress < 1) {
      requestAnimationFrame(frame)
    }
  }

  requestAnimationFrame(frame)
}