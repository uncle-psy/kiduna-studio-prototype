"use client";

import { useState, useEffect } from "react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";

export type MarketRole = "sponsor" | "admin" | "member" | null;

interface MarketRoleState {
  role: MarketRole;
  isAdmin: boolean;
  isMember: boolean;
  loading: boolean;
}

/**
 * Determine the current user's role in the active market.
 *
 * 1. If wallet === market.sponsorWallet → "sponsor" (instant, no API call)
 * 2. Otherwise → fetch GET /api/v1/markets/{slug}/membership
 *
 * isAdmin is true for "sponsor" and "admin" roles.
 */
export function useMarketRole(): MarketRoleState {
  const { current } = useCurrentMarket();
  const { user, token } = useAuth();
  const [role, setRole] = useState<MarketRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset while loading
    if (!current?.slug || current.id === "__loading__" || !user?.wallet) {
      setRole(null);
      setLoading(true);
      return;
    }

    // Fast path: sponsor check (no API call needed)
    if (current.sponsorWallet && current.sponsorWallet === user.wallet) {
      setRole("sponsor");
      setLoading(false);
      return;
    }

    // Fetch membership role from API
    let cancelled = false;
    setLoading(true);

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(`/api/v1/markets/${current.slug}/membership`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.isMember) {
          setRole(data.role as MarketRole);
        } else {
          setRole(null);
        }
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [current?.slug, current?.id, current?.sponsorWallet, user?.wallet, token]);

  return {
    role,
    isAdmin: role === "sponsor" || role === "admin",
    isMember: role !== null,
    loading,
  };
}