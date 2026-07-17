import type { ActionType } from "@/components/ui/index";

export type OpenProposal = {
  title: string;
  objective: string;
  type: { kind: ActionType; label: string };
  pass: string;
  fail: string;
  closesIn: string;
  href?: string;
};

export type InFlightRun = {
  href: string;
  executor: string;
  description: string;
  step: string;
  spend: string;
  timeLeft: string;
  progressPct: number;
};

export const MOCK_OPEN_PROPOSALS: OpenProposal[] = [
  {
    title: "Q2 outreach campaign",
    objective: "Growth",
    type: { kind: "exec", label: "EXECUTOR" },
    pass: "0.71",
    fail: "0.32",
    closesIn: "11h 22m",
    href: "/market/proposals/p-perf-eng",
  },
  {
    title: "Pay Rao & Associates — Q2 legal retainer",
    objective: "Operations",
    type: { kind: "spend", label: "SPEND" },
    pass: "0.82",
    fail: "0.19",
    closesIn: "1d 04h",
    href: "/market/proposals/p-spend-rao",
  },
  {
    title: "Hire fractional CFO (3mo trial)",
    objective: "Operations",
    type: { kind: "mixed", label: "SPEND + EXEC" },
    pass: "0.58",
    fail: "0.43",
    closesIn: "1d 06h",
  },
];

export const MOCK_IN_FLIGHT_RUNS: InFlightRun[] = [
  {
    href: "/studio/run-live",
    executor: "content-executor",
    description: '"Refresh landing pages — Spring 2026"',
    step: "step 4/7",
    spend: "$312/$800",
    timeLeft: "2h 14m left",
    progressPct: 57,
  },
];
