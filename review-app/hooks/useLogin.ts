"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "@/api/auth";
import { persistSession } from "@/lib/auth";
import type { LoginRequest, LoginResponse, Session } from "@/models/auth";
import type { ApiRequestError } from "@/models/api";
import { queryKeys } from "@/query/keys";

/**
 * useLogin — submits credentials, persists the session, and seeds the
 * `currentUser` query so the rest of the app reads from cache without
 * an extra network roundtrip.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, ApiRequestError, LoginRequest>({
    mutationFn: (input) => login(input),
    onSuccess: (response) => {
      const session: Session = {
        token: response.data.token,
        user: response.data.user,
      };
      persistSession(session);
      queryClient.setQueryData(queryKeys.session, session);
      queryClient.setQueryData(queryKeys.currentUser, session.user);
    },
  });
}
