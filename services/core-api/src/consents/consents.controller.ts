import { Body, Controller, Delete, Get, Patch, Post, Put, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiErrorCode, CreateConsentRecordRequestSchema } from '@sinalytix/domain';
import type { ConsentRecordPublic, CreateConsentRecordRequest, EffectiveConsent } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { ApiException } from '../common/api.exception';
import { sha256Hex } from '../common/hash.util';
import { ConsentsService } from './consents.service';
import type { ConsentRecordHistoryEntry } from './consents.service';

/**
 * `/consents` — Modül 2 §3.2. `ConsentRecord` is append-only, so this surface
 * is deliberately write-once + read: **"PATCH/DELETE yok, 405"** is spelled
 * out in the spec and is implemented literally below rather than left to
 * Nest's default 404. A 404 on `PATCH /consents/{id}` reads like a wrong URL
 * and invites a client author to keep looking for the right one; a 405 says
 * the operation cannot exist. (The DB enforces it too — an UPDATE/DELETE
 * trigger on `consent_records`, migration 0004 — so this is the polite
 * outer layer of a rule that holds even if this controller is bypassed.)
 */
@Controller('consents')
@UseGuards(AuthContextGuard)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateConsentRecordRequestSchema)) body: CreateConsentRecordRequest,
    @Req() req: FastifyRequest,
  ): Promise<ConsentRecordPublic> {
    // Modül 1 §1.6: the IP is hashed, never stored in the clear.
    const ipHash = req.ip ? sha256Hex(req.ip) : undefined;
    return this.consentsService.create(
      { userId: auth.userId, roles: auth.roles, appContext: auth.appContext },
      body,
      ipHash,
    );
  }

  /** Full immutable history for the calling user. Modül 2 §3.2's
   * `GET /consents?user_id=me` — `user_id` is not a real parameter here: a
   * user may only ever read their own records (migration 0004's SELECT
   * policy), so accepting the parameter would only invite the belief that
   * another value might work. */
  @Get()
  async list(@CurrentAuth() auth: AuthContext): Promise<{ data: ConsentRecordHistoryEntry[] }> {
    const data = await this.consentsService.listForActor({
      userId: auth.userId,
      roles: auth.roles,
      appContext: auth.appContext,
    });
    return { data };
  }

  /** Newest record per app_context — the shape gates and settings screens
   * actually need (see `EffectiveConsent`). */
  @Get('effective')
  async effective(@CurrentAuth() auth: AuthContext): Promise<{ data: EffectiveConsent[] }> {
    const data = await this.consentsService.effectiveForActor({
      userId: auth.userId,
      roles: auth.roles,
      appContext: auth.appContext,
    });
    return { data };
  }

  // ── Append-only: these verbs can never succeed ───────────────────────────

  @Patch(':consentId')
  patchNotAllowed(): never {
    throw appendOnly();
  }

  @Put(':consentId')
  putNotAllowed(): never {
    throw appendOnly();
  }

  @Delete(':consentId')
  deleteNotAllowed(): never {
    throw appendOnly();
  }
}

function appendOnly(): ApiException {
  return new ApiException({
    code: ApiErrorCode.METHOD_NOT_ALLOWED,
    messageKey: 'consent.record_append_only',
  });
}
