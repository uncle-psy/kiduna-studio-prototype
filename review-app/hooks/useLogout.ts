"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearSession } from "@/lib/auth";

/**
 * useLogout — wipes the persisted session, clears the query cache, and
 * sends the user back to /login. Returns a single function for ergonomics.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(() => {
    clearSession();
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);
}
