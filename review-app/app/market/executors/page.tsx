import { Badge, Button, Card, CardSub, CardTitle, Explainer } from "@/components/ui/index";
export default function Page() {
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs">Acme Strategy DAO / Executors</div>
          <div className="pagetitle">Executor catalog.</div>
          <div className="pagedesc">5 pre-built worker agents. Proposals can contract any of them.</div>
        </div>
      </div>

      <Explainer className="mb-[20px]">
        <h4>What is an Executor?</h4>
        <p>An Executor is a specialized agent that knows how to do one category of work — drafting content, sending comms, processing payroll, handling disbursements. When a proposal that contracts it passes, the Executor wakes up with a Kinship Code defining its scope, and starts working.</p>
        <p>v1 ships with 5 pre-built Executors. Architect marketplace for custom ones is v1.5.</p>
      </Explainer>

      <div className="grid-3">
        <Card>
          <div className="flex justify-between">
            <div><CardTitle>content-executor</CardTitle><CardSub>Campaigns &amp; content</CardSub></div>
            <Badge variant="pass" dot>RUNNING</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.6]">
            HTTP · Email · LinkedIn · X · LLM<br/>
            96% reliability (47 runs)
          </div>
          <div className="flex justify-between mt-[10px]"><Badge>$250</Badge><Button size="sm">Details</Button></div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div><CardTitle>comms-executor</CardTitle><CardSub>Customer announcements</CardSub></div>
            <Badge>IDLE</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.6]">
            Email · Slack · Twilio · LLM<br/>
            100% reliability (12 runs)
          </div>
          <div className="flex justify-between mt-[10px]"><Badge>$150</Badge><Button size="sm">Details</Button></div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div><CardTitle>hr-executor</CardTitle><CardSub>Hiring &amp; onboarding</CardSub></div>
            <Badge>IDLE</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.6]">
            LinkedIn · Calendly · Greenhouse · LLM<br/>
            92% reliability (8 runs)
          </div>
          <div className="flex justify-between mt-[10px]"><Badge>$400</Badge><Button size="sm">Details</Button></div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div><CardTitle>treasury-executor</CardTitle><CardSub>Disbursements &amp; reconciliation</CardSub></div>
            <Badge>IDLE</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.6]">
            Wire · Stripe · Accounting · LLM<br/>
            100% reliability (24 runs)
          </div>
          <div className="flex justify-between mt-[10px]"><Badge>$100</Badge><Button size="sm">Details</Button></div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div><CardTitle>generic-demo</CardTitle><CardSub>Multi-step demo</CardSub></div>
            <Badge>IDLE</Badge>
          </div>
          <div className="text-[12px] text-subtle m-[10px_0] leading-[1.6]">
            HTTP · LLM<br/>
            100% reliability (3 runs)
          </div>
          <div className="flex justify-between mt-[10px]"><Badge>$10</Badge><Button size="sm">Details</Button></div>
        </Card>
        <Card className="opacity-60 border-dashed">
          <CardTitle className="text-muted">＋ Custom Executor</CardTitle>
          <CardSub>Architect marketplace · v1.5</CardSub>
        </Card>
      </div>
    </>
  );
}
