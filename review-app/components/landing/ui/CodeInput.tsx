'use client'

import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'

export default function CodeInput({ digits = 6 }: { digits?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = useCallback(
    (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 1)
      e.target.value = v
      if (v && refs.current[i + 1]) refs.current[i + 1]?.focus()
    },
    []
  )

  const handleKey = useCallback(
    (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !e.currentTarget.value && refs.current[i - 1]) {
        refs.current[i - 1]?.focus()
      }
    },
    []
  )

  return (
    <div className="flex gap-2">
      {Array.from({ length: digits }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          className="flex-1 min-w-0 text-center font-display text-[1.5rem] py-[0.6rem] rounded-[8px] bg-surface border border-border text-white focus:outline-none focus:border-accent"
        />
      ))}
    </div>
  )
}
