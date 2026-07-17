import Link from "next/link";
import { Badge, Button, Card, CardSub, CardTitle } from "@/components/ui/index";

export default function Page() {
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs"><Link href="/market/runs">Runs</Link> / run_3f2a · content-executor</div>
          <div className="pagetitle">The executor is working.</div>
          <div className="pagedesc">Every step is scope-checked. Every tool call logged. Every transition a checkpoint.</div>
        </div>
        <div className="flex gap-[8px]">
          <Badge variant="live" dot>RUNNING · step 4/7</Badge>
          <Button>Pause</Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-[18px]">
        <div>
          <Card className="mb-[14px] p-0">
            <div className="p-[18px_20px] border-b-[1px] border-b-border">
              <CardTitle className="m-0">Execution graph</CardTitle>
              <CardSub className="m-0">Live state of the LangGraph flow.</CardSub>
            </div>
            <div className="p-[22px] min-h-[320px] relative bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:22px_22px]">
              <div className="absolute left-[30px] top-[30px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-[rgba(34,197,94,0.45)] text-pass text-[12px] font-mono">verify_code ✓</div>
              <div className="absolute left-[200px] top-[30px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-[rgba(34,197,94,0.45)] text-pass text-[12px] font-mono">plan ✓</div>
              <div className="absolute left-[340px] top-[30px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-[rgba(34,197,94,0.45)] text-pass text-[12px] font-mono">verify_scope ✓</div>
              <div className="absolute left-[510px] top-[30px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-[rgba(34,197,94,0.45)] text-pass text-[12px] font-mono">act (page-1) ✓</div>
              <div className="absolute left-[30px] top-[130px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-[rgba(34,197,94,0.45)] text-pass text-[12px] font-mono">emit_report ✓</div>
              <div className="absolute left-[200px] top-[130px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-[rgba(34,197,94,0.45)] text-pass text-[12px] font-mono">verify_scope ✓</div>
              <div className="absolute left-[340px] top-[130px] p-[10px_14px] rounded-[10px] bg-[rgba(234,170,0,0.15)] border-[1px] border-accent text-accent-2 text-[12px] font-mono shadow-[0_0_0_4px_rgba(234,170,0,0.15)]">act (page-2) ●</div>
              <div className="absolute left-[510px] top-[130px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-border text-[12px] font-mono opacity-60">emit_report</div>
              <div className="absolute left-[200px] top-[230px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-border text-[12px] font-mono opacity-60">act (page-3)</div>
              <div className="absolute left-[510px] top-[230px] p-[10px_14px] rounded-[10px] bg-card-hi border-[1px] border-border text-[12px] font-mono opacity-60">finish</div>
            </div>
          </Card>

          <Card>
            <CardTitle>Tool-call timeline</CardTitle>
            <div className="p-[10px_0] text-[12px] flex gap-[10px] border-b-[1px] border-b-border">
              <span className="font-mono text-muted w-[60px]">14:02:41</span>
              <span className="text-accent-2">●</span>
              <span><b>act</b> · http_post → cms.acme.io/pages/landing-2 — <span className="text-muted">running</span></span>
            </div>
            <div className="p-[10px_0] text-[12px] flex gap-[10px] border-b-[1px] border-b-border">
              <span className="font-mono text-muted w-[60px]">14:02:39</span>
              <span className="text-pass">✓</span>
              <span><b>verify_scope</b> · tool=http_post, budget $312/$800 — <span className="text-pass">allowed</span></span>
            </div>
            <div className="p-[10px_0] text-[12px] flex gap-[10px]">
              <span className="font-mono text-muted w-[60px]">14:01:18</span>
              <span className="text-pass">✓</span>
              <span><b>emit_report</b> · landing-1 published, $98 spent</span>
            </div>
          </Card>
        </div>

        <div>
          <Card className="mb-[12px]">
            <CardTitle className="text-[14px]">Scope (Kinship Code)</CardTitle>
            <table className="w-full text-[12px] text-subtle">
              <tbody><tr><td>Tools</td><td className="text-right font-mono">6 bindings</td></tr>
              <tr><td>Budget</td><td className="text-right font-mono">$312 / $800</td></tr>
              <tr><td>Window</td><td className="text-right font-mono">closes 16:00</td></tr>
            </tbody></table>
            <div className="h-[6px] bg-bg rounded-[6px] mt-[10px] overflow-hidden">
              <div className="h-full w-[39%] bg-accent"></div>
            </div>
          </Card>
          <Card>
            <CardTitle className="text-[14px]">Originating</CardTitle>
            <div className="text-[13px] m-[6px_0]"><a className="text-accent-2">Refresh landing pages — Spring 2026</a></div>
            <div className="text-[11px] text-muted">Resolved 2d ago · TWAP 0.78/0.22</div>
          </Card>
        </div>
      </div>
    </>
  );
}
