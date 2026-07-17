"use client";

import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui/index";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs">Acme Strategy DAO / Runs</div>
          <div className="pagetitle">Executor runs.</div>
          <div className="pagedesc">Active and historical. Each Run is one execution of one Executor under one passed proposal.</div>
        </div>
      </div>

      <Card>
        <table className="lst">
          <thead><tr><th>Run</th><th>Executor</th><th>Proposal</th><th>Status</th><th>Spent / Cap</th><th>Started</th></tr></thead>
          <tbody>
            <tr className="cursor-pointer"  onClick={() => router.push("/market/run-live")}>
              <td><b>run_3f2a</b></td>
              <td>content-executor</td>
              <td>Refresh landing pages — Spring 2026</td>
              <td><Badge variant="live" dot>RUNNING · 4/7</Badge></td>
              <td>$312 / $800</td>
              <td>2d ago</td>
            </tr>
            <tr>
              <td><b>run_2c11</b></td>
              <td>comms-executor</td>
              <td>Customer pricing announcement</td>
              <td><Badge variant="pass" dot>COMPLETE</Badge></td>
              <td>$189 / $300</td>
              <td>5d ago</td>
            </tr>
            <tr>
              <td><b>run_1a09</b></td>
              <td>content-executor</td>
              <td>Q1 onboarding email series</td>
              <td><Badge>COMPLETE</Badge></td>
              <td>$420 / $500</td>
              <td>2w ago</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
