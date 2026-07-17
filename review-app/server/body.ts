/**
 * Parse and validate a request JSON body against a Zod schema.
 *
 * Throws ApiError("BAD_REQUEST") if the body isn't valid JSON, or lets
 * the Zod error propagate (which `toErrorResponse` turns into a 422
 * with field-level details).
 */
import { NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { ApiError } from "./errors";

export async function readJsonBody<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON");
  }
  return schema.parse(raw);
}
