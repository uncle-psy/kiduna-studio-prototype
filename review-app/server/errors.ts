/**
 * Error envelope.
 *
 * All API errors return { error: { code, message, details? } } with a
 * matching HTTP status. Codes are stable strings the client can switch
 * on; messages are for humans.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation errors when applicable. */
    details?: unknown;
  };
}

const CODE_TO_STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_FAILED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return NextResponse.json(body, { status: CODE_TO_STATUS[code] });
}

/** Convert a thrown error into a response. */
export function toErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ZodError) {
    return apiError("VALIDATION_FAILED", "Request validation failed", err.flatten());
  }
  if (err instanceof ApiError) {
    return apiError(err.code, err.message, err.details);
  }
  // eslint-disable-next-line no-console
  console.error("[api] unexpected error", err);
  return apiError("INTERNAL", "Internal server error");
}

/** Throwable counterpart so middleware/route logic can bail early. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
