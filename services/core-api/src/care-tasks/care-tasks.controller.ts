import { Body, Controller, Delete, Get, HttpCode, Headers, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  CompleteOccurrenceRequestSchema,
  CreateCareTaskRequestSchema,
  UpdateCareTaskRequestSchema,
  type CareTaskOccurrencePublic,
  type CareTaskPublic,
  type CompleteOccurrenceRequest,
  type CreateCareTaskRequest,
  type UpdateCareTaskRequest,
} from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { ApiException } from '../common/api.exception';
import { CareTasksService } from './care-tasks.service';
import { OccurrencesService } from './occurrences.service';

/** S3 Care & Tasks — Modül 2 §3.3. */
@Controller()
@UseGuards(AuthContextGuard)
export class CareTasksController {
  constructor(
    private readonly careTasks: CareTasksService,
    private readonly occurrences: OccurrencesService,
  ) {}

  @Post('patients/:patientId/care-tasks')
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateCareTaskRequestSchema)) body: CreateCareTaskRequest,
  ): Promise<CareTaskPublic> {
    return this.careTasks.create(patientId, auth.userId, body);
  }

  @Get('patients/:patientId/care-tasks')
  async list(@Param('patientId') patientId: string, @CurrentAuth() auth: AuthContext): Promise<CareTaskPublic[]> {
    return this.careTasks.list(patientId, auth.userId);
  }

  /** `If-Match` carries the `version` last seen — mandatory for the
   * medication subtype (Modül 2 §3.3). */
  @Patch('care-tasks/:taskId')
  @UseInterceptors(IdempotencyInterceptor)
  async update(
    @Param('taskId') taskId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(UpdateCareTaskRequestSchema)) body: UpdateCareTaskRequest,
    @Headers('if-match') ifMatch?: string,
  ): Promise<CareTaskPublic> {
    let version: number | null = null;
    if (ifMatch !== undefined && ifMatch !== '') {
      const parsed = Number(ifMatch.replace(/"/g, ''));
      if (!Number.isInteger(parsed)) throw ApiException.badRequest('care_task.if_match_malformed');
      version = parsed;
    }
    return this.careTasks.update(taskId, auth.userId, body, version);
  }

  @Delete('care-tasks/:taskId')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async remove(@Param('taskId') taskId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.careTasks.remove(taskId, auth.userId);
  }

  // ── Occurrences ────────────────────────────────────────────────────────

  /** The "today" list — one endpoint, four apps (Modül 2 §3.3). `date`
   * defaults to the PATIENT's today, not the caller's. */
  @Get('patients/:patientId/occurrences')
  async listOccurrences(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Query('date') date?: string,
  ): Promise<CareTaskOccurrencePublic[]> {
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw ApiException.badRequest('care_task.date_malformed');
    }
    return this.occurrences.listForDate(patientId, auth.userId, date);
  }

  @Post('occurrences/:occurrenceId/complete')
  @UseInterceptors(IdempotencyInterceptor)
  async complete(
    @Param('occurrenceId') occurrenceId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CompleteOccurrenceRequestSchema)) body: CompleteOccurrenceRequest,
  ): Promise<CareTaskOccurrencePublic> {
    return this.occurrences.complete(occurrenceId, auth.userId, body.counter_value ?? null);
  }

  @Post('occurrences/:occurrenceId/skip')
  @UseInterceptors(IdempotencyInterceptor)
  async skip(
    @Param('occurrenceId') occurrenceId: string,
    @CurrentAuth() auth: AuthContext,
  ): Promise<CareTaskOccurrencePublic> {
    return this.occurrences.skip(occurrenceId, auth.userId);
  }

  @Post('occurrences/:occurrenceId/undo')
  @UseInterceptors(IdempotencyInterceptor)
  async undo(
    @Param('occurrenceId') occurrenceId: string,
    @CurrentAuth() auth: AuthContext,
  ): Promise<CareTaskOccurrencePublic> {
    return this.occurrences.undo(occurrenceId, auth.userId);
  }
}
