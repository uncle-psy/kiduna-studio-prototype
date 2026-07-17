import type { ZodType } from "zod";
import { ApiErrorSchema, ApiRequestError } from "@/models/api";

type RequestOptions<TReq> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Optional Zod schema for the request body — body is parsed before sending. */
  requestSchema?: ZodType<TReq>;
  /** Body value to send (must match `requestSchema` if provided). */
  body?: TReq;
  /** Extra headers (e.g. Authorization). */
  headers?: Record<string, string>;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
};

/**
 * Make a typed JSON request and validate the response against a Zod schema.
 *
 * - Request body is run through `requestSchema.parse` *before* sending, so we
 *   never put a malformed payload on the wire.
 * - Response body is run through `responseSchema.parse`, so callers always
 *   receive validated, fully-typed data.
 * - Non-2xx responses throw `ApiRequestError` with the parsed error envelope.
 */
export async function apiRequest<TRes, TReq = unknown>(
  url: string,
  responseSchema: ZodType<TRes>,
  options: RequestOptions<TReq> = {}
): Promise<TRes> {
  const {
    method = "GET",
    requestSchema,
    body,
    headers = {},
    signal,
  } = options;

  // Validate request body if a schema was provided
  let payload: string | undefined;
  if (body !== undefined) {
    const parsed = requestSchema ? requestSchema.parse(body) : body;
    payload = JSON.stringify(parsed);
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: payload,
    signal,
  });

  // Read body as text first so we can surface non-JSON errors gracefully
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Leave json as null; we'll wrap the raw text below.
    }
  }

  if (!res.ok) {
    const errorParse = ApiErrorSchema.safeParse(json);
    const errorBody = errorParse.success ? errorParse.data : null;
    const message =
      errorBody?.error ||
      errorBody?.message ||
      errorBody?.detail ||
      (typeof json === "string" ? json : "") ||
      text ||
      `Request failed with status ${res.status}`;
    throw new ApiRequestError(message, res.status, errorBody);
  }

  // Validate the success body
  const result = responseSchema.safeParse(json);
  if (!result.success) {
    const issuesSummary = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ApiRequestError(
      "Server returned an unexpected response shape",
      res.status,
      { error: issuesSummary || "Schema validation failed" }
    );
  }

  return result.data;
}
