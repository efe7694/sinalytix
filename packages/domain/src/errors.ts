/**
 * Canonical API error contract — Modül 2 §1.3.
 *
 * DEVIATIONS.md D15 item B1: this replaced an RFC 7807 (`application/problem+json`)
 * envelope that came from the PRE-2026-07-22 revision of Modül 2 (§1.4 at the
 * time). The current spec §1.3 defines a different shape and, crucially, a
 * **canonical machine-readable `code`** — which is the real gain: a client can
 * branch on `CONSENT_REQUIRED` instead of pattern-matching a status code plus
 * a human sentence that changes with the viewer's language.
 *
 * ```json
 * { "error": { "code": "...", "message": "...", "details": [...], "request_id": "..." } }
 * ```
 *
 * `message` is human-readable and localized per `Accept-Language`
 * (Modül 2 §1.2) — it is for display, never for logic. `details[]` is
 * machine-readable and carries NO PHI (Modül 2 §8): a `field` path and a
 * short `issue` slug, never the offending value.
 */

import { z } from 'zod';

/**
 * Modül 2 §1.3 lists these as an explicit subset ("Kanonik kodlar
 * (alt-küme)"). Codes marked EXT below are additions this codebase needs and
 * the spec doesn't enumerate; they follow the same naming discipline so a
 * later spec revision can absorb them without a client-visible rename.
 */
export const ApiErrorCode = {
  /** No/invalid credentials. */
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  /** Step-up auth needed; `details[0].issue` carries the tier (`t3`/`t4`). */
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  /** Authenticated, but not allowed. Never used where entity-non-leaking
   * applies — that returns NOT_FOUND instead (Modül 1 §11). */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** `X-App-Context` doesn't match the session's `app_context`. */
  APP_CONTEXT_MISMATCH: 'APP_CONTEXT_MISMATCH',
  /** A required `ConsentRecord` flag or `ConsentGrant` scope is absent. */
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  /** Also returned for records the caller may not see (entity-non-leaking). */
  NOT_FOUND: 'NOT_FOUND',
  /** Request body failed schema validation. */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** Optimistic-lock miss (`If-Match` vs current version). */
  CONFLICT_VERSION: 'CONFLICT_VERSION',
  RATE_LIMITED: 'RATE_LIMITED',

  /** EXT — domain-state conflict that is NOT an optimistic-lock miss
   * (already linked, already revoked, already decided). Distinct from
   * CONFLICT_VERSION so a client can tell "retry with fresh data" from
   * "this is simply no longer possible". */
  CONFLICT: 'CONFLICT',
  /** EXT — same `X-Idempotency-Key` replayed with a DIFFERENT body. Not a
   * replay (that's a 200), it's a client bug worth naming separately. */
  IDEMPOTENCY_KEY_REUSE: 'IDEMPOTENCY_KEY_REUSE',
  /** EXT — malformed at the protocol level (missing/invalid header, bad
   * cursor), as opposed to a body that failed validation. */
  BAD_REQUEST: 'BAD_REQUEST',
  /** EXT, but named by Admin PRD §7/4: a `FeatureFlag` kill switch is
   * engaged (e.g. `ai.kill_switch` → every `/ai/*` endpoint 503s). */
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  /** EXT — unexpected server-side failure. The message is always generic;
   * the detail is logged server-side against `request_id`. */
  INTERNAL: 'INTERNAL',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/**
 * Modül 2 §1.3 also names `IDEMPOTENCY_REPLAY` with status **200** — it is
 * therefore NOT an error envelope. A replayed mutation returns the original
 * success body plus `X-Idempotent-Replayed: true`. Kept here as the single
 * definition of that header name so the server and the clients can't drift.
 */
export const IDEMPOTENT_REPLAY_HEADER = 'X-Idempotent-Replayed';

/** The status each code is sent with — one table, so a code can never be
 * emitted with two different statuses from two different call sites. */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  REAUTH_REQUIRED: 401,
  PERMISSION_DENIED: 403,
  APP_CONTEXT_MISMATCH: 403,
  CONSENT_REQUIRED: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT_VERSION: 409,
  CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSE: 409,
  RATE_LIMITED: 429,
  BAD_REQUEST: 400,
  FEATURE_DISABLED: 503,
  INTERNAL: 500,
};

/**
 * One machine-readable problem. `field` is a dotted path into the request
 * (`scope.mental_health`), `issue` a stable slug (`no_active_grant`).
 * **Never** put a submitted value here — that is how PHI leaks into logs and
 * crash reporters (Modül 2 §8).
 */
export const ApiErrorDetailSchema = z.object({
  field: z.string(),
  issue: z.string(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ApiErrorDetailSchema).optional(),
    request_id: z.string(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export function isApiErrorCode(value: string): value is ApiErrorCode {
  return Object.prototype.hasOwnProperty.call(API_ERROR_STATUS, value);
}
