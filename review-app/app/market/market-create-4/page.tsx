"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Button, Card, CardSub, CardTitle, Explainer } from "@/components/ui/index";
import { useRouter } from "next/navigation";

function PageInner() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs">Markets / Create / <span className="text-accent-2">Step 4</span></div>
          <div className="pagetitle">Set up your first Objective.</div>
          <div className="pagedesc">An Objective is a category of decisions — like Marketing or Hiring. We'll make one now; you can add more later.</div>
        </div>
      </div>

      <div className="step-rail">
        <Link href="/market/market-create/connect" className="step done"><span className="num">✓</span>Connect</Link>
        <Link href="/market/market-create" className="step done"><span className="num">✓</span>Basics</Link>
        <Link href="/market/market-create-3" className="step done"><span className="num">✓</span>Configure</Link>
        <div className="step active"><span className="num">4</span>First objective</div>
      </div>

      <div className="grid-2">
        <Card>
          <CardTitle>First Objective</CardTitle>
          <CardSub>Pick a preset or define your own.</CardSub>

          <div className="template-grid grid-cols-[repeat(2,1fr)]">
            <div className="template-card selected" data-select-template="1">
              <div className="t-icon">📣</div>
              <div className="t-name">Growth</div>
              <div className="t-desc">Marketing, sales, user acquisition</div>
            </div>
            <div className="template-card" data-select-template="1">
              <div className="t-icon">⚙️</div>
              <div className="t-name">Operations</div>
              <div className="t-desc">Hiring, vendors, day-to-day</div>
            </div>
            <div className="template-card" data-select-template="1">
              <div className="t-icon">🧭</div>
              <div className="t-name">Strategy</div>
              <div className="t-desc">Long-term direction, big bets</div>
            </div>
            <div className="template-card" data-select-template="1">
              <div className="t-icon">✨</div>
              <div className="t-name">Custom</div>
              <div className="t-desc">Define your own</div>
            </div>
          </div>

          <div className="field mt-[20px]">
            <label>Objective name</label>
            <input defaultValue="Growth"/>
          </div>
          <div className="field">
            <label>What decisions go here?</label>
            <textarea rows={2}>Marketing campaigns, sales initiatives, user acquisition programs, partnership decisions.</textarea>
          </div>

          <CardTitle className="mt-[24px] text-[15px]">Dimension weights for Growth</CardTitle>
          <CardSub>Pre-filled from your Market dimensions. Tweak if Growth cares more/less about something specific.</CardSub>

          <div className="dim-row-simple">
            <div><div className="name">Revenue growth</div></div>
            <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[40%]"></div></div>
            <div className="dim-val">0.40</div>
            <button className="dim-remove" data-remove-closest=".dim-row-simple">×</button>
          </div>
          <div className="dim-row-simple">
            <div><div className="name">User love</div></div>
            <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[25%]"></div></div>
            <div className="dim-val">0.25</div>
            <button className="dim-remove" data-remove-closest=".dim-row-simple">×</button>
          </div>
          <div className="dim-row-simple">
            <div><div className="name">Speed</div></div>
            <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[20%]"></div></div>
            <div className="dim-val">0.20</div>
            <button className="dim-remove" data-remove-closest=".dim-row-simple">×</button>
          </div>
          <div className="dim-row-simple">
            <div><div className="name">Runway impact</div></div>
            <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[15%]"></div></div>
            <div className="dim-val">0.15</div>
            <button className="dim-remove" data-remove-closest=".dim-row-simple">×</button>
          </div>

          <div className="advanced">
            <div className="advanced-trigger" data-toggle-parent="open">
              <span>⚙️ Advanced settings</span>
              <span className="chev">▼</span>
            </div>
            <div className="advanced-body">
              <div className="row-2 mt-[14px]">
                <div className="field">
                  <label>How long do proposals trade?</label>
                  <select><option>3 days (typical)</option><option>1 day</option><option>7 days</option></select>
                  <div className="hint">Longer = more deliberation, more manipulation resistance.</div>
                </div>
                <div className="field">
                  <label>Pass margin</label>
                  <select><option>3% (typical)</option><option>1%</option><option>5%</option></select>
                  <div className="hint">How much Pass must beat Fail by to pass.</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div>
          <Explainer>
            <h4>Why start with Growth?</h4>
            <p>For early-stage startups, the majority of important decisions are growth decisions: campaigns, sales offers, pricing changes, new channels. Starting here gets your team used to the system with decisions they make every week.</p>
            <p>Later you'll add Operations (for hiring, vendor choices) and Strategy (for bigger bets).</p>
          </Explainer>

          <Card className="mt-[14px]">
            <CardTitle className="text-[14px]">Preview</CardTitle>
            <div className="p-[12px] bg-[rgba(255,255,255,0.03)] rounded-[8px] mt-[8px]">
              <div className="font-display font-semibold text-[15px]">Growth</div>
              <div className="text-[11px] text-muted m-[2px_0_8px]">Marketing campaigns, sales initiatives...</div>
              <div className="vec-row">
                <div className="vec-pill"><span className="swatch bg-[#22c55e]"></span>Revenue<span className="w">0.40</span></div>
                <div className="vec-pill"><span className="swatch bg-[#6aa6ff]"></span>User love<span className="w">0.25</span></div>
                <div className="vec-pill"><span className="swatch bg-[#EAAA00]"></span>Speed<span className="w">0.20</span></div>
                <div className="vec-pill"><span className="swatch bg-[#9b7bb8]"></span>Runway<span className="w">0.15</span></div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button className="cursor-pointer" onClick={() => router.push("/market/market-create-3")}>← Back</Button>
        <Button variant="primary" className="cursor-pointer" onClick={() => router.push("/market/market-create-5")}>Review &amp; launch →</Button>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}
