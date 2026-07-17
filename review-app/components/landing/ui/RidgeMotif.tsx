export default function RidgeMotif({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/review/screens/images/landing/ridge-motif.svg"
      alt=""
      aria-hidden="true"
      className={`absolute left-0 right-0 bottom-0 w-full h-[180px] object-cover opacity-90 pointer-events-none z-0 ${className}`}
    />
  )
}
