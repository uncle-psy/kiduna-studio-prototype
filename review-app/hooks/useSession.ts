"use client";

import { useQuery } from "@tanstack/react-query";
import { getStoredSession } from "@/lib/auth";
import type { Session } from "@/models/auth";
import type { User } from "@/models/user";
import { queryKeys } from "@/query/keys";

/**
 * Hydrates the persisted session from localStorage into the query cache.
 * `staleTime: Infinity` keeps it stable across focus events — it's only
 * invalidated on explicit login/logout.
 */
export function useSession() {
  return useQuery<Session | null>({
    queryKey: queryKeys.session,
    queryFn: () => getStoredSession(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useCurrentUser(): User | null {
  const { data } = useSession();
  return data?.user ?? null;
}
