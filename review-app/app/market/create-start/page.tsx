"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { proposalTypesFor } from "@/lib/proposal-types";
import { useCurrentMarket } from "@/lib/market-context";
import { AdminPageGate } from "@/components/market/AdminOnly";

const KIND_ICONS: Record<string, string> = {
  spend: "lucide:banknote", param: "lucide:sliders-horizontal",
  mint: "lucide:coins", metadata: "lucide:file-edit",
  liquidity: "lucide:waves", perf: "lucide:trophy",
};

const KIND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  spend: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  param: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  mint: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  metadata: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  liquidity: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  perf: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
};

function ChooserInner() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const types = proposalTypesFor();

  // When market switches (via sidebar) AFTER the page is already open, redirect to dashboard.
  // A ref tracks the market the component mounted with so the first render never triggers a redirect.
  const mountedMarketRef = useRef<string | null>(null);
  const marketId = current?.id;
  useEffect(() => {
    // Skip placeholder / initial load
    if (!marketId || marketId === "__loading__") return;

    if (mountedMarketRef.current === null) {
      // First valid market id after mount — just record it, don't compare.
      mountedMarketRef.current = marketId;
      return;
    }

    // Market changed while the page was open — redirect to dashboard.
    if (mountedMarketRef.current !== marketId) {
      router.replace("/market");
    }
  }, [marketId, router]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">What kind of decision?</h1>
          <p className="text-muted mt-1">Pick what you want to authorize. Each type has its own form with only the fields it needs.</p>
        </div>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {types.map((t) => {
          const colors = KIND_COLORS[t.id] || KIND_COLORS.spend;
          const icon = KIND_ICONS[t.id] || "lucide:file-text";

          return (
            <Link key={t.id} href={t.route}
              className={`bg-card border border-card-border rounded-xl p-5 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer no-underline group`}>
              <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                <Icon icon={icon} width={22} height={22} className={colors.text} />
              </div>
              <h3 className="text-white font-bold text-sm mb-1 group-hover:text-accent transition-colors">{t.name}</h3>
              <p className="text-xs text-muted/60 leading-relaxed">{t.hint}</p>
            </Link>
          );
        })}
      </div>

      {/* Explainer */}
      <div className="p-5 rounded-2xl border border-accent/20 bg-accent/[0.04]">
        <h3 className="text-white font-bold text-sm mb-2">How proposal creation works</h3>
        <div className="text-muted text-sm leading-relaxed space-y-2">
          <p>
            Every type follows the same flow: tell the story, define the action, set the market parameters.
            What differs is the middle — a spending proposal asks about recipients; a metadata change asks
            for the new name and image; a performance grant asks about vesting conditions.
          </p>
          <p>
            In v1 only Sponsors (you) can author proposals. Citizens participate in any open market through their Electors.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AdminPageGate>
      <ChooserInner />
    </AdminPageGate>
  );
}