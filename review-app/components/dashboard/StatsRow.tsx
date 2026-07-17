import { StatCard } from "@/components/ui/index";
import type { DashboardStat } from "@/lib/dashboard-stats";

export function StatsRow({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid-4 mb-[18px]">
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} />
      ))}
    </div>
  );
}