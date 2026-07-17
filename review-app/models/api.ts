import { z } from "zod";

/**
 * Standard error envelope returned by our Next.js API routes (and tolerated
 * from the upstream backend). Both `error` and `message` are accepted because
 * different services use different keys.
 */
export const ApiErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  detail: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Custom Error subclass thrown by the API client. Preserves the HTTP status
 * and the parsed error body so callers can react to specific failure modes.
 */
export class ApiRequestError extends Error {
  status: number;
  body: ApiError | null;

  constructor(message: string, status: number, body: ApiError | null = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
} 
