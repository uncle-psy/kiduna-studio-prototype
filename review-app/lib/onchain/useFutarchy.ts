"use client";

import { useMemo } from "react";
import { FutarchyClient } from "@metadaoproject/futarchy/v0.6";
import { useAnchorProvider } from "./useAnchorProvider";

/**
 * Returns a memoized FutarchyClient bound to the connected wallet, or null
 * if no wallet is connected.
 *
 * The client uses the v0.6 program version — same as the harness. v0.7
 * exists but adds the Performance Grant proposal type which we'll handle
 * via a separate client when we wire that proposal type.
 */
export function useFutarchy(): FutarchyClient | null {
  const provider = useAnchorProvider();

  return useMemo(() => {
    if (!provider) return null;
    return FutarchyClient.createClient({ provider });
  }, [provider]);
}
