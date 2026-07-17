'use client'

import React, { useState } from 'react'

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
    <path d="M9.4 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a16.6 16.6 0 0 1-3.6 4.3" />
    <path d="M6.1 6.1A16.4 16.4 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.3-.56" />
  </svg>
)

export default function PasswordField({
  id,
  placeholder = '••••••••',
  value,
  onChange,
  maxLength,
}: {
  id: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  maxLength?: number
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete="new-password"
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full py-[0.78rem] px-4 pr-[2.8rem] rounded-[8px] bg-bg-deep border border-border text-white font-sans text-[1rem] focus:outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-0 p-[0.3rem] cursor-pointer text-dim hover:text-white inline-flex items-center justify-center"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
