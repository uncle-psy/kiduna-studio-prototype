"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "./navConfig";
import { MarketSwitcher } from "./MarketSwitcher";
import { useCurrentMarket } from "@/lib/market-context";
import {
  LayoutDashboard, Crosshair, FileText, Users,
  Landmark, Coins, Settings, Wallet, Send, Rocket, ArrowLeft, type LucideIcon,
}from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Crosshair, FileText, Users, Landmark, Coins, Settings, Wallet, Send, Rocket,
};

export function Sidebar() {
  const pathname = usePathname();
  const { current } = useCurrentMarket();

  const realCounts: Record<string, number | undefined> = {
    "/market/proposals": current?.openProposalsCount ?? undefined,
    "/market/electors": current?.memberCount ?? undefined,
  };

  const isActive = (href: string) =>
    href === "/market" ? pathname === "/market" : pathname.startsWith(href);

  return (
    <aside style={{ top: 'var(--header-h, 60px)' }} className="fixed left-0 bottom-0 z-30 w-[220px] bg-sidebar border-r border-card-border overflow-y-auto transition-all duration-200 md:max-lg:w-16 md:max-lg:px-2 max-md:-translate-x-full max-md:w-[260px]">
      <div className="p-3"> 
        {/* Back to Studio */}
        <Link href="/markets"
          className="flex items-center gap-2 px-2.5 py-2 mb-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors no-underline text-xs md:max-lg:justify-center">
          <ArrowLeft size={14} />
          <span className="md:max-lg:hidden">Back to Studio</span>
        </Link>

        <MarketSwitcher />

        {navGroups.map((group) => (
          <div key={group.label}>
            {/* Group label */}
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted px-2.5 pt-4 pb-1.5 md:max-lg:hidden">
              {group.label}
            </div>

            {group.items.map((item, idx) => {
              const active = item.href ? isActive(item.href) : false;
              const IconComponent = item.icon ? iconMap[item.icon] : null;
              const count = item.href ? (realCounts[item.href] ?? item.count) : item.count;

              const inner = (
                <>
                  {IconComponent && (
                    <span className={`shrink-0 w-[18px] h-[18px] ${active ? "text-accent" : "opacity-70"}`}>
                      <IconComponent size={18} />
                    </span>
                  )}
                  <span className="flex-1 text-sm font-medium md:max-lg:hidden">{item.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="ml-auto font-mono text-[11px] text-muted md:max-lg:hidden">{count}</span>
                  )}
                </>
              );

              if (!item.href) {
                return (
                  <div key={`${item.label}-${idx}`}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-muted/50 cursor-default md:max-lg:justify-center md:max-lg:px-2"
                    title="Not yet available">
                    {inner}
                  </div>
                );
              }

              return (
                <Link key={`${item.label}-${idx}`} href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors no-underline my-0.5 md:max-lg:justify-center md:max-lg:px-2.5 ${
                    active
                      ? "bg-card text-white border-l-2 border-l-accent"
                      : "text-white/70 hover:bg-white/[0.04] hover:text-white border-l-2 border-l-transparent"
                  }`}>
                  {inner}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}