/**
 * Pagination conventions.
 *
 * Two patterns, both return the same envelope shape so client code is
 * consistent:
 *
 *   PageEnvelope<T>   { items, total, page, pageSize, hasMore }
 *   CursorEnvelope<T> { items, nextCursor, hasMore }
 *
 * Defaults: page-based 20 / max 100, cursor-based 50 / max 200.
 */
import { z } from "zod";

// ─── Page-based (catalogs) ──────────────────────────────────────────

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;

export interface PageEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function pageEnvelope<T>(
  items: T[],
  total: number,
  query: PageQuery,
): PageEnvelope<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: query.page * query.pageSize < total,
  };
}

export function pageOffsets(query: PageQuery): { skip: number; take: number } {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

// ─── Cursor-based (time-series) ────────────────────────────────────

export const CursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CursorQuery = z.infer<typeof CursorQuerySchema>;

export interface CursorEnvelope<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Build the cursor envelope. Caller fetched `limit + 1` rows so we can
 * detect whether there's more — slice off the extra row and use its
 * cursor as `nextCursor`.
 */
export function cursorEnvelope<T>(
  rowsPlusOne: T[],
  limit: number,
  getCursor: (row: T) => string,
): CursorEnvelope<T> {
  const hasMore = rowsPlusOne.length > limit;
  const items = hasMore ? rowsPlusOne.slice(0, limit) : rowsPlusOne;
  const nextCursor = hasMore ? getCursor(items[items.length - 1]) : null;
  return { items, nextCursor, hasMore };
}
