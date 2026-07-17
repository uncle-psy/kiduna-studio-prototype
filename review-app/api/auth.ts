import { apiRequest } from "./client";
import {
  LoginRequestSchema,
  LoginResponseSchema,
  type LoginRequest,
  type LoginResponse,
} from "@/models/auth";

/**
 * Submits credentials to our Next.js login proxy (which forwards to the
 * backend server-to-server, bypassing CORS).
 *
 * Both the request payload and the response are validated by Zod.
 */
export function login(input: LoginRequest, signal?: AbortSignal): Promise<LoginResponse> {
  return apiRequest<LoginResponse, LoginRequest>(
    "/api/login",
    LoginResponseSchema,
    {
      method: "POST",
      requestSchema: LoginRequestSchema,
      body: input,
      signal,
    }
  );
}
