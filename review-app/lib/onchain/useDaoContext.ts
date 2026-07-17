"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useCurrentMarket } from "@/lib/market-context";
import { getToken } from "@/lib/auth";

export interface DaoContext {
  dao: PublicKey;
  multisigPda: PublicKey;
  treasuryVault: PublicKey;
  usdcMint: PublicKey;
  baseMint: PublicKey | null; // null if market launch is incomplete
}

export interface DaoContextResolveResult {
  ok: boolean;
  ctx?: DaoContext;
  missing: string[];
  loading: boolean;
}

type MarketDetailEntry = {
  daoAddress: string | null;
  multisigAddress: string | null;
  squadsVault: string | null;
  quoteMint: string | null;
  baseMint: string | null;
};

const detailCache = new Map<string, MarketDetailEntry>();

async function fetchMarketDetail(slug: string): Promise<MarketDetailEntry | null> {
  if (detailCache.has(slug)) return detailCache.get(slug)!;

  const token = getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/v1/markets/${slug}`, { headers });
  if (!res.ok) return null;

  const data = await res.json();
  const market = data.market ?? data;

  const entry: MarketDetailEntry = {
    daoAddress: market.daoAddress ?? null,
    multisigAddress: market.multisigAddress ?? null,
    squadsVault: market.squadsVault ?? null,
    quoteMint: market.quoteMint ?? null,
    // API returns tokenMintAddress for token-backed markets
    baseMint: market.tokenMintAddress ?? null,
  };

  detailCache.set(slug, entry);
  return entry;
}

function buildContext(args: {
  dao: string;
  multisig: string;
  treasury: string;
  usdc: string;
  base: string | null;
}): DaoContextResolveResult {
  try {
    return {
      ok: true,
      missing: [],
      loading: false,
      ctx: {
        dao: new PublicKey(args.dao),
        multisigPda: new PublicKey(args.multisig),
        treasuryVault: new PublicKey(args.treasury),
        usdcMint: new PublicKey(args.usdc),
        baseMint: args.base ? new PublicKey(args.base) : null,
      },
    };
  } catch {
    return {
      ok: false,
      missing: ["Invalid pubkey in DAO context"],
      loading: false,
    };
  }
}

export function useDaoContext(): DaoContextResolveResult {
  const { current } = useCurrentMarket();
  const slug = current.slug;

  const [result, setResult] = useState<DaoContextResolveResult>({
    ok: false,
    missing: [],
    loading: true,
  });

  useEffect(() => {
    if (!slug) {
      setResult({ ok: false, missing: ["No market selected"], loading: false });
      return;
    }

    let cancelled = false;

    (async () => {
      const detail = await fetchMarketDetail(slug);

      if (cancelled) return;

      const dao = detail?.daoAddress;
      const multisig = detail?.multisigAddress;
      const treasury = detail?.squadsVault;
      const usdc = detail?.quoteMint;
      const base = detail?.baseMint ?? null;

      // Require the 4 core addresses; baseMint may be null before full launch
      if (!dao || !multisig || !treasury || !usdc) {
        setResult({
          ok: false,
          missing: [
            !dao      && "daoAddress",
            !multisig && "multisigAddress",
            !treasury && "squadsVault",
            !usdc     && "quoteMint",
          ].filter(Boolean) as string[],
          loading: false,
        });
        return;
      }

      const resolved = buildContext({ dao, multisig, treasury, usdc, base });
      if (!cancelled) setResult(resolved);
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return result;
}