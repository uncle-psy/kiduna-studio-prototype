"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentMarket } from "@/lib/market-context";
import { Icon } from "@iconify/react";

export function MarketSwitcher() {
  const { markets, current, setCurrentId, loading, error } = useCurrentMarket();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const summary = current.id === "__loading__"
    ? ""
    : `${current.memberCount} member${current.memberCount !== 1 ? "s" : ""} · ${current.openProposalsCount} open`;

  return (
    <div className="relative mb-3 md:max-lg:hidden" ref={wrapRef}>
      {/* Trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-full p-3 border border-card-border rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer flex justify-between items-center text-left"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Current Market</div>
          <div className="text-sm font-bold text-white mt-0.5 truncate">
            {loading ? "Loading..." : current.name}
          </div>
          {!loading && summary && <div className="text-[11px] text-muted mt-0.5">{summary}</div>}
          {error && <div className="text-[11px] text-red-400 mt-0.5">{error}</div>}
        </div>
        <Icon icon="lucide:chevron-down" width={14} height={14} className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-white/[0.18] rounded-xl p-1.5 shadow-2xl z-50">
          {markets.length === 0 && !loading && (
            <div className="px-3 py-2.5 text-sm text-muted/50">No markets yet</div>
          )}
          {markets.map((m) => (
            <button key={m.id}
              onClick={() => { setCurrentId(m.id); setOpen(false); }}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left ${
                m.id === current.id ? "bg-accent/[0.08]" : "hover:bg-white/[0.06]"
              }`}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{m.name}</div>
                <div className="text-[10px] font-mono tracking-wider uppercase text-muted">
                  {m.memberCount} member{m.memberCount !== 1 ? "s" : ""}
                </div>
              </div>
              {m.id === current.id && (
                <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
              )}
            </button>
          ))}
          <div className="h-px bg-card-border my-1.5 mx-1" />
          <a href="/markets/create?new=1"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-accent text-sm font-medium hover:bg-accent/[0.08] transition-colors no-underline cursor-pointer">
            <Icon icon="lucide:plus" width={14} height={14} />
            Create new Market
          </a>
        </div>
      )}
    </div>
  );
}