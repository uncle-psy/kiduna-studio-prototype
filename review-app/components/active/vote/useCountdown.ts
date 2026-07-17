'use client'

import { useEffect, useState } from 'react'

/**
 * Countdown to an ISO timestamp. Ticks every second, clamps at 0.
 * Mirrors the Timer.periodic countdown in vote_screen.dart.
 */
export function useCountdown(closesAt: string | null | undefined): {
  remainingMs: number
  expired: boolean
} {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    closesAt ? Math.max(0, new Date(closesAt).getTime() - Date.now()) : 0
  )

  useEffect(() => {
    if (!closesAt) return
    const target = new Date(closesAt).getTime()
    if (Number.isNaN(target)) return

    const tick = () => setRemainingMs(Math.max(0, target - Date.now()))
    tick()
    const id = setInterval(() => {
      const left = target - Date.now()
      setRemainingMs(Math.max(0, left))
      if (left <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  return { remainingMs, expired: !!closesAt && remainingMs <= 0 }
}

/** "Xd Yh Zm" / "Xh Ym Zs" / "Xm Ys" — mirrors _countdownText. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Ended'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

/** Progress 0..1 between openedAt and closesAt — mirrors _countdownBar. */
export function countdownProgress(
  openedAt: string | null | undefined,
  closesAt: string | null | undefined
): number {
  if (!openedAt || !closesAt) return 0
  const opened = new Date(openedAt).getTime()
  const closes = new Date(closesAt).getTime()
  if (Number.isNaN(opened) || Number.isNaN(closes)) return 0
  const total = closes - opened
  if (total <= 0) return 0
  const elapsed = Date.now() - opened
  return Math.min(1, Math.max(0, elapsed / total))
}
