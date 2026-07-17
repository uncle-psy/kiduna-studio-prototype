"use client";

import Link from "next/link";
import { Badge, Button, Card, CardSub, CardTitle, Explainer } from "@/components/ui/index";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs"><Link href="/market/proposals">Proposals</Link> / New / Hire Executor</div>
          <div className="pagetitle">Hire an Executor.</div>
          <div className="pagedesc">Authorize a worker agent within a scope.</div>
        </div>
        <Button size="sm" className="cursor-pointer" onClick={() => router.push("/market/create-start")}>← Change type</Button>
      </div>

      <div className="at-header exec">
        <div className="big-icon">⌬</div>
        <div>
          <div className="at-h-title">Executor proposal</div>
          <div className="at-h-desc">On Pass, the Executor wakes up with a Kinship Code defining what it can do.</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <Card className="mb-[14px]">
            <CardTitle>1 · Tell the story</CardTitle>
            <div className="field"><label>Title</label><input defaultValue="Q2 outreach campaign"/></div>
            <div className="field"><label>Objective</label><select><option>Growth</option></select></div>
            <div className="field"><label>Description</label><textarea rows={3}>Run outreach across LinkedIn, X, and email targeting mid-market SaaS leaders. Goal: 50 qualified intros by end of quarter.</textarea></div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>2 · Pick the Executor</CardTitle>
            <div className="grid grid-cols-2 gap-[10px] mt-[10px]">
              <div className="p-[14px] border-[2px] border-at-exec rounded-[10px] bg-[rgba(234,170,0,0.06)]">
                <div className="flex justify-between"><b>content-executor ✓</b><span className="font-mono text-[11px]">$250</span></div>
                <div className="text-[11px] text-muted mt-[4px]">Drafts &amp; publishes campaigns · 96%</div>
              </div>
              <div className="p-[14px] border-[2px] border-border rounded-[10px]">
                <div className="flex justify-between"><b>comms-executor</b><span className="font-mono text-[11px]">$150</span></div>
                <div className="text-[11px] text-muted mt-[4px]">Customer announcements · 100%</div>
              </div>
            </div>
          </Card>

          <Card className="mb-[14px]">
            <CardTitle>3 · Set the scope</CardTitle>
            <CardSub>The agent cannot act outside these limits.</CardSub>
            <div className="row-2">
              <div className="field"><label>Budget cap</label><input defaultValue="$5,000"/></div>
              <div className="field"><label>Time window</label><select><option>30 days</option><option>14 days</option></select></div>
            </div>
            <div className="field">
              <label>Allowed tools</label>
              <div className="flex flex-wrap gap-[6px] p-[10px] border-[1px] border-border rounded-[10px]">
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">http_post ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">llm ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">linkedin_post ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">x_post ✓</Badge>
                <Badge className="bg-[rgba(34,197,94,0.1)] text-pass border-[rgba(34,197,94,0.3)]">email_send ✓</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>4 · Market parameters</CardTitle>
            <div className="row-2">
              <div className="field"><label>Trading window</label><select><option>3 days</option></select></div>
              <div className="field"><label>Vault liquidity</label><input defaultValue="$2,000"/></div>
            </div>
          </Card>
        </div>

        <div>
          <Explainer>
            <h4>On Pass</h4>
            <p>content-executor spawns with a signed Kinship Code: tools = 5 bindings, budget = $5,000, window = 30 days.</p>
            <p>Executor plans, calls tools, reports. Architect paid $250 on completion.</p>
          </Explainer>
          <Card className="mt-[14px]">
            <CardTitle className="text-[14px]">Treasury impact</CardTitle>
            <table className="w-full text-[12px]">
              <tbody><tr><td>Architect fee (on Pass)</td><td className="text-right">$250</td></tr>
              <tr><td>Executor budget (max)</td><td className="text-right">$5,000</td></tr>
              <tr><td>Vault (returnable)</td><td className="text-right">$2,000</td></tr>
              <tr className="border-t-[1px] border-t-border"><td className="pt-[8px]"><b>Worst case</b></td><td className="text-right pt-[8px]"><b>$7,250</b></td></tr>
            </tbody></table>
          </Card>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button className="cursor-pointer" onClick={() => router.push("/market/create-start")}>← Back</Button>
        <Button variant="primary" data-open-proposal="1">Review &amp; open →</Button>
      </div>
    </>
  );
}
