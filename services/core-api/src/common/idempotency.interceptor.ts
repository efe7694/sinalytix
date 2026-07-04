import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';
import { ProblemException } from './problem.exception';

/** Nest's own default when a route has no explicit `@HttpCode` (matches
 * `RouterExecutionContext`'s internal convention). */
function defaultStatusFor(method: string): number {
  return method.toUpperCase() === 'POST' ? 201 : 200;
}

/**
 * Module 2 §6.1 — mandatory `Idempotency-Key` on mutating routes. Apply with
 * `@UseInterceptors(IdempotencyInterceptor)` per-route (not globally; GETs
 * don't need it). Must run on a route already guarded by `AuthContextGuard`
 * (reads `request.authContext.userId` — guards execute before interceptors
 * in Nest's request lifecycle, so this is always populated by the time we
 * get here).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const idempotencyKeyHeader = request.headers['idempotency-key'];
    if (typeof idempotencyKeyHeader !== 'string' || idempotencyKeyHeader.length === 0) {
      throw ProblemException.badRequest('Idempotency-Key header zorunlu.');
    }

    const userId = request.authContext?.userId;
    if (!userId) {
      throw ProblemException.unauthorized('Kimlik doğrulama gerekli.');
    }

    const method = request.method;
    const path = request.url;
    const bodyHash = this.idempotencyService.hashBody(request.body);
    const status =
      this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler()) ?? defaultStatusFor(method);

    return from(this.idempotencyService.getCached(userId, method, path, idempotencyKeyHeader)).pipe(
      switchMap((cached) => {
        if (cached) {
          if (cached.bodyHash !== bodyHash) {
            throw ProblemException.idempotencyKeyReuse();
          }
          return of(cached.body);
        }
        return next.handle().pipe(
          tap((body) => {
            void this.idempotencyService.store(userId, method, path, idempotencyKeyHeader, {
              status,
              body,
              bodyHash,
            });
          }),
        );
      }),
    );
  }
}
