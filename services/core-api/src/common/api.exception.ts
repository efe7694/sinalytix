import { HttpException } from '@nestjs/common';
import { API_ERROR_STATUS, ApiErrorCode } from '@sinalytix/domain';
import type { ApiErrorDetail } from '@sinalytix/domain';
import type { ErrorMessageKey } from '@sinalytix/i18n';

/**
 * The one way core-api reports an error — Modül 2 §1.3.
 * (Replaces `ProblemException`/RFC 7807; DEVIATIONS D15 item B1.)
 *
 * A throw site supplies a **code** and a **message key**, never a sentence:
 * the wire code is what clients branch on, and the text is resolved from
 * `@sinalytix/i18n` against the request's `Accept-Language` by
 * `ApiErrorFilter`. That is why `messageKey` is typed to the catalog — a
 * typo is a compile error, not an English string leaking into a French UI.
 *
 * The HTTP status is NOT a constructor argument: it comes from
 * `API_ERROR_STATUS[code]`, so one code can never be emitted as 403 here and
 * 404 there.
 */
export class ApiException extends HttpException {
  readonly code: ApiErrorCode;
  readonly messageKey: ErrorMessageKey;
  readonly messageParams?: Record<string, string | number>;
  readonly details?: ApiErrorDetail[];
  /** Set on 429s (Modül 2 §1.5) — the filter turns this into `Retry-After`. */
  readonly retryAfterSeconds?: number;

  constructor(init: {
    code: ApiErrorCode;
    messageKey: ErrorMessageKey;
    messageParams?: Record<string, string | number>;
    details?: ApiErrorDetail[];
    retryAfterSeconds?: number;
  }) {
    super(init.messageKey, API_ERROR_STATUS[init.code]);
    this.code = init.code;
    this.messageKey = init.messageKey;
    this.messageParams = init.messageParams;
    this.details = init.details;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  // ── Constructors for the shapes that actually occur ───────────────────
  // Each takes a message key so the call site stays a single readable line.

  /** Protocol-level malformation (missing header, unusable cursor) — as
   * opposed to a body that failed schema validation, which is 422. */
  static badRequest(messageKey: ErrorMessageKey, details?: ApiErrorDetail[]): ApiException {
    return new ApiException({ code: ApiErrorCode.BAD_REQUEST, messageKey, details });
  }

  static unauthenticated(messageKey: ErrorMessageKey): ApiException {
    return new ApiException({ code: ApiErrorCode.UNAUTHENTICATED, messageKey });
  }

  static permissionDenied(messageKey: ErrorMessageKey, details?: ApiErrorDetail[]): ApiException {
    return new ApiException({ code: ApiErrorCode.PERMISSION_DENIED, messageKey, details });
  }

  static appContextMismatch(): ApiException {
    return new ApiException({
      code: ApiErrorCode.APP_CONTEXT_MISMATCH,
      messageKey: 'request.app_context_mismatch',
    });
  }

  static consentRequired(messageKey: ErrorMessageKey, details?: ApiErrorDetail[]): ApiException {
    return new ApiException({ code: ApiErrorCode.CONSENT_REQUIRED, messageKey, details });
  }

  /**
   * Also the correct answer for a record the caller may not see — Modül 1
   * §11 entity-non-leaking: an unauthorized record must be indistinguishable
   * from a nonexistent one, so this is deliberately reachable from
   * authorization checks, not just lookups.
   */
  static notFound(messageKey: ErrorMessageKey = 'error.not_found'): ApiException {
    return new ApiException({ code: ApiErrorCode.NOT_FOUND, messageKey });
  }

  /** Domain state makes the action impossible (already linked, already
   * decided). NOT an optimistic-lock miss — that is `conflictVersion`. */
  static conflict(messageKey: ErrorMessageKey, details?: ApiErrorDetail[]): ApiException {
    return new ApiException({ code: ApiErrorCode.CONFLICT, messageKey, details });
  }

  /** Optimistic-lock miss (`If-Match` vs current version) — Modül 2 §7. */
  static conflictVersion(details?: ApiErrorDetail[]): ApiException {
    return new ApiException({
      code: ApiErrorCode.CONFLICT_VERSION,
      messageKey: 'error.bad_request',
      details,
    });
  }

  static validationFailed(details: ApiErrorDetail[]): ApiException {
    return new ApiException({
      code: ApiErrorCode.VALIDATION_FAILED,
      messageKey: 'error.validation_failed',
      messageParams: { count: details.length },
      details,
    });
  }

  static rateLimited(messageKey: ErrorMessageKey, retryAfterSeconds?: number, params?: Record<string, string | number>): ApiException {
    return new ApiException({
      code: ApiErrorCode.RATE_LIMITED,
      messageKey,
      messageParams: params,
      retryAfterSeconds,
    });
  }

  static idempotencyKeyReuse(): ApiException {
    return new ApiException({
      code: ApiErrorCode.IDEMPOTENCY_KEY_REUSE,
      messageKey: 'request.idempotency_key_reuse',
    });
  }

  /** Step-up auth. `tier` rides in `details` per Modül 2 §1.3
   * ("+`details.tier: t3|t4`"). */
  static reauthRequired(tier: 't3' | 't4'): ApiException {
    return new ApiException({
      code: ApiErrorCode.REAUTH_REQUIRED,
      messageKey: 'auth.required',
      details: [{ field: 'tier', issue: tier }],
    });
  }

  /** A kill switch is engaged — Admin PRD §7/4 (`ai.kill_switch` → `/ai/*`
   * returns 503 within 5s). */
  static featureDisabled(feature: string): ApiException {
    return new ApiException({
      code: ApiErrorCode.FEATURE_DISABLED,
      messageKey: 'error.feature_disabled',
      details: [{ field: 'feature', issue: feature }],
    });
  }
}
