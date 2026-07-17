"use client";

import Link from "next/link";
import { Button, Card, CardTitle, Explainer } from "@/components/ui/index";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div><div className="crumbs"><Link href="/market/proposals">Proposals</Link> / New / Spend + Executor</div><div className="pagetitle">Spend + Executor.</div><div className="pagedesc">Release funds AND have an Executor manage them.</div></div>
        <Button size="sm" className="cursor-pointer" onClick={() => router.push("/market/create-start")}>← Change type</Button>
      </div>
      <div className="at-header mixed"><div className="big-icon">⇌</div><div><div className="at-h-title">Mixed proposal</div><div className="at-h-desc">Three things happen on Pass: USDC salary commits, META bonus vests, hr-executor manages onboarding.</div></div></div>

      <div className="grid-2">
        <div>
          <Card className="mb-[14px]">
            <CardTitle>1 · Story</CardTitle>
            <div className="field"><label>Title</label><input defaultValue="Hire fractional CFO (3mo trial)"/></div>
            <div className="field"><label>Objective</label><select><option>Operations</option></select></div>
            <div className="field"><label>Description</label><textarea rows={3}>Sarah Chen, 3mo fractional CFO. $18k USDC salary ($6k/mo) + 100K META signing bonus (3mo cliff, 12mo linear). HR-executor handles contract &amp; onboarding.</textarea></div>
          </Card>
          <Card className="mb-[14px] border-l-[3px] border-l-at-spend">
            <CardTitle className="text-at-spend">2a · Fund release (Split: USDC + META)</CardTitle>
            <div className="recipient-row grid-cols-[1fr_1fr_90px_90px_40px]">
              <input defaultValue="Sarah Chen"/>
              <input defaultValue="acct_sc_2031"/>
              <select><option>USDC</option></select>
              <select><option>$18,000</option></select>
              <button className="del">×</button>
            </div>
            <div className="recipient-row grid-cols-[1fr_1fr_90px_90px_40px]">
              <input defaultValue="Sarah Chen" disabled/>
              <input defaultValue="acct_sc_2031" disabled/>
              <select><option className="text-at-mint">META</option></select>
              <select><option>100,000</option></select>
              <button className="del">×</button>
            </div>
          </Card>
          <Card className="mb-[14px] border-l-[3px] border-l-at-exec">
            <CardTitle className="text-at-exec">2b · Executor: hr-executor</CardTitle>
            <div className="row-2">
              <div className="field"><label>Scope budget</label><input defaultValue="$1,500"/></div>
              <div className="field"><label>Window</label><select><option>90 days</option></select></div>
            </div>
          </Card>
          <Card>
            <CardTitle>3 · Market</CardTitle>
            <div className="row-2">
              <div className="field"><label>Trading window</label><select><option>3 days</option></select></div>
              <div className="field"><label>Vault liquidity</label><input defaultValue="$3,000"/></div>
            </div>
          </Card>
        </div>
        <div>
          <Explainer>
            <h4>Three things happen on Pass</h4>
            <p><b className="text-at-spend">1. USDC salary commits.</b> $18k reserved, $6k/mo for 3 months.</p>
            <p><b className="text-at-spend">2. META bonus vests.</b> 100K META locks into cliff + linear.</p>
            <p><b className="text-at-exec">3. HR-executor spawns</b> with $1,500 ops scope ($400 Architect fee).</p>
          </Explainer>
          <Card className="mt-[14px]">
            <CardTitle className="text-[14px]">Treasury impact</CardTitle>
            <table className="w-full text-[12px]">
              <thead><tr className="text-muted"><td></td><td className="text-right font-mono text-[10px]">USDC</td><td className="text-right font-mono text-[10px]">META</td></tr></thead>
              <tbody><tr><td>Salary (committed)</td><td className="text-right">$18,000</td><td className="text-right">—</td></tr>
              <tr><td>Signing bonus</td><td className="text-right">—</td><td className="text-right">100K</td></tr>
              <tr><td>HR-executor (fee + scope)</td><td className="text-right">$1,900</td><td className="text-right">—</td></tr>
              <tr><td>Vault</td><td className="text-right">$3,000</td><td className="text-right">—</td></tr>
            </tbody></table>
          </Card>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button className="cursor-pointer" onClick={() => router.push("/market/create-start")}>← Back</Button>
        <Button variant="primary" data-open-proposal="1">Review →</Button>
      </div>
    </>
  );
}
