import type { PaginatedResponse } from '@sinalytix/domain';
import { ApiException } from './api.exception';

interface CursorPayload {
  createdAt: string;
  id: string;
}

/** Module 2 §1.5 — cursor is opaque to the client; encodes the last row's
 * sort key so a later page can resume `WHERE (created_at, id) < (?, ?)`. */
export function encodeCursor(createdAt: Date, id: string): string {
  const payload: CursorPayload = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    if (typeof payload.createdAt !== 'string' || typeof payload.id !== 'string') {
      throw new Error('shape');
    }
    return payload;
  } catch {
    throw ApiException.badRequest('request.invalid_cursor');
  }
}

/** Callers query for `limit + 1` rows (sorted `-created_at, id` per Module 2
 * §1.5's default); this slices off the lookahead row and builds the
 * envelope, so `has_more`/`next_cursor` never require a separate COUNT
 * query. */
export function buildPaginatedResponse<T>(
  rows: T[],
  limit: number,
  cursorFieldsOf: (row: T) => { createdAt: Date; id: string },
): PaginatedResponse<T> {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  const nextCursor = hasMore && last ? encodeCursor(cursorFieldsOf(last).createdAt, cursorFieldsOf(last).id) : null;
  return { data: page, next_cursor: nextCursor, has_more: hasMore };
}
