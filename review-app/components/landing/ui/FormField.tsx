import type { InputHTMLAttributes, ReactNode } from 'react'

export default function FormField({
  label,
  required,
  children,
}: {
  label: ReactNode
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="mb-[1.05rem]">
      <label className="block font-semibold text-[0.88rem] mb-[0.75rem] text-white">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full py-[0.78rem] px-4 rounded-[8px] bg-bg-deep border border-border text-white font-sans text-[1rem] focus:outline-none focus:border-accent ${props.className ?? ''}`}
    />
  )
}
