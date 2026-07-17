export type DashboardStat = {
  label: string;
  value: string;
  delta?: string;
};

/**
 * Stat cards for the market dashboard.
 *
 * Values are mock for now — swap with real query results when the
 * backend lands.
 */
export function getStatsFor(): DashboardStat[] {
  return [
    {
      label: "Treasury available",
      value: "$48,210",
      delta: "$6,250 reserved · $1,050 in flight",
    },
    {
      label: "Tokens in supply",
      value: "10.7M",
      delta: "5M vesting · 5.7M liquid",
    },
    {
      label: "Open proposals",
      value: "4",
      delta: "3 trending Pass · 1 Fail",
    },
    {
      label: "Active citizens",
      value: "147",
      delta: "+12 this week",
    },
  ];
}
