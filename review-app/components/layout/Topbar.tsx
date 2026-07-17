"use client";

import Link from "next/link";
import { MarketSwitcher } from "./MarketSwitcher";
import { UserPill } from "./UserPill";

export function Topbar() {
  return (
    <header className="topbar">
      <Link href="/market" className="topbar-brand">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          fill="none"
          role="img"
          aria-label="WV DUNA mark"
          className="brand-logo"
          style={{ width: 32, height: 32, flexShrink: 0 }}
        >
          <path
            d="M32 6 L36.23 18.17 L49.12 18.44 L38.85 26.22 L42.58 38.56 L32 31.2 L21.42 38.56 L25.15 26.22 L14.88 18.44 L27.77 18.17 Z"
            fill="#EAAA00"
          />
          <path
            d="M4 53 L16 44 L26 50 L38 42 L50 49 L60 44"
            stroke="#EAAA00"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          <path
            d="M4 59 L14 51 L24 57 L34 49 L44 56 L54 50 L60 54"
            stroke="#EAAA00"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div>
          <div className="brand-name">wvduna</div>
          <div className="brand-tag">MARKET · SPONSOR</div>
        </div>
      </Link>

      <div className="topbar-right">
        <MarketSwitcher />
        <UserPill />
      </div>
    </header>
  );
}