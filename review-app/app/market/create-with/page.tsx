"use client";

import Link from "next/link";
import { Annote, Button, Card, CardTitle, Explainer } from "@/components/ui/index";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader"><div><div className="crumbs"><Link href="/market/proposals">Proposals</Link> / New / Withdraw</div><div className="pagetitle">Withdraw to Sponsor.</div><div className="pagedesc">Pull funds back out. Strict mode — this requires a passing market.</div></div><Button size="sm" className="cursor-pointer" onClick={() => router.push("/market/create-start")}>← Change type</Button></div>
      <div className="at-header with"><div className="big-icon">↺</div><div><div className="at-h-title">Withdrawal</div><div className="at-h-desc">Funds leave the Market's treasury and return to your Sponsor wallet.</div></div></div>
      <div className="grid-2">
        <div>
          <Card className="mb-[14px]">
            <CardTitle>Story</CardTitle>
            <div className="field"><label>Title</label><input defaultValue="Withdraw Q1 surplus to Sponsor"/></div>
            <div className="field"><label>Reason (scrutinized by Citizens)</label><textarea rows={3}>Q1 reserves were over-funded by $15k. Pulling back for alternative use. Will re-deposit if Q2 cashflow requires.</textarea></div>
          </Card>
          <Card>
            <CardTitle>Amount</CardTitle>
            <div className="row-2">
              <div className="field"><label>Amount</label><input defaultValue="$15,000 USDC"/></div>
              <div className="field"><label>Destination</label><input defaultValue="Sponsor wallet" disabled/></div>
            </div>
            <div className="mt-[14px] p-[14px] bg-[rgba(239,68,68,0.06)] border-[1px] border-[rgba(239,68,68,0.25)] rounded-[10px]">
              <div className="row-2">
                <div><div className="font-mono text-[10px] text-at-with tracking-[0.08em] uppercase">BEFORE</div><div className="font-display text-[20px] font-semibold">$48,210</div></div>
                <div><div className="font-mono text-[10px] text-at-with tracking-[0.08em] uppercase">AFTER</div><div className="font-display text-[20px] font-semibold">$33,210</div></div>
              </div>
            </div>
            <Annote><b>Withdrawals fail often.</b> Citizens scrutinize them. Plan for it.</Annote>
          </Card>
        </div>
        <div>
          <Explainer>
            <h4>Why strict mode?</h4>
            <p>A Sponsor that can drain the treasury at will defeats the point. Every withdrawal goes through the same market as any other decision.</p>
            <p>Citizens vote on whether the withdrawal is justified. If not, funds stay.</p>
          </Explainer>
        </div>
      </div>
      <div className="mt-[24px]"><Button className="cursor-pointer" onClick={() => router.push("/market/create-start")}>← Back</Button> <Button variant="primary" data-open-proposal="1">Review →</Button></div>
    </>
  );
}
