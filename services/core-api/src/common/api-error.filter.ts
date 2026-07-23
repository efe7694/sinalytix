import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { API_ERROR_STATUS, ApiErrorCode } from '@sinalytix/domain';
import type { ApiErrorEnvelope } from '@sinalytix/domain';
import { resolveLocale, translateError } from '@sinalytix/i18n';
import type { ErrorMessageKey } from '@sinalytix/i18n';
import { ApiException } from './api.exception';

/**
 * Every error leaves core-api through here in the Modül 2 §1.3 envelope:
 * `{ error: { code, message, details, request_id } }`.
 *
 * Three invariants worth stating, because each is a way this could leak:
 *
 * 1. **`message` is localized, `code` is not.** The text comes from
 *    `@sinalytix/i18n` resolved against `Accept-Language` (Modül 2 §1.2);
 *    the code is a stable ASCII constant clients branch on.
 * 2. **Nothing derived from the request body reaches the client.** An
 *    unexpected error is logged server-side against `request_id` and the
 *    client gets the generic `INTERNAL` message — a raw exception string can
 *    contain a row, a query, or PHI (Modül 2 §8).
 * 3. **A non-`ApiException` HttpException never forwards its own message.**
 *    Nest's built-in exceptions (and anything a library throws) produce
 *    English framework text that is neither localized nor vetted, so they are
 *    mapped to a canonical code by status and re-worded from the catalog.
 */
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiErrorFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = String(request.id);
    const locale = resolveLocale(request.headers['accept-language']);

    if (exception instanceof ApiException) {
      if (exception.retryAfterSeconds !== undefined) {
        reply.header('Retry-After', String(exception.retryAfterSeconds));
      }
      this.send(reply, API_ERROR_STATUS[exception.code], {
        error: {
          code: exception.code,
          message: translateError(exception.messageKey, locale, exception.messageParams),
          ...(exception.details ? { details: exception.details } : {}),
          request_id: requestId,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { code, messageKey } = mapStatusToCode(status);
      // The framework message is logged (it's useful) but never sent.
      this.logger.warn(`${code} (${status}) from ${exception.name}: ${exception.message} request_id=${requestId}`);
      this.send(reply, status, {
        error: { code, message: translateError(messageKey, locale), request_id: requestId },
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception, undefined, `request_id=${requestId}`);
    this.send(reply, API_ERROR_STATUS[ApiErrorCode.INTERNAL], {
      error: {
        code: ApiErrorCode.INTERNAL,
        message: translateError('error.internal', locale),
        request_id: requestId,
      },
    });
  }

  private send(reply: FastifyReply, status: number, body: ApiErrorEnvelope): void {
    reply.status(status).send(body);
  }
}

/** Nest/library exceptions carry a status but no canonical code — this is the
 * one place that gap is closed, so no call site has to care. */
function mapStatusToCode(status: number): { code: ApiErrorCode; messageKey: ErrorMessageKey } {
  switch (status) {
    case 400:
      return { code: ApiErrorCode.BAD_REQUEST, messageKey: 'error.bad_request' };
    case 401:
      return { code: ApiErrorCode.UNAUTHENTICATED, messageKey: 'auth.required' };
    case 403:
      return { code: ApiErrorCode.PERMISSION_DENIED, messageKey: 'error.permission_denied' };
    case 404:
      return { code: ApiErrorCode.NOT_FOUND, messageKey: 'error.not_found' };
    case 405:
      // A framework MethodNotAllowedException would otherwise emit HTTP 405
      // with code INTERNAL — a status/code mismatch (independent review S2-1).
      return { code: ApiErrorCode.METHOD_NOT_ALLOWED, messageKey: 'error.bad_request' };
    case 409:
      return { code: ApiErrorCode.CONFLICT, messageKey: 'error.bad_request' };
    case 422:
      return { code: ApiErrorCode.VALIDATION_FAILED, messageKey: 'error.validation_failed' };
    case 429:
      return { code: ApiErrorCode.RATE_LIMITED, messageKey: 'error.rate_limited' };
    case 503:
      return { code: ApiErrorCode.FEATURE_DISABLED, messageKey: 'error.feature_disabled' };
    default:
      return { code: ApiErrorCode.INTERNAL, messageKey: 'error.internal' };
  }
}
