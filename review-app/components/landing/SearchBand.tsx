export default function SearchBand() {
  return (
    <section className="bg-bg-deep border-b border-border py-3.5 relative z-40">
      <div className="w-full max-w-[1180px] mx-auto px-6">
        <div className="relative max-w-[680px]">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-[1.1rem] pointer-events-none"
            aria-hidden="true"
          >
            ⌕
          </span>
          <input
            type="search"
            readOnly
            tabIndex={-1}
            placeholder="Search the DUNAVERSE — DUNAs, members, founders, the Act…"
            className="w-full py-[0.95rem] pr-4 pl-[2.7rem] rounded-[10px] border border-border-strong text-white font-sans text-[1rem] cursor-default focus:outline-none"
            style={{
              background: 'rgba(10, 13, 51, 0.85)',
              backdropFilter: 'blur(6px)',
            }}
          />
        </div>
      </div>
    </section>
  )
}
