"use client";

import Link from "next/link";
import { Badge, Button, Card, CardSub, CardTitle, Explainer } from "@/components/ui/index";
import { useRouter } from "next/navigation";
import { AdminOnly } from "@/components/market/AdminOnly";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div><div className="crumbs">Settings / Operators</div><div className="pagetitle">Operators.</div><div className="pagedesc">Your Sponsor agents. They publish proposals, broadcast context to Electors during trading, and flag drift. One per Objective. They never trade.</div></div>
        <AdminOnly>
          <Button className="cursor-pointer" onClick={() => router.push("/market/settings/operators/create")}>＋ Add operator</Button>
        </AdminOnly>
      </div>

      <Explainer className="mb-[20px]">
        <h4>Operators vs Electors vs Executors</h4>
        <p><b>Operator</b> — your agent. Publishes proposals, broadcasts to Electors, flags drift. One per Objective.</p>
        <p><b>Elector</b> — a Citizen's voting agent. Trades on their behalf.</p>
        <p><b>Executor</b> — a worker agent that does operational work after Pass.</p>
      </Explainer>

      <div className="grid-3">
        <Card href="/market/settings/operators/detail" className="cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>growth-operator-v1</CardTitle>
              <CardSub>📣 Growth</CardSub>
            </div>
            <Badge variant="pass" dot>ACTIVE</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.7]">
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Proposals published</span><b>7</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Broadcasts sent</span><b>24</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Drift flags raised</span><b>3</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Last broadcast</span><b>4h ago</b></div>
          </div>
          <Button size="sm" className="w-full" data-stop-propagation="1" onClick={() => router.push("/market/settings/operators/detail")}>Open detail →</Button>
        </Card>

        <Card href="/market/settings/operators/detail" className="cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>ops-operator-v1</CardTitle>
              <CardSub>⚙️ Operations</CardSub>
            </div>
            <Badge variant="pass" dot>ACTIVE</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.7]">
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Proposals published</span><b>12</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Broadcasts sent</span><b>41</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Drift flags raised</span><b>6</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Last broadcast</span><b>2d ago</b></div>
          </div>
          <Button size="sm" className="w-full" data-stop-propagation="1" onClick={() => router.push("/market/settings/operators/detail")}>Open detail →</Button>
        </Card>

        <Card href="/market/settings/operators/detail" className="cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>strategy-operator-v1</CardTitle>
              <CardSub>🧭 Strategy</CardSub>
            </div>
            <Badge className="text-warn border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]">QUIET</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.7]">
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Proposals published</span><b>3</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Broadcasts sent</span><b>8</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Drift flags raised</span><b>1</b></div>
            <div className="flex justify-between p-[3px_0]"><span className="text-muted">Last broadcast</span><b>1w ago</b></div>
          </div>
          <Button size="sm" className="w-full" data-stop-propagation="1" onClick={() => router.push("/market/settings/operators/detail")}>Open detail →</Button>
        </Card>
      </div>
    </>
  );
}