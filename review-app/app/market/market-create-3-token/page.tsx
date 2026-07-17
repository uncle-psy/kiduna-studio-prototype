"use client";

import Link from "next/link";
import { Annote, Button, Card, CardTitle, Explainer } from "@/components/ui/index";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs">Markets / Create / <span className="text-accent-2">Step 3 · Token setup</span></div>
          <div className="pagetitle">Launch your token.</div>
          <div className="pagedesc">Token-backed Markets configure 6 things at once via MetaDAO's launchpad. Numbers here are illustrative — tune to your raise strategy.</div>
        </div>
      </div>

      <div className="step-rail">
        <Link href="/market/market-create/connect" className="step done"><span className="num">✓</span>Connect</Link>
        <Link href="/market/market-create" className="step done"><span className="num">✓</span>Basics</Link>
        <div className="step active"><span className="num">3</span>Token setup</div>
        <Link href="/market/market-create-4" className="step"><span className="num">4</span>First objective</Link>
      </div>

      <div className="grid-2">
        <div>
          <Card className="mb-[14px]">
            <CardTitle>1 · Token identity</CardTitle>
            <div className="row-2">
              <div className="field"><label>Token name</label><input defaultValue="Acme"/></div>
              <div className="field"><label>Ticker</label><input defaultValue="ACME"/></div>
            </div>
            <div className="field"><label>Metadata URI</label><input defaultValue="https://acme.io/token.json"/><div className="hint">Image, description, external links.</div></div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>2 · Raise target</CardTitle>
            <div className="row-2">
              <div className="field"><label>Minimum raise</label><input defaultValue="$500,000 USDC"/><div className="hint">If not reached, all contributors refunded.</div></div>
              <div className="field"><label>Launch period</label><select><option>7 days</option><option>24 hours</option><option>14 days</option></select></div>
            </div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>3 · Premine &amp; distribution</CardTitle>
            <div className="row-2">
              <div className="field"><label>Premine %</label><input defaultValue="20%"/><div className="hint">Tokens granted pre-launch. Max 50%.</div></div>
              <div className="field"><label>Performance package grantee</label><input defaultValue="team_vesting_pda"/></div>
            </div>
            <div className="mt-[10px] p-[12px] bg-[rgba(106,166,255,0.06)] border-[1px] border-[rgba(106,166,255,0.25)] rounded-[8px] text-[12px] text-subtle leading-[1.7]">
              <b>Auto-distribution:</b><br/>
              — 60% to launch participants (ICO)<br/>
              — 20% to team (performance-locked)<br/>
              — 15% to DAMM V2 liquidity<br/>
              — 5% to futarchy liquidity pool
            </div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>4 · Monthly spending limit</CardTitle>
            <div className="row-2">
              <div className="field"><label>Monthly amount</label><input defaultValue="$50,000 USDC"/><div className="hint">Max 1/6 of minimum raise.</div></div>
              <div className="field"><label>Authorized spenders</label><input defaultValue="2 members"/></div>
            </div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>5 · Team lockup</CardTitle>
            <div className="row-2">
              <div className="field"><label>Insiders locked for</label><select><option>18 months (minimum)</option><option>24 months</option><option>36 months</option></select></div>
              <div className="field"><label>Team address</label><input defaultValue="team_multisig_..."/></div>
            </div>
          </Card>

          <Card>
            <CardTitle>6 · Bid wall (optional)</CardTitle>
            <div className="flex gap-[10px] items-center mt-[10px]">
              <input className="w-[auto]" type="checkbox" checked/>
              <div>
                <div className="text-[13px]">Enable bid wall</div>
                <div className="text-[11px] text-muted">Automated buy-side floor at NAV. Burns incoming sells.</div>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Explainer>
            <h4>What the launchpad does on launch</h4>
            <p>When you click Launch, the MetaDAO launchpad program runs six things atomically:</p>
            <p><b>1.</b> Mints your token with metadata.<br/>
            <b>2.</b> Opens a fundraise window for your Launch period.<br/>
            <b>3.</b> Premines the team allocation into a performance-package PDA.<br/>
            <b>4.</b> Sets up the monthly spending limit.<br/>
            <b>5.</b> Locks insider tokens for your chosen period.<br/>
            <b>6.</b> Optionally deploys the bid wall contract.</p>
            <p>If the raise meets its minimum, the Market goes live. If not, contributors are refunded.</p>
          </Explainer>
          <Annote className="mt-[14px]">
            <b>This is a one-time setup.</b> Once launched, most of these parameters can only be changed via parameter-change proposals (7+ days).
          </Annote>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button className="cursor-pointer" onClick={() => router.push("/market/market-create")}>← Back</Button>
        <Button variant="primary" className="cursor-pointer" onClick={() => router.push("/market/market-create-4?type=token-backed")}>Continue to first Objective →</Button>
      </div>
    </>
  );
}
