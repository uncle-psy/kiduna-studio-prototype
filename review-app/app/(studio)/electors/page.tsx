"use client";
import { useRouter } from "next/navigation";

import { Annote, Avatar, Badge, Button, Card, CardSub, CardTitle, Explainer } from "@/components/ui/index";

export default function ElectorsPage() {
  const router = useRouter()
  return (
    <div className="market-wizard">
      <div className="pageheader">
        <div>
          <div className="crumbs">Acme Strategy DAO / Electors</div>
          <div className="pagetitle">Your Citizens &amp; their Electors.</div>
          <div className="pagedesc">Every Citizen with standing configures an Elector — an agent with its own value vector that votes on their behalf. This page shows the population.</div>
        </div>
        <Button>Export roster ↗</Button>
      </div>

      <Explainer className="mb-[20px]">
        <h4>Electors vs Executors vs Operators</h4>
        <p><b>Electors</b> are on this page. One per Citizen. Each reads proposals, projects the impact on the Objective&apos;s value vector, and trades Pass/Fail based on alignment with its Citizen&apos;s values. This is &ldquo;voting.&rdquo;</p>
        <p><b>Operators</b> run Objectives and publish proposals. They don&apos;t trade.</p>
        <p><b>Executors</b> do operational work after a proposal passes. They don&apos;t trade either.</p>
      </Explainer>

      <div className="grid-4 mb-[18px]">
        <Card><div className="stat"><div className="stat-label">Electors configured</div><div className="stat-value">147</div><div className="stat-delta">+12 this week</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Participation</div><div className="stat-value">68%</div><div className="stat-delta">per proposal avg</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Accuracy</div><div className="stat-value">64%</div><div className="stat-delta">backed winning side</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Stake deployed</div><div className="stat-value">$29.4k</div><div className="stat-delta">across 4 open</div></div></Card>
      </div>

      <div className="grid-2 mb-[18px]">
        <Card>
          <CardTitle>Alignment by Objective</CardTitle>
          <CardSub>How closely the Citizen population&apos;s values match each Objective.</CardSub>

          <div className="p-[14px] border-[1px] border-border rounded-[10px] mt-[12px]">
            <div className="flex justify-between mb-[8px]">
              <b>📣 Growth</b>
              <Badge className="text-pass border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)]">WELL ALIGNED · 0.82</Badge>
            </div>
            <div className="text-[12px] text-subtle">Most Electors weight Revenue heavily (avg 0.38). 34 actively trading.</div>
          </div>

          <div className="p-[14px] border-[1px] border-border rounded-[10px] mt-[10px]">
            <div className="flex justify-between mb-[8px]">
              <b>⚙️ Operations</b>
              <Badge className="text-warn border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]">MODERATE · 0.61</Badge>
            </div>
            <div className="text-[12px] text-subtle">Electors weight Team Morale higher (avg 0.34 vs your 0.20). Expect friction on cost-cutting.</div>
          </div>

          <div className="p-[14px] border-[1px] border-border rounded-[10px] mt-[10px]">
            <div className="flex justify-between mb-[8px]">
              <b>🧭 Strategy</b>
              <Badge className="text-pass border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)]">WELL ALIGNED · 0.79</Badge>
            </div>
            <div className="text-[12px] text-subtle">Strong agreement on long-term value &amp; brand.</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Value dimension distribution</CardTitle>
          <CardSub>How Electors have set their weights population-wide.</CardSub>

          <div className="mt-[14px]">
            <div className="text-[12px] mb-[3px] flex justify-between">
              <span>Revenue growth</span>
              <span className="font-mono text-muted">avg 0.38 · your 0.40</span>
            </div>
            <div className="flex h-[18px] rounded-[4px] overflow-hidden mb-[12px]">
              <div className="w-[8%] bg-[rgba(34,197,94,0.2)]" />
              <div className="w-[22%] bg-[rgba(34,197,94,0.4)]" />
              <div className="w-[42%] bg-[rgba(34,197,94,0.7)]" />
              <div className="w-[22%] bg-[rgba(34,197,94,0.5)]" />
              <div className="w-[6%] bg-[rgba(34,197,94,0.3)]" />
            </div>

            <div className="text-[12px] mb-[3px] flex justify-between">
              <span>User love</span>
              <span className="font-mono text-muted">avg 0.22 · your 0.25</span>
            </div>
            <div className="flex h-[18px] rounded-[4px] overflow-hidden mb-[12px]">
              <div className="w-[15%] bg-[rgba(106,166,255,0.3)]" />
              <div className="w-[38%] bg-[rgba(106,166,255,0.6)]" />
              <div className="w-[30%] bg-[rgba(106,166,255,0.5)]" />
              <div className="w-[12%] bg-[rgba(106,166,255,0.4)]" />
              <div className="w-[5%] bg-[rgba(106,166,255,0.2)]" />
            </div>

            <div className="text-[12px] mb-[3px] flex justify-between">
              <span>Speed</span>
              <span className="font-mono text-muted">avg 0.14 · your 0.20 <span className="text-warn">↓</span></span>
            </div>
            <div className="flex h-[18px] rounded-[4px] overflow-hidden mb-[12px]">
              <div className="w-[30%] bg-[rgba(235,128,0,0.3)]" />
              <div className="w-[45%] bg-[rgba(235,128,0,0.7)]" />
              <div className="w-[18%] bg-[rgba(235,128,0,0.5)]" />
              <div className="w-[5%] bg-[rgba(235,128,0,0.3)]" />
            </div>

            <div className="text-[12px] mb-[3px] flex justify-between">
              <span>Runway impact</span>
              <span className="font-mono text-muted">avg 0.26 · your 0.15 <span className="text-warn">↑</span></span>
            </div>
            <div className="flex h-[18px] rounded-[4px] overflow-hidden mb-[12px]">
              <div className="w-[5%] bg-[rgba(155,123,184,0.3)]" />
              <div className="w-[18%] bg-[rgba(155,123,184,0.4)]" />
              <div className="w-[35%] bg-[rgba(155,123,184,0.7)]" />
              <div className="w-[30%] bg-[rgba(155,123,184,0.6)]" />
              <div className="w-[12%] bg-[rgba(155,123,184,0.5)]" />
            </div>
          </div>

          <Annote className="mt-[8px]">
            Your Citizens weight <b>Runway impact higher than you</b> (0.26 vs 0.15). Expect pushback on proposals that burn cash fast.
          </Annote>
        </Card>
      </div>

      <Card>
        <CardTitle>Top Electors this quarter</CardTitle>
        <CardSub>Ranked by accuracy × participation.</CardSub>

        <table className="lst">
          <thead><tr><th>Elector</th><th>Citizen</th><th>Strongest value</th><th>Participation</th><th>Accuracy</th><th>Stake</th><th>P&amp;L</th></tr></thead>
          <tbody>
            <tr><td><Avatar variant={1} /> <b>elec_aria_03</b></td><td>Aria Devi</td><td><span className="vec-pill text-[11px]"><span className="swatch bg-[#22c55e]" />Revenue<span className="w">0.45</span></span></td><td>94%</td><td className="text-pass">73%</td><td>$612</td><td className="text-pass">+$184</td></tr>
            <tr><td><Avatar variant={3} /> <b>elec_priya_01</b></td><td>Priya Kumar</td><td><span className="vec-pill text-[11px]"><span className="swatch bg-[#9b7bb8]" />Runway<span className="w">0.42</span></span></td><td>89%</td><td className="text-pass">71%</td><td>$510</td><td className="text-pass">+$142</td></tr>
            <tr><td><Avatar variant={2} /> <b>elec_kavin_07</b></td><td>Kavin Raja</td><td><span className="vec-pill text-[11px]"><span className="swatch bg-[#6aa6ff]" />User love<span className="w">0.38</span></span></td><td>78%</td><td className="text-pass">68%</td><td>$380</td><td className="text-pass">+$88</td></tr>
            <tr><td><Avatar variant={4} /> <b>elec_tamil_12</b></td><td>Tamil Selvan</td><td><span className="vec-pill text-[11px]"><span className="swatch bg-[#22c55e]" />Revenue<span className="w">0.50</span></span></td><td>85%</td><td>59%</td><td>$420</td><td className="text-muted">+$12</td></tr>
            <tr><td><Avatar variant={1} /> <b>elec_meera_22</b></td><td>Meera Nair</td><td><span className="vec-pill text-[11px]"><span className="swatch bg-[#9b7bb8]" />Runway<span className="w">0.48</span></span></td><td>72%</td><td>52%</td><td>$290</td><td className="text-fail">−$34</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}