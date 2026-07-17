"use client";

/**
 * Step 4 — Review & Launch.
 *
 * Reads tokenConfig from shared context, displays actual values,
 * and wires the Launch button to useLaunchMarket.
 */

import Link from "next/link";
import { Suspense } from "react";
import { Annote, Badge, Button, Card, Explainer, SectionCap } from "@/components/ui/index";
import { useRouter } from "next/navigation";
import { useMarketCreate } from "@/lib/market-create-context";
import { useCurrentMarket } from "@/lib/market-context";
import { useLaunchMarket } from "@/lib/onchain/useLaunchMarket";

function PageInner() {
  const router = useRouter();
  const { tokenConfig } = useMarketCreate();
  const { current } = useCurrentMarket();
  const launch = useLaunchMarket(current?.slug ?? "");

  const tc = tokenConfig;
  const isNew = tc.mode === "new";

  const handleLaunch = async () => {
    if (!current?.slug) return;
    await launch.start();
  };

  return (
    <>
      <div className="pageheader">
        <div>
          <div className="crumbs">Markets / Create / <span className="text-accent-2">Step 4 · Review</span></div>
          <div className="pagetitle">Review &amp; launch.</div>
          <div className="pagedesc">Everything you&apos;ve set up. You can edit almost anything later.</div>
        </div>
      </div>

      <div className="step-rail">
        <Link href="/market/market-create/connect" className="step done"><span className="num">✓</span>Connect</Link>
        <Link href="/market/market-create" className="step done"><span className="num">✓</span>Basics</Link>
        <Link href="/market/market-create-3" className="step done"><span className="num">✓</span>Configure</Link>
        <div className="step active"><span className="num">4</span>Review</div>
      </div>

      <div className="grid-2">
        <div>
          {/* ── Token Identity ─────────────────────────────── */}
          <Card className="mb-[14px]">
            <SectionCap>TOKEN</SectionCap>
            <div className="font-display text-[22px] font-semibold">
              {tc.tokenName || "—"} {tc.ticker ? `(${tc.ticker})` : ""}
            </div>
            <div className="text-[13px] text-subtle mt-[2px]">
              {isNew ? "New token — will be minted at launch" : `Existing mint: ${tc.existingMint}`}
            </div>
            <div className="mt-[10px] grid grid-cols-3 gap-[8px] text-[11px]">
              <ReviewCell label="TOTAL SUPPLY" value={tc.totalSupply > 0 ? tc.totalSupply.toLocaleString() : "—"} />
              <ReviewCell label="DECIMALS" value={String(tc.decimals)} />
              <ReviewCell label="MODE" value={isNew ? "Mint new" : "Existing"} />
            </div>
          </Card>

          {/* ── Token Supply Allocation ─────────────────────── */}
          <Card className="mb-[14px]">
            <SectionCap>TOKEN SUPPLY ALLOCATION</SectionCap>
            <div className="mt-[6px] grid grid-cols-2 gap-[8px] text-[11px]">
              <ReviewCell label="SPONSOR RESERVE" value={`${tc.icoPct}%`} />
              <ReviewCell label="TEAM (VESTING)" value={`${tc.teamAllocPct}%`} />
              <ReviewCell label="DAMM V2 POOL" value={`${tc.poolPct}%`} />
              <ReviewCell label="FUTARCHY POOL" value={`${tc.futarchyPct}%`} />
            </div>
            {tc.totalSupply > 0 && (
              <div className="mt-[8px] text-[11px] text-muted">
                From {tc.totalSupply.toLocaleString()} tokens: pool gets{" "}
                {Math.floor(tc.totalSupply * tc.poolPct / 100).toLocaleString()}, treasury gets{" "}
                {Math.floor(tc.totalSupply * tc.icoPct / 100).toLocaleString()}.
              </div>
            )}
          </Card>

          {/* ── USDC Budget ────────────────────────────────── */}
          <Card className="mb-[14px]">
            <SectionCap>USDC BUDGET</SectionCap>
            <div className="font-display text-[18px] font-semibold mt-[4px]">
              {tc.maxRaise > 0 ? `${tc.maxRaise.toLocaleString()} USDC` : "—"}
            </div>
            <div className="mt-[8px] grid grid-cols-3 gap-[8px] text-[11px]">
              <ReviewCell label="POOL" value={`${tc.usdcPoolPct}% (${Math.floor(tc.maxRaise * tc.usdcPoolPct / 100).toLocaleString()})`} />
              <ReviewCell label="TREASURY" value={`${tc.usdcTreasuryPct}% (${Math.floor(tc.maxRaise * tc.usdcTreasuryPct / 100).toLocaleString()})`} />
              <ReviewCell label="FUTARCHY" value={`${tc.usdcFutarchyPct}% (${Math.floor(tc.maxRaise * tc.usdcFutarchyPct / 100).toLocaleString()})`} />
            </div>
          </Card>

          {/* ── Governance ─────────────────────────────────── */}
          <Card className="mb-[14px]">
            <SectionCap>GOVERNANCE</SectionCap>
            <div className="mt-[6px] grid grid-cols-2 gap-[8px] text-[11px]">
              <ReviewCell label="TRADING WINDOW" value={`${tc.launchPeriodDays} day${tc.launchPeriodDays !== 1 ? "s" : ""}`} />
              <ReviewCell label="SPENDING LIMIT" value={tc.spendingLimitEnabled ? `${tc.monthlyLimitUsdc.toLocaleString()} USDC/mo` : "Disabled"} />
              <ReviewCell label="LOCKUP" value={`${tc.lockupMonths} months`} />
              <ReviewCell label="VESTING STYLE" value={tc.vestingStyle.replace("_", " + ")} />
              <ReviewCell label="BID WALL" value={tc.enableBidWall ? "Enabled" : "Disabled"} />
              <ReviewCell label="RECIPIENTS" value={`${tc.recipients.length} wallet${tc.recipients.length !== 1 ? "s" : ""}`} />
            </div>
          </Card>
        </div>

        <div>
          <Explainer>
            <h4>What happens when you launch</h4>
            <p>Clicking Launch starts a 4-step on-chain flow: token mint (or verify existing), DAO creation on MetaDAO, Meteora pool creation, and liquidity + treasury seeding.</p>
            <p>Each step requires a wallet signature. If any step fails, you can resume from where you left off.</p>
          </Explainer>

          {/* Launch progress */}
          {launch.status !== "idle" && (
            <Card className="mt-[14px]">
              <SectionCap>LAUNCH PROGRESS</SectionCap>
              <div className="mt-[8px] text-[12px]">
                {launch.currentStep && (
                  <div className="text-subtle">Step {launch.currentStep} of 4</div>
                )}
                {launch.status === "building" && <div className="text-accent-2 mt-[4px]">Building transaction…</div>}
                {launch.status === "signing" && <div className="text-accent-2 mt-[4px]">Waiting for wallet signature…</div>}
                {launch.status === "submitting" && <div className="text-accent-2 mt-[4px]">Submitting to Solana…</div>}
                {launch.status === "complete" && <div className="text-pass mt-[4px]">✓ Launch complete!</div>}
                {launch.status === "error" && (
                  <div className="text-fail mt-[4px]">{launch.error}</div>
                )}
              </div>
            </Card>
          )}

          <Annote className="mt-[14px]">
            <b>Authorities are transferred at launch.</b> For new tokens, mint authority,
            freeze authority, and metadata update authority are all transferred to the
            DAO treasury vault in the final step. This is irreversible.
          </Annote>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button className="cursor-pointer" onClick={() => router.push("/market/market-create-3")}>← Back</Button>
        {launch.status === "complete" ? (
          <Button variant="primary" className="cursor-pointer" onClick={() => router.push("/market")}>
            Go to Market →
          </Button>
        ) : launch.status === "error" ? (
          <Button variant="primary" className="cursor-pointer" onClick={() => launch.retry()}>
            Retry step {launch.currentStep} →
          </Button>
        ) : (
          <Button
            variant="primary"
            className="cursor-pointer"
            onClick={handleLaunch}
            disabled={launch.isRunning || !current?.slug}
          >
            {launch.isRunning ? "Launching…" : "Launch Market ✨"}
          </Button>
        )}
      </div>
    </>
  );
}

function ReviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-[8px] bg-[rgba(255,255,255,0.02)] rounded-[6px]">
      <div className="font-mono text-[9px] text-muted tracking-[0.08em] uppercase">{label}</div>
      <div className="text-subtle mt-[2px]">{value}</div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}
