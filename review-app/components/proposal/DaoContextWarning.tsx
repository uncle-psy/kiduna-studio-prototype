"use client";

export function DaoContextWarning({ missing }: { missing: string[] }) {
  return (
    <div className="p-[16px] bg-[rgba(234,170,0,0.06)] border-[1px] border-[rgba(234,170,0,0.25)] rounded-[10px]">
      <div className="font-mono text-[10px] text-at-param tracking-[0.08em] uppercase mb-[6px]">
        DAO context not configured
      </div>
      <div className="text-[12px] text-subtle leading-[1.6]">
        The create-proposal flow needs DAO + multisig + treasury addresses.
        Set these in <code className="text-[11px] bg-[rgba(255,255,255,0.05)] px-[4px] rounded-[3px]">.env.local</code>:
      </div>
      <pre className="mt-[8px] p-[10px] bg-[rgba(0,0,0,0.3)] rounded-[6px] text-[11px] font-mono overflow-x-auto">
{missing.map((m) => `${m}=...`).join("\n")}
      </pre>
      <div className="text-[11px] text-muted mt-[8px] leading-[1.6]">
        Run the e2e harness setup chain first (
        <code className="text-[10px]">airdrop → create-mints → create-pool → create-dao → provide-futarchy-liquidity → fund-treasury</code>
        ), then copy the resulting addresses from{" "}
        <code className="text-[10px]">kinship-market-e2e/state.json</code> into{" "}
        <code className="text-[10px]">.env.local</code>.
      </div>
    </div>
  );
}
