import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import type { ConsentGrantPublic, PaginatedResponse, SdmDeclarationPublic } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { ConsentGrantsService } from './consent-grants.service';
import {
  CreateConsentGrantRequestSchema,
  CreateSdmDeclarationRequestSchema,
  CursorQuerySchema,
  type CreateConsentGrantBody,
  type CreateSdmDeclarationBody,
} from './dto';

/** Module 2 §3.2 — ConsentGrant + SDMDeclaration. Every mutation requires
 * Idempotency-Key (Module 2 §6.1); every route requires AuthContextGuard. */
@Controller()
@UseGuards(AuthContextGuard)
export class ConsentGrantsController {
  constructor(private readonly consentGrantsService: ConsentGrantsService) {}

  @Post('patients/:patientId/consent-grants')
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateConsentGrantRequestSchema)) body: CreateConsentGrantBody,
  ): Promise<ConsentGrantPublic> {
    return this.consentGrantsService.create(patientId, auth.userId, body);
  }

  @Get('patients/:patientId/consent-grants')
  async list(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(CursorQuerySchema)) query: { cursor?: string; limit: number },
  ): Promise<PaginatedResponse<ConsentGrantPublic>> {
    return this.consentGrantsService.list(patientId, auth.userId, query);
  }

  @Post('consent-grants/:grantId/revoke')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(202)
  async revoke(
    @Param('grantId') grantId: string,
    @CurrentAuth() auth: AuthContext,
  ): Promise<{ grant_id: string; revoked_at: string }> {
    return this.consentGrantsService.revoke(grantId, auth.userId);
  }

  @Post('patients/:patientId/sdm-declarations')
  @UseInterceptors(IdempotencyInterceptor)
  async createSdmDeclaration(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateSdmDeclarationRequestSchema)) body: CreateSdmDeclarationBody,
  ): Promise<SdmDeclarationPublic> {
    return this.consentGrantsService.createSdmDeclaration(patientId, auth.userId, auth.roles, body);
  }

  @Get('patients/:patientId/sdm-declarations')
  async listSdmDeclarations(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(CursorQuerySchema)) query: { cursor?: string; limit: number },
  ): Promise<PaginatedResponse<SdmDeclarationPublic>> {
    return this.consentGrantsService.listSdmDeclarations(patientId, auth.userId, auth.roles, query);
  }
}
