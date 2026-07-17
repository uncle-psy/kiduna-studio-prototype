"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getToken, getSessionToken } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────

export type Market = {
  id: string;
  slug: string;
  name: string;
  launchStatus: string;
  memberCount: number;
  openProposalsCount: number;
  sponsorWallet: string;
  tokenTicker: string | null;
};

type Ctx = {
  markets: Market[];
  current: Market;
  setCurrentId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

// ── Persistence ──────────────────────────────────────────────────────

const STORAGE_KEY = "kinship_market_current";

function readSavedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSavedId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore quota errors
  }
}

// ── Placeholder market (shown while loading) ─────────────────────────

const PLACEHOLDER: Market = {
  id: "__loading__",
  slug: "",
  name: "Loading…",
  launchStatus: "draft",
  memberCount: 0,
  openProposalsCount: 0,
  sponsorWallet: "",
  tokenTicker: null,
};

const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE === 'true';
const REVIEW_MARKET: Market = {
  id: 'review-market',
  slug: 'wv-duna',
  name: 'WV DUNA',
  launchStatus: 'live',
  memberCount: 147,
  openProposalsCount: 3,
  sponsorWallet: 'ReviewWallet111111111111111111111111111111',
  tokenTicker: 'WVDUNA',
};

// ── Context ──────────────────────────────────────────────────────────

const MarketContext = createContext<Ctx | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<Market[]>(REVIEW_MODE ? [REVIEW_MARKET] : []);
  const [currentId, setCurrentId] = useState<string | null>(REVIEW_MODE ? REVIEW_MARKET.id : readSavedId);
  const [loading, setLoading] = useState(!REVIEW_MODE);
  const [error, setError] = useState<string | null>(null);

  // On mount, check URL for ?id= param and use it as current market
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("id");
    if (urlId) {
      setCurrentId(urlId);
      writeSavedId(urlId);
    }
  }, []);

  const fetchMarkets = useCallback(async () => {
    if (REVIEW_MODE) {
      setMarkets([REVIEW_MARKET]);
      setCurrentId(REVIEW_MARKET.id);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Try cookie token first, then localStorage (used by useAuth)
      const token = getToken() || getSessionToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const res = await fetch("/api/v1/markets?page=1&pageSize=50", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch markets (${res.status})`);
      }

      const data = await res.json();
      const items: Market[] = (data.items ?? []).map((m: any) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        launchStatus: m.launchStatus ?? "draft",
        memberCount: m.memberCount ?? 0,
        openProposalsCount: m.openProposalsCount ?? 0,
        sponsorWallet: m.sponsorWallet ?? "",
        tokenTicker: m.tokenTicker ?? null,
      }));

      setMarkets(items);

      // Auto-select: honour saved selection if it's still valid,
      // otherwise pick the first market.
      if (items.length > 0) {
        const saved = readSavedId();
        const valid = saved && items.some((m) => m.id === saved);
        if (!valid) {
          setCurrentId(items[0].id);
          writeSavedId(items[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const handleSetCurrent = useCallback((id: string) => {
    setCurrentId(id);
    writeSavedId(id);
  }, []);

  const current =
    markets.find((m) => m.id === currentId) ?? markets[0] ?? PLACEHOLDER;

  return (
    <MarketContext.Provider
      value={{
        markets,
        current,
        setCurrentId: handleSetCurrent,
        loading,
        error,
        refresh: fetchMarkets,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useCurrentMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useCurrentMarket must be used inside <MarketProvider>");
  }
  return ctx;
}
