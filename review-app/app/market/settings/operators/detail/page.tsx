import Link from "next/link";
import { Badge, Button, Card, CardSub, CardTitle, Explainer } from "@/components/ui/index";

export default function Page() {
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs"><Link href="/market/settings/operators">Settings / Operators</Link> / growth-operator-v1</div>
          <div className="pagetitle">growth-operator-v1</div>
          <div className="pagedesc">Runs the 📣 Growth Objective. Publishes proposals, broadcasts context during trading, flags drift.</div>
        </div>
        <div className="flex gap-[8px]">
          <Button variant="danger">Disable</Button>
          <Button data-open-modal="broadcast-modal">📡 Send broadcast</Button>
          <Button variant="primary" data-save-operator="1">Save changes</Button>
        </div>
      </div>

      
      <div className="grid-4 mb-[18px]">
        <Card><div className="stat"><div className="stat-label">Status</div><div className="stat-value text-pass text-[22px]">Active</div><div className="stat-delta">running since Oct 2025</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Proposals published</div><div className="stat-value">7</div><div className="stat-delta">5 passed · 2 failed</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Broadcasts sent</div><div className="stat-value">24</div><div className="stat-delta">avg 68% Elector reach</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Drift flags raised</div><div className="stat-value">3</div><div className="stat-delta">2 resolved, 1 open</div></div></Card>
      </div>

      <div className="grid-2 mb-[18px]">
        
        <div>
          <Card className="mb-[14px]">
            <CardTitle>Identity</CardTitle>
            <div className="row-2">
              <div className="field">
                <label>Name</label>
                <input defaultValue="growth-operator-v1"/>
              </div>
              <div className="field">
                <label>Runs Objective</label>
                <select>
                  <option>Growth (current)</option>
                  <option>Operations</option>
                  <option>Strategy</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={2}>Runs Growth-category decisions. Emphasizes Revenue &amp; User love dimensions in broadcasts. Flags when proposals skew too far toward Speed at the cost of Runway.</textarea>
            </div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>Behavior</CardTitle>
            <CardSub>How this operator talks to Electors during trading.</CardSub>

            <div className="field">
              <label>System prompt</label>
              <textarea rows={6}>You are the Growth operator for Acme Strategy DAO. Your job is to surface context that helps Electors price proposals accurately against the Growth objective (Revenue 0.40, User love 0.25, Speed 0.20, Runway 0.15).

When you spot drift — a proposal scoring well on Speed but hurting Runway — broadcast a neutral flag. Cite data. Never tell Electors how to vote.

Tone: clear, evidence-based, brief. No hype.</textarea>
              <div className="hint">The core instructions for this agent. Changes take effect immediately.</div>
            </div>

            <div className="row-2">
              <div className="field">
                <label>Broadcast cadence</label>
                <select>
                  <option>On drift-flag only (default)</option>
                  <option>Daily during open markets</option>
                  <option>Weekly summary</option>
                  <option>Manual only</option>
                </select>
                <div className="hint">When the operator should post context without being asked.</div>
              </div>
              <div className="field">
                <label>Drift sensitivity</label>
                <select>
                  <option>Standard — flag &gt;10% drift on any dimension</option>
                  <option>High — flag &gt;5% drift</option>
                  <option>Low — flag &gt;20% drift</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Permissions &amp; keys</CardTitle>
            <CardSub>What this operator can do and what it signs with.</CardSub>

            <div className="field">
              <label>Allowed actions</label>
              <div className="flex flex-wrap gap-[6px] p-[10px] border-[1px] border-border rounded-[10px]">
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">publish_proposal ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">broadcast ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">flag_drift ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">query_elector ✓</Badge>
                <Badge className="text-muted">trade ✗ (operators never trade)</Badge>
              </div>
            </div>

            <div className="field">
              <label>Signing key</label>
              <div className="flex gap-[8px] items-center">
                <input className="flex-1" defaultValue="op_gr_v1_FROST_2of3" disabled/>
                <Button size="sm" data-alert="Key rotation initiated (wireframe demo).">Rotate</Button>
              </div>
              <div className="hint">FROST 2-of-3 threshold. No single key compromises the agent.</div>
            </div>
          </Card>
        </div>

        
        <div>
          <Explainer className="mb-[14px]">
            <h4>What this operator does</h4>
            <p>When you draft a proposal under Growth, this operator submits it to the market and initializes the conditional vault. During trading, it watches how prices move against the Growth objective vector. If it sees the market drifting toward a trade-off you'd want flagged, it broadcasts a neutral note to every active Elector.</p>
            <p>It never votes. It gives you a voice in the deliberation — Electors can weigh its arguments — without structural influence over the outcome.</p>
          </Explainer>

          <Card className="mb-[14px]">
            <CardTitle className="text-[14px]">Recent activity</CardTitle>
            <div className="text-[12px]">
              <div className="p-[10px_0] border-b-[1px] border-b-border">
                <div className="flex justify-between"><b>Broadcast sent</b><span className="text-muted">4h ago</span></div>
                <div className="text-subtle mt-[3px]">"Q1 ROI data supports LinkedIn channel strength. See attached."</div>
                <div className="text-muted mt-[3px] font-mono text-[10px]">reached 34 / 42 Electors · 18 opened</div>
              </div>
              <div className="p-[10px_0] border-b-[1px] border-b-border">
                <div className="flex justify-between"><b>Drift flag</b><span className="text-muted">yesterday</span></div>
                <div className="text-subtle mt-[3px]">Flagged on prop_3f2a — Runway dimension moving −8 under projected cost increase.</div>
              </div>
              <div className="p-[10px_0] border-b-[1px] border-b-border">
                <div className="flex justify-between"><b>Proposal published</b><span className="text-muted">2d ago</span></div>
                <div className="text-subtle mt-[3px]">"Q2 outreach campaign" opened for 72h trading.</div>
              </div>
              <div className="p-[10px_0]">
                <div className="flex justify-between"><b>Broadcast sent</b><span className="text-muted">5d ago</span></div>
                <div className="text-subtle mt-[3px]">"Competitor raised Series B. Growth context for current proposals."</div>
                <div className="text-muted mt-[3px] font-mono text-[10px]">reached 40 / 42 Electors · 31 opened</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle className="text-[14px]">Health</CardTitle>
            <div className="text-[12px] text-subtle leading-[1.8]">
              <b className="text-pass">✓</b> Signing keys valid<br/>
              <b className="text-pass">✓</b> Responding to proposals (avg 1.2s)<br/>
              <b className="text-pass">✓</b> Broadcast delivery 98%<br/>
              <b className="text-warn">!</b> 1 drift flag still open — review
            </div>
          </Card>
        </div>
      </div>

      
      <Card>
        <CardTitle>Broadcast history</CardTitle>
        <CardSub>Every message this operator has sent to Electors.</CardSub>
        <table className="lst">
          <thead><tr><th>Date</th><th>Proposal</th><th>Message</th><th>Reach</th><th>Opened</th></tr></thead>
          <tbody>
            <tr>
              <td>4h ago</td>
              <td><a className="text-accent-2">Q2 outreach campaign</a></td>
              <td className="max-w-[400px] text-subtle">Q1 ROI data supports LinkedIn channel strength. See attached campaign metrics.</td>
              <td>34 / 42</td>
              <td>18</td>
            </tr>
            <tr>
              <td>5d ago</td>
              <td>Market-wide</td>
              <td className="max-w-[400px] text-subtle">Competitor raised Series B this morning. Growth context for current proposals.</td>
              <td>40 / 42</td>
              <td>31</td>
            </tr>
            <tr>
              <td>1w ago</td>
              <td><a className="text-accent-2">Refresh landing pages — Spring 2026</a></td>
              <td className="max-w-[400px] text-subtle">Q4 landing performance regression is the trigger here. Data in Drive.</td>
              <td>38 / 42</td>
              <td>22</td>
            </tr>
            <tr>
              <td>2w ago</td>
              <td>Market-wide</td>
              <td className="max-w-[400px] text-subtle">Weekly summary: 3 open proposals, Revenue dimension trending +12% across all.</td>
              <td>42 / 42</td>
              <td>27</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
