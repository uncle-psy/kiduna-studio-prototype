"use client";

import { useState } from "react";

type GlossEntry = {
  term: string;
  role: string;
  body: string | React.ReactNode;
};

const entries: GlossEntry[] = [
  { term: "Market", role: "container", body: "The whole organization or project. Acme Strategy DAO is a Market. It contains everything else: objectives, proposals, treasury, participants." },
  { term: "Objective", role: "scope", body: "A scoped area inside a Market, with its own definition of what success looks like. A Market can have many Objectives — for instance, Growth, Operations, Strategy. Every proposal lives under one Objective." },
  { term: "Proposal", role: "decision", body: 'A specific decision being made. "Hire a fractional CFO." "Run a Q2 campaign." "Mint 500K tokens for liquidity." Proposals open markets that trade for a set window, then resolve Pass or Fail.' },
  { term: "Value dimension", role: "criterion", body: 'Something the Objective cares about. "Revenue growth." "Team morale." "Brand strength." Each dimension has a weight (how much it counts toward the decision). Weights in an Objective sum to 100%.' },
];

const agentEntries: GlossEntry[] = [
  { term: "Operator", role: "agent: the Sponsor's", body: "Your agent. Runs Objectives, publishes proposals, enforces the market's rules, broadcasts to Electors. It doesn't vote — its role is administrative." },
  { term: "Elector", role: "agent: a Citizen's", body: "An agent configured by a Citizen with that Citizen's personal values. When a proposal opens, every Elector reads it, projects the impact, and trades (votes) based on alignment with its Citizen's values." },
  { term: "Executor", role: "agent: a worker", body: 'A worker agent that does operational work after a proposal passes. You contract one in a proposal ("if this passes, hire content-executor to run the campaign"). It wakes up when the market resolves Pass.' },
];

const mechanismEntries: GlossEntry[] = [
  { term: "Treasury", role: "capital pool", body: "Where your Market's money lives. In v1, that's USDC (and optionally your native token for Token-backed Markets). Every spend references the proposal that authorized it." },
  { term: "Kinship Code", role: "scope authorization", body: 'A signed permission slip an Executor receives when a proposal passes. Says "you can use these tools, within this budget, until this date, and report in this format." The Executor cannot act outside the Code\'s scope.' },
  { term: "Pass / Fail market", role: "mechanism", body: <>Every open proposal has two parallel markets trading conditional tokens. Electors that think the proposal will be good for the Objective buy <b>Pass</b> tokens; those that disagree buy <b>Fail</b>. Prices move, an average is taken over the trading window, and the proposal passes if Pass priced higher than Fail.</> },
  { term: "TWAP", role: "resolution method", body: "Time-Weighted Average Price. Instead of taking the price at the exact moment the market closes (which is easy to manipulate), the system averages prices across a trailing window. Makes manipulation expensive." },
];

export function GlossaryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="glossary-btn"
        onClick={() => setOpen(true)}
        title="What do these terms mean?"
        type="button"
      >
        ?
      </button>

      <div
        className={`modal-overlay${open ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="modal">
          <button className="modal-close" onClick={() => setOpen(false)} type="button">
            ×
          </button>
          <div className="card-title text-[24px] mb-[6px]">Glossary</div>
          <div className="card-sub text-[13px] mb-[20px]">
            The terms used in this platform, in plain language. Open this anytime.
          </div>

          {entries.map((e) => (
            <Entry key={e.term} {...e} />
          ))}

          <div className="gloss-entry bg-[rgba(234,170,0,0.04)] my-[16px] -mx-[8px] py-[14px] px-[18px] rounded-[10px]">
            <div className="font-mono text-[10px] tracking-[0.1em] text-accent-2 uppercase mb-[10px]">
              THE THREE KINDS OF AGENTS
            </div>

            <Entry term="Sponsor" role="human: you" body={<>The person or team who owns the Market. They create Objectives, draft Proposals, deposit funds, configure Operators. In this Studio, the Sponsor is the primary user. Their agent is called an <b>Operator</b>.</>} flat />
            <Entry term="Citizen" role="human: your members" body={<>A participant in the Market who has standing to vote. Customers, team members, community members, stakeholders. Citizens configure their own agent called an <b>Elector</b> that votes on their behalf.</>} flat />
            <Entry term="Architect" role="human: developers" body={<>Someone who builds Executors — the worker agents that carry out passed proposals. In v1 the Architects are us (5 pre-built Executors ship with the platform). In v1.5 the marketplace opens up.</>} flat />

            <div className="mt-[16px] py-[10px] px-[12px] bg-[rgba(106,166,255,0.06)] rounded-[8px] text-[12px] text-subtle">
              <b>Quick rule:</b> Sponsors design Operators. Citizens design Electors.
              Architects design Executors. <b>Operators govern. Electors vote. Executors act.</b>
            </div>
          </div>

          {agentEntries.map((e) => (
            <Entry key={e.term} {...e} />
          ))}
          {mechanismEntries.map((e) => (
            <Entry key={e.term} {...e} />
          ))}
        </div>
      </div>
    </>
  );
}

function Entry({
  term,
  role,
  body,
  flat = false,
}: GlossEntry & { flat?: boolean }) {
  return (
    <div className={`gloss-entry${flat ? " border-b-0 py-[8px]" : ""}`}>
      <h5>
        {term} <span className="gloss-role">{role}</span>
      </h5>
      <p>{body}</p>
    </div>
  );
}
