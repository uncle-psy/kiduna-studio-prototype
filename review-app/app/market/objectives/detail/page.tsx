"use client";

import Link from "next/link";
import { Badge, Button, Card, CardTitle } from "@/components/ui/index";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs"><Link href="/market/objectives">Objectives</Link> / Growth</div>
          <div className="pagetitle">📣 Growth</div>
          <div className="pagedesc">Marketing, sales, user acquisition decisions.</div>
        </div>
        <div className="flex gap-[8px]">
          <Button>Edit</Button>
          <Button variant="primary" className="cursor-pointer" onClick={() => router.push("/market/create-start")}>＋ Proposal under Growth</Button>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <Card className="mb-[14px]">
            <CardTitle>How Growth judges decisions</CardTitle>
            <div className="p-[14px] bg-[rgba(255,255,255,0.02)] rounded-[10px] mt-[10px]">
              <div className="dim-row-simple border-none m-0">
                <div><div className="name">Revenue growth</div><div className="desc">Top-line business impact</div></div>
                <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[40%] bg-[#22c55e]"></div></div>
                <div className="dim-val">0.40</div>
                <div></div>
              </div>
              <div className="dim-row-simple border-none m-0">
                <div><div className="name">User love</div><div className="desc">Customer satisfaction, NPS</div></div>
                <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[25%] bg-[#6aa6ff]"></div></div>
                <div className="dim-val">0.25</div>
                <div></div>
              </div>
              <div className="dim-row-simple border-none m-0">
                <div><div className="name">Speed</div><div className="desc">Time-to-market</div></div>
                <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[20%] bg-[#EAAA00]"></div></div>
                <div className="dim-val">0.20</div>
                <div></div>
              </div>
              <div className="dim-row-simple border-none m-0">
                <div><div className="name">Runway impact</div><div className="desc">Cash burn effect</div></div>
                <div className="dim-track" data-adjust-dim="1"><div className="dim-fill w-[15%] bg-[#9b7bb8]"></div></div>
                <div className="dim-val">0.15</div>
                <div></div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Proposals under Growth</CardTitle>
            <table className="lst">
              <thead><tr><th>Proposal</th><th>Status</th><th>Pass / Fail</th><th>Date</th></tr></thead>
              <tbody>
                <tr className="cursor-pointer"  onClick={() => router.push("/market/proposals/p-perf-eng")}>
                  <td><b>Q2 outreach campaign</b></td>
                  <td><Badge variant="live" dot>LIVE</Badge></td>
                  <td><span className="text-pass">0.71</span> / <span className="text-fail">0.32</span></td>
                  <td>closes in 11h</td>
                </tr>
                <tr>
                  <td><b>Refresh landing pages — Spring 2026</b></td>
                  <td><Badge variant="pass" dot>PASSED</Badge></td>
                  <td><span className="text-pass">0.78</span> / <span className="text-fail">0.22</span></td>
                  <td>2d ago</td>
                </tr>
                <tr>
                  <td><b>Increase LinkedIn ad spend (Q1)</b></td>
                  <td><Badge variant="fail" dot>FAILED</Badge></td>
                  <td><span className="text-pass">0.42</span> / <span className="text-fail">0.58</span></td>
                  <td>3w ago</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <Card className="mb-[14px]">
            <CardTitle className="text-[14px]">Settings</CardTitle>
            <table className="w-full text-[12px] text-subtle">
              <tbody><tr><td>Window</td><td className="text-right">3 days</td></tr>
              <tr><td>Pass margin</td><td className="text-right">3%</td></tr>
              <tr><td>Standing</td><td className="text-right">Open</td></tr>
              <tr><td>Operator</td><td className="text-right">growth-operator-v1</td></tr>
            </tbody></table>
          </Card>
          <Card>
            <CardTitle className="text-[14px]">Activity</CardTitle>
            <div className="text-[12px] text-subtle leading-[1.7]">
              7 proposals lifetime<br/>
              5 passed · 2 failed<br/>
              71% participation · 42 active Electors
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}